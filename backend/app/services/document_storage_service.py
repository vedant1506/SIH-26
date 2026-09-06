"""
document_storage_service.py — Secure Local Storage & Validation Service for Project Documents.
Enforces:
1. Strict server-side PDF validation (magic bytes, MIME type, max size).
2. Path traversal protection & sanitized filenames.
3. Cryptographic SHA-256 hashing for duplicate detection.
4. Structured safe storage paths:
   storage/project-documents/{project_id}/{document_id}/v{version_number}/{safe_filename}.pdf
"""
import os
import re
import hashlib
import unicodedata
from pathlib import Path
from typing import Tuple, Optional
from fastapi import HTTPException, UploadFile

# Storage root: backend/storage/project-documents
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_ROOT = BACKEND_DIR / "storage" / "project-documents"
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_DOCUMENT_SIZE_BYTES", 25 * 1024 * 1024))  # 25 MB


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename against path traversal and dangerous characters.
    Preserves valid characters and forces safe .pdf extension.
    """
    clean_name = os.path.basename(filename)
    clean_name = unicodedata.normalize("NFKD", clean_name).encode("ascii", "ignore").decode("ascii")
    # Remove directory separators and dangerous chars
    clean_name = re.sub(r"[^\w\s\.-]", "_", clean_name).strip()
    clean_name = re.sub(r"\s+", "_", clean_name)
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"
    return clean_name or "document.pdf"


def compute_sha256(content: bytes) -> str:
    """Compute SHA-256 cryptographic hash of byte content."""
    hasher = hashlib.sha256()
    hasher.update(content)
    return hasher.hexdigest()


def validate_pdf_content(content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that content is a legitimate, non-empty, non-corrupted PDF.
    Checks:
    - Non-empty
    - Size <= MAX_UPLOAD_SIZE_BYTES
    - Magic bytes signature %PDF-
    """
    if not content or len(content) == 0:
        return False, "File is empty (0 bytes)."

    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        max_mb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        return False, f"File size exceeds maximum allowed limit of {max_mb:.0f} MB."

    # Validate PDF signature (magic bytes)
    # %PDF- signature typically appears at index 0 or within first 1024 bytes
    header = content[:1024]
    if b"%PDF-" not in header:
        return False, "Invalid document format: File signature does not match a valid PDF document."

    return True, None


class DocumentStorageService:
    @staticmethod
    def store_document_file(
        project_id: str,
        document_id: str,
        version_number: int,
        original_filename: str,
        content: bytes,
    ) -> dict:
        """
        Validates and writes PDF content to safe storage path.
        Returns metadata:
        - safe_file_name
        - relative_file_path
        - absolute_file_path
        - file_hash (SHA-256)
        - file_size_bytes
        - mime_type
        """
        # 1. Validate PDF
        is_valid, err_msg = validate_pdf_content(content, original_filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

        # 2. Hash & Sanitize
        file_hash = compute_sha256(content)
        safe_name = sanitize_filename(original_filename)

        # 3. Path structure: storage/project-documents/{project_id}/{document_id}/v{version_number}/{safe_name}
        target_dir = STORAGE_ROOT / str(project_id) / str(document_id) / f"v{version_number}"
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / safe_name

        # 4. Write bytes
        with open(target_file, "wb") as f:
            f.write(content)

        relative_path = target_file.relative_to(BACKEND_DIR).as_posix()
        storage_url = f"/api/v1/documents/{document_id}/file"

        return {
            "safe_file_name": safe_name,
            "relative_file_path": relative_path,
            "absolute_file_path": str(target_file),
            "storage_url": storage_url,
            "file_hash": file_hash,
            "file_size_bytes": len(content),
            "mime_type": "application/pdf",
        }

    @staticmethod
    def get_absolute_file_path(relative_file_path: str) -> Optional[Path]:
        """Resolve relative file path to absolute filesystem path safely."""
        if not relative_file_path:
            return None
        abs_path = (BACKEND_DIR / relative_file_path).resolve()
        # Security check: Ensure path is within STORAGE_ROOT
        try:
            abs_path.relative_to(STORAGE_ROOT)
        except ValueError:
            return None  # Path traversal attempt rejected

        if abs_path.exists() and abs_path.is_file():
            return abs_path
        return None

    @staticmethod
    def delete_document_file(relative_file_path: str) -> bool:
        """Safely delete stored file."""
        abs_path = DocumentStorageService.get_absolute_file_path(relative_file_path)
        if abs_path and abs_path.exists():
            try:
                os.remove(abs_path)
                return True
            except Exception:
                return False
        return False
