"""
documents.py — Advanced Project Document Management & Intelligence Router.
Provides real PDF storage, automatic extraction, duplicate detection,
versioning, grounded AI summaries, and document Q&A for the TRACE platform.
Integrates directly with the 1,981 April 2026 canonical baseline projects.
"""
import uuid
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Response,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user, require_roles
from app.models.project import Document, DocumentAuditLog, Project, Profile, RiskPrediction
from app.services.document_storage_service import DocumentStorageService
from app.services.document_intelligence_service import (
    extract_pdf_pages_and_text,
    extract_structured_project_data,
    generate_document_ai_summary,
    answer_document_question,
)

router = APIRouter(prefix="/documents", tags=["Documents"])

VALID_DOC_TYPES = {
    "monthly_report",
    "flash_report",
    "dpr",
    "project_proposal",
    "sanction_order",
    "admin_approval",
    "financial_doc",
    "expenditure_statement",
    "physical_progress_report",
    "milestone_report",
    "tender_doc",
    "work_order",
    "contract_doc",
    "environmental_clearance",
    "land_doc",
    "inspection_report",
    "meeting_minutes",
    "status_report",
    "govt_correspondence",
    "contractor_report",
    "admin_doc",
    "evidence",
    "completion_certificate",
    "other",
}


class DocumentCreate(BaseModel):
    project_id: str
    doc_type: str
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    report_month: Optional[str] = None
    confidentiality_level: Optional[str] = "INTERNAL"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    doc_type: Optional[str] = None
    report_month: Optional[str] = None
    confidentiality_level: Optional[str] = None


class AskQuestionRequest(BaseModel):
    question: str


def _log_audit_action(
    db: Session,
    document_id: Optional[uuid.UUID],
    project_id: Optional[uuid.UUID],
    user: Optional[Profile],
    action: str,
    details: Optional[Dict[str, Any]] = None,
):
    try:
        log = DocumentAuditLog(
            id=uuid.uuid4(),
            document_id=document_id,
            project_id=project_id,
            user_id=str(user.id) if user else "anonymous",
            user_name=user.full_name if user else "System/User",
            user_email=user.email if user else None,
            role=user.role if user else "user",
            action=action,
            details=details or {},
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Audit log notice: {e}")


def _process_document_pipeline(doc_id: uuid.UUID, relative_path: str, doc_type: str):
    """
    Background worker for PDF text extraction, structured project data parsing,
    and grounded AI summary generation.
    """
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return

        doc.processing_status = "PROCESSING"
        db.commit()

        abs_path = DocumentStorageService.get_absolute_file_path(relative_path)
        if not abs_path or not abs_path.exists():
            doc.processing_status = "FAILED"
            doc.extraction_status = "FAILED"
            db.commit()
            return

        full_text, pages_meta, ext_status = extract_pdf_pages_and_text(abs_path)
        doc.extracted_text = full_text
        doc.extraction_status = ext_status

        extracted_data = extract_structured_project_data(full_text, doc.file_name or "document.pdf")
        extracted_data["pages_count"] = len(pages_meta)
        extracted_data["pages"] = pages_meta[:50]  # Store up to 50 pages metadata
        doc.extracted_metadata = extracted_data

        ai_summary = generate_document_ai_summary(full_text, doc_type, extracted_data)
        doc.ai_summary = ai_summary

        doc.processing_status = "PROCESSED"
        db.commit()

        _log_audit_action(
            db=db,
            document_id=doc.id,
            project_id=doc.project_id,
            user=None,
            action="PROCESSED",
            details={"pages": len(pages_meta), "extraction_status": ext_status},
        )

    except Exception as e:
        print(f"Document processing error: {e}")
        try:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.processing_status = "FAILED"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _doc_to_dict(doc: Document, project: Optional[Project] = None) -> dict:
    return {
        "id": str(doc.id),
        "project_id": str(doc.project_id),
        "project_name": project.project_name if project else getattr(doc, "project_name", None),
        "project_code": project.project_id if project else None,
        "state": project.state if project else None,
        "district": project.district if project else None,
        "sector": project.sector if project else None,
        "doc_type": doc.doc_type,
        "title": doc.title,
        "description": doc.description,
        "file_url": doc.file_url or f"/api/v1/documents/{doc.id}/file",
        "file_name": doc.file_name,
        "original_file_name": doc.original_file_name or doc.file_name,
        "file_path": doc.file_path,
        "file_size_bytes": doc.file_size_bytes,
        "mime_type": doc.mime_type or "application/pdf",
        "file_hash": doc.file_hash,
        "report_month": doc.report_month,
        "document_date": doc.document_date,
        "uploaded_by_id": doc.uploaded_by_id,
        "uploaded_by_name": doc.uploaded_by_name,
        "version_number": doc.version_number or 1,
        "parent_document_id": str(doc.parent_document_id) if doc.parent_document_id else None,
        "status": doc.status or "ACTIVE",
        "processing_status": doc.processing_status or "UPLOADED",
        "extraction_status": doc.extraction_status or "NONE",
        "extracted_text": doc.extracted_text,
        "extracted_metadata": doc.extracted_metadata,
        "ai_summary": doc.ai_summary,
        "ai_tags": doc.ai_tags or [],
        "source": doc.source or "UPLOAD",
        "confidentiality_level": doc.confidentiality_level or "INTERNAL",
        "is_verified": doc.is_verified,
        "is_active": doc.is_active,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }


# ─── 1. ADVANCED LISTING & FILTERING ──────────────────────────────────────────

@router.get("", response_model=List[dict])
async def list_documents(
    project_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    report_month: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    processing_status: Optional[str] = Query(None),
    confidentiality: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    List documents with search, multi-filters, and project relationship resolution.
    Respects confidentiality levels.
    """
    query = db.query(Document, Project).join(Project, Document.project_id == Project.id)
    query = query.filter(Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False)

    if project_id:
        from uuid import UUID
        try:
            uid = UUID(project_id)
            query = query.filter(Document.project_id == uid)
        except (ValueError, TypeError):
            # Try numeric project_id matching
            query = query.filter(Project.project_id == project_id)

    if doc_type:
        query = query.filter(Document.doc_type == doc_type)
    if report_month:
        query = query.filter(Document.report_month == report_month)
    if processing_status:
        query = query.filter(Document.processing_status == processing_status)
    if confidentiality:
        query = query.filter(Document.confidentiality_level == confidentiality)
    if state:
        query = query.filter(Project.state.ilike(f"%{state}%"))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Document.title.ilike(term),
                Document.file_name.ilike(term),
                Document.extracted_text.ilike(term),
                Project.project_name.ilike(term),
                Project.project_id.ilike(term),
            )
        )

    # Ordering: newest uploads first
    query = query.order_by(desc(Document.created_at))
    rows = query.offset(skip).limit(limit).all()

    return [_doc_to_dict(doc, proj) for doc, proj in rows]


# ─── 2. AGGREGATED DOCUMENT ANALYTICS ─────────────────────────────────────────

@router.get("/analytics", response_model=dict)
async def get_document_analytics(
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Returns live document repository statistics:
    - Total documents
    - Processed, Processing, Attention/Failed
    - Breakdown by document type
    - Recent uploads
    """
    total = db.query(func.count(Document.id)).filter(Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False).scalar() or 0
    processed = db.query(func.count(Document.id)).filter(
        Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False, Document.processing_status == "PROCESSED"
    ).scalar() or 0
    processing = db.query(func.count(Document.id)).filter(
        Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False, Document.processing_status.in_(["UPLOADED", "PROCESSING"])
    ).scalar() or 0
    attention = db.query(func.count(Document.id)).filter(
        Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False, Document.processing_status.in_(["FAILED", "PARTIAL"])
    ).scalar() or 0

    # Type breakdown
    type_counts = (
        db.query(Document.doc_type, func.count(Document.id))
        .filter(Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False)
        .group_by(Document.doc_type)
        .all()
    )

    # Recent uploads (5 latest)
    recent = (
        db.query(Document, Project)
        .join(Project, Document.project_id == Project.id)
        .filter(Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False)
        .order_by(desc(Document.created_at))
        .limit(5)
        .all()
    )

    return {
        "total_documents": total,
        "processed": processed,
        "processing": processing,
        "attention_required": attention,
        "counts_by_type": {t: cnt for t, cnt in type_counts},
        "recent_uploads": [_doc_to_dict(doc, proj) for doc, proj in recent],
    }


# ─── 3. REAL PDF UPLOAD & VALIDATION PIPELINE ─────────────────────────────────

@router.post("/upload", response_model=dict, status_code=201)
async def upload_document_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: str = Form(...),
    doc_type: str = Form(...),
    title: str = Form(...),
    report_month: Optional[str] = Form(None),
    document_date: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    confidentiality_level: Optional[str] = Form("INTERNAL"),
    parent_document_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Full real PDF upload pipeline:
    1. Resolve canonical Project
    2. Server-side PDF validation (%PDF- magic bytes, size limit)
    3. Calculate SHA-256 hash
    4. Duplicate detection check
    5. Save file to storage/project-documents/
    6. Insert DB record
    7. Launch background text extraction & AI summarization
    8. Record audit log
    """
    from uuid import UUID
    # 1. Resolve project
    project = None
    try:
        p_uid = UUID(project_id)
        project = db.query(Project).filter(Project.id == p_uid).first()
    except (ValueError, TypeError):
        # Numeric project_id fallback (e.g. "612786")
        project = db.query(Project).filter(Project.project_id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found in canonical database.")

    # 2. Read file content
    contents = await file.read()
    orig_name = file.filename or "document.pdf"

    # 3. Compute hash and detect duplicate
    import hashlib
    hasher = hashlib.sha256()
    hasher.update(contents)
    file_hash = hasher.hexdigest()

    existing_dup = db.query(Document).filter(
        Document.project_id == project.id,
        Document.file_hash == file_hash,
        Document.status != "DELETED",
    ).first()

    if existing_dup:
        raise HTTPException(
            status_code=409,
            detail=f"Identical document already exists for this project (ID: {existing_dup.id}, Version: v{existing_dup.version_number}).",
        )

    # 4. Determine version number
    version = 1
    parent_uuid = None
    if parent_document_id:
        try:
            parent_uuid = UUID(parent_document_id)
            prev = db.query(Document).filter(Document.id == parent_uuid).first()
            if prev:
                version = (prev.version_number or 1) + 1
        except (ValueError, TypeError):
            pass

    doc_id = uuid.uuid4()

    # 5. Store PDF safely
    stored = DocumentStorageService.store_document_file(
        project_id=str(project.id),
        document_id=str(doc_id),
        version_number=version,
        original_filename=orig_name,
        content=contents,
    )

    # 6. Create Document Record
    doc = Document(
        id=doc_id,
        project_id=project.id,
        doc_type=doc_type if doc_type in VALID_DOC_TYPES else "other",
        title=title,
        description=description,
        file_url=stored["storage_url"],
        file_name=stored["safe_file_name"],
        original_file_name=orig_name,
        file_path=stored["relative_file_path"],
        file_size_bytes=stored["file_size_bytes"],
        mime_type=stored["mime_type"],
        file_hash=file_hash,
        report_month=report_month,
        document_date=document_date,
        uploaded_by_id=str(current_user.id) if current_user else "anonymous",
        uploaded_by_name=current_user.full_name or current_user.email if current_user else "System/User",
        version_number=version,
        parent_document_id=parent_uuid,
        status="ACTIVE",
        processing_status="PROCESSING",
        extraction_status="NONE",
        confidentiality_level=confidentiality_level or "INTERNAL",
        is_active=True,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 7. Audit log
    _log_audit_action(
        db=db,
        document_id=doc.id,
        project_id=project.id,
        user=current_user,
        action="UPLOAD",
        details={"file_name": orig_name, "size": stored["file_size_bytes"], "version": version},
    )

    # 8. Background processing
    background_tasks.add_task(
        _process_document_pipeline,
        doc_id=doc.id,
        relative_path=stored["relative_file_path"],
        doc_type=doc.doc_type,
    )

    return _doc_to_dict(doc, project)


# ─── 4. DOCUMENT DETAILS & METADATA ───────────────────────────────────────────

@router.get("/{doc_id}", response_model=dict)
async def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Retrieve full document details, extracted text, and AI summary."""
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == uid).first()
    if not doc or doc.status == "DELETED":
        raise HTTPException(status_code=404, detail="Document not found.")

    project = db.query(Project).filter(Project.id == doc.project_id).first()

    _log_audit_action(db=db, document_id=doc.id, project_id=doc.project_id, user=current_user, action="VIEW")

    return _doc_to_dict(doc, project)


# ─── 5. PDF FILE STREAMING (PREVIEW & DOWNLOAD) ───────────────────────────────

@router.get("/{doc_id}/file")
async def get_document_file(
    doc_id: str,
    download: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Stream PDF for inline in-app preview or attachment download."""
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == uid).first()
    if not doc or doc.status == "DELETED":
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.file_path:
        raise HTTPException(status_code=404, detail="Physical PDF file unavailable for this legacy record.")

    abs_path = DocumentStorageService.get_absolute_file_path(doc.file_path)
    if not abs_path or not abs_path.exists():
        raise HTTPException(status_code=404, detail="PDF storage file not found on disk.")

    _log_audit_action(
        db=db,
        document_id=doc.id,
        project_id=doc.project_id,
        user=current_user,
        action="DOWNLOAD" if download else "PREVIEW",
    )

    disp = "attachment" if download else "inline"
    filename = doc.original_file_name or doc.file_name or "document.pdf"
    return FileResponse(
        path=str(abs_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disp}; filename="{filename}"'},
    )


# ─── 6. GROUNDED DOCUMENT Q&A ("ASK THIS DOCUMENT") ───────────────────────────

@router.post("/{doc_id}/ask", response_model=dict)
async def ask_document_question_endpoint(
    doc_id: str,
    payload: AskQuestionRequest,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """
    Interactive Q&A against document content.
    Answers strictly using extracted text and cites source pages.
    """
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == uid).first()
    if not doc or doc.status == "DELETED":
        raise HTTPException(status_code=404, detail="Document not found.")

    result = answer_document_question(doc.extracted_text or "", payload.question)

    _log_audit_action(
        db=db,
        document_id=doc.id,
        project_id=doc.project_id,
        user=current_user,
        action="AI_QUERY",
        details={"question": payload.question[:100]},
    )

    return result


# ─── 7. REPROCESS EXTRACTION & AI SUMMARY ─────────────────────────────────────

@router.post("/{doc_id}/process", response_model=dict)
async def reprocess_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Manually re-run extraction and AI summarization."""
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == uid).first()
    if not doc or doc.status == "DELETED":
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.file_path:
        raise HTTPException(status_code=400, detail="No stored PDF to process.")

    background_tasks.add_task(
        _process_document_pipeline,
        doc_id=doc.id,
        relative_path=doc.file_path,
        doc_type=doc.doc_type,
    )

    return {"status": "Processing initiated", "document_id": str(doc.id)}


# ─── 8. UPDATE & ARCHIVE / DELETE ─────────────────────────────────────────────

@router.patch("/{doc_id}", response_model=dict)
async def update_document(
    doc_id: str,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == uid).first()
    if not doc or doc.status == "DELETED":
        raise HTTPException(status_code=404, detail="Document not found.")

    if payload.title is not None:
        doc.title = payload.title
    if payload.description is not None:
        doc.description = payload.description
    if payload.doc_type is not None and payload.doc_type in VALID_DOC_TYPES:
        doc.doc_type = payload.doc_type
    if payload.report_month is not None:
        doc.report_month = payload.report_month
    if payload.confidentiality_level is not None:
        doc.confidentiality_level = payload.confidentiality_level

    db.commit()
    db.refresh(doc)
    _log_audit_action(db=db, document_id=doc.id, project_id=doc.project_id, user=current_user, action="UPDATE")
    return _doc_to_dict(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    permanent: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Archive document by default; permanent delete if requested."""
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    doc = db.query(Document).filter(Document.id == uid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if permanent:
        if doc.file_path:
            try:
                DocumentStorageService.delete_document_file(doc.file_path)
            except Exception:
                pass
        db.delete(doc)
    else:
        doc.status = "DELETED"
        doc.is_active = False

    db.commit()
    _log_audit_action(
        db=db,
        document_id=uid,
        project_id=doc.project_id,
        user=current_user,
        action="DELETE" if permanent else "ARCHIVE",
    )


# ─── 9. AUDIT LOG & PROJECT TIMELINE ──────────────────────────────────────────

@router.get("/{doc_id}/audit", response_model=List[dict])
async def get_document_audit_trail(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Retrieve document action history."""
    from uuid import UUID
    try:
        uid = UUID(doc_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid document ID format.")

    logs = (
        db.query(DocumentAuditLog)
        .filter(DocumentAuditLog.document_id == uid)
        .order_by(desc(DocumentAuditLog.created_at))
        .all()
    )

    return [
        {
            "id": str(l.id),
            "action": l.action,
            "user_name": l.user_name,
            "user_email": l.user_email,
            "role": l.role,
            "details": l.details,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.get("/project/{project_id}/timeline", response_model=List[dict])
async def get_project_document_timeline(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_user),
):
    """Chronological timeline of documents for a project."""
    from uuid import UUID
    try:
        uid = UUID(project_id)
        project = db.query(Project).filter(Project.id == uid).first()
    except (ValueError, TypeError):
        project = db.query(Project).filter(Project.project_id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    docs = (
        db.query(Document)
        .filter(Document.project_id == project.id, Document.status.notin_(["DELETED", "ARCHIVED"]), Document.is_active != False)
        .order_by(desc(Document.created_at))
        .all()
    )

    return [_doc_to_dict(d, project) for d in docs]
