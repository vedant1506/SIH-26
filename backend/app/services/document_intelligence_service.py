"""
document_intelligence_service.py — Document Extraction, Grounded AI Summary, and Q&A Engine.
Extracts:
1. Multi-page clean text using pypdf and pdfplumber.
2. Graceful OCR detection (scanned vs text-based PDFs).
3. Structured Project Metrics (Cost, Progress, Expenditure, Milestones, Issues).
4. Grounded AI Summary (Executive summary, key findings, advisory disclaimer).
5. Grounded Document Q&A citing exact page numbers.
"""
import io
import re
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


def extract_pdf_pages_and_text(file_path: Path) -> Tuple[str, List[Dict[str, Any]], str]:
    """
    Extract text page-by-page from PDF file using pypdf / pdfplumber.
    Returns:
    - full_text: concatenated cleaned text
    - pages_meta: list of {page_number, text, char_count}
    - extraction_status: "COMPLETED" | "OCR_REQUIRED" | "OCR_UNAVAILABLE" | "FAILED"
    """
    pages_meta = []
    full_text_list = []

    try:
        import pypdf
        reader = pypdf.PdfReader(str(file_path))
        num_pages = len(reader.pages)

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            text = page.extract_text() or ""
            cleaned = text.strip()
            pages_meta.append({
                "page_number": page_num,
                "char_count": len(cleaned),
                "text": cleaned[:2500],  # Keep reasonable snippet for page preview
            })
            if cleaned:
                full_text_list.append(f"--- Page {page_num} ---\n{cleaned}")

        full_text = "\n\n".join(full_text_list).strip()

        # Fallback to pdfplumber if pypdf got minimal text on multi-page PDF
        if len(full_text) < 60 and num_pages > 0:
            try:
                import pdfplumber
                with pdfplumber.open(str(file_path)) as pdf:
                    plumber_text = []
                    for idx, p in enumerate(pdf.pages):
                        t = p.extract_text() or ""
                        if t.strip():
                            plumber_text.append(f"--- Page {idx+1} ---\n{t.strip()}")
                    if plumber_text:
                        full_text = "\n\n".join(plumber_text).strip()
            except Exception as pe:
                logger.warning(f"pdfplumber fallback notice: {pe}")

        # Evaluate OCR requirement
        if num_pages > 0 and len(full_text) < 40:
            extraction_status = "OCR_REQUIRED"
        else:
            extraction_status = "COMPLETED"

        return full_text, pages_meta, extraction_status

    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        return "", [], "FAILED"


def extract_structured_project_data(full_text: str, filename: str) -> Dict[str, Any]:
    """
    Heuristically and pattern-extract project metadata from document text:
    - Cost figures (Original, Revised)
    - Cumulative Expenditure
    - Physical Progress %
    - Milestone delay indicators
    - Implementation bottlenecks / risk evidence
    """
    data: Dict[str, Any] = {
        "reported_original_cost_cr": None,
        "reported_revised_cost_cr": None,
        "reported_expenditure_cr": None,
        "reported_physical_progress_pct": None,
        "report_month": None,
        "detected_project_name": None,
        "detected_agency": None,
        "milestones": [],
        "risk_evidence": [],
    }

    if not full_text:
        return data

    text_lower = full_text.lower()

    # 1. Progress extraction
    progress_patterns = [
        r"(?:physical\s*progress|progress\s*achieved|work\s*done)[:\s]*([\d\.]+)\s*%",
        r"(?:progress)[:\s]*([\d\.]+)\s*%",
        r"([\d\.]+)\s*%\s*(?:physical\s*progress|completed)",
    ]
    for p in progress_patterns:
        m = re.search(p, text_lower)
        if m:
            try:
                val = float(m.group(1))
                if 0 <= val <= 100:
                    data["reported_physical_progress_pct"] = val
                    break
            except (ValueError, IndexError):
                pass

    # 2. Financial Figures (Crores INR)
    cost_patterns = [
        ("reported_original_cost_cr", [
            r"(?:original\s*cost|sanctioned\s*cost|approved\s*cost)[:\s]*(?:₹|rs\.?|inr)?\s*([\d\.,]+)\s*(?:cr|crore)?",
        ]),
        ("reported_revised_cost_cr", [
            r"(?:revised\s*cost|anticipated\s*cost)[:\s]*(?:₹|rs\.?|inr)?\s*([\d\.,]+)\s*(?:cr|crore)?",
        ]),
        ("reported_expenditure_cr", [
            r"(?:cumulative\s*expenditure|expenditure\s*incurred|total\s*spent)[:\s]*(?:₹|rs\.?|inr)?\s*([\d\.,]+)\s*(?:cr|crore)?",
        ]),
    ]
    for key, patterns in cost_patterns:
        for p in patterns:
            m = re.search(p, text_lower)
            if m:
                try:
                    raw_val = m.group(1).replace(",", "")
                    val = float(raw_val)
                    if val > 0:
                        data[key] = val
                        break
                except (ValueError, IndexError):
                    pass

    # 3. Report Month / Date
    month_match = re.search(
        r"(?:january|february|march|april|may|june|july|august|september|october|november|december)\s*202[0-9]",
        text_lower,
    )
    if month_match:
        data["report_month"] = month_match.group(0).title()

    # 4. Risk Evidence & Milestone Delays
    lines = full_text.splitlines()
    risk_keywords = [
        ("Land acquisition", "Delay or impediment in land acquisition / right of way"),
        ("Environmental clearance", "Forest / environmental clearance pending or delayed"),
        ("Cost overrun", "Anticipated cost escalation reported above sanction"),
        ("Contractor delay", "Contractor mobilization delay or dispute reported"),
        ("Monsoon", "Adverse seasonal / flood impact slowing earthwork"),
        ("Encroachment", "Site encroachment or local clearance obstacle"),
        ("Utility shifting", "Electrical / pipeline utility shifting pending"),
    ]

    for kw, description in risk_keywords:
        for line_idx, line in enumerate(lines):
            if kw.lower() in line.lower():
                page_match = re.search(r"--- Page (\d+) ---", "\n".join(lines[max(0, line_idx-30):line_idx]))
                page_num = int(page_match.group(1)) if page_match else 1
                data["risk_evidence"].append({
                    "keyword": kw,
                    "finding": description,
                    "source_page": page_num,
                    "context_snippet": line.strip()[:160],
                })
                break  # Record one evidence per keyword type

    return data


def generate_document_ai_summary(full_text: str, doc_type: str, metadata: Dict[str, Any]) -> str:
    """
    Generate professional, grounded AI document summary.
    Includes: Executive Summary, Key Metrics, Identified Concerns, and Grounded Disclaimer.
    """
    if not full_text or len(full_text) < 40:
        return "AI Summary Unavailable: Document contains insufficient extracted text or requires OCR processing."

    lines = [l.strip() for l in full_text.splitlines() if l.strip() and not l.startswith("--- Page")]
    first_few = " ".join(lines[:4])[:280]

    prog = metadata.get("reported_physical_progress_pct")
    orig_c = metadata.get("reported_original_cost_cr")
    rev_c = metadata.get("reported_revised_cost_cr")
    exp = metadata.get("reported_expenditure_cr")
    evidences = metadata.get("risk_evidence", [])

    summary_parts = [
        "### Executive Summary",
        f"This document represents a formal project submission ({doc_type.replace('_', ' ').title()}). "
        f"{first_few}..." if first_few else "Detailed progress report submitted for infrastructure review.",
        "",
        "### Extracted Progress & Financial Findings",
        f"• **Reported Physical Progress**: {prog}%" if prog is not None else "• **Reported Physical Progress**: Not explicitly tabulated in document.",
        f"• **Cumulative Expenditure**: ₹{exp:,.2f} Cr" if exp is not None else "• **Cumulative Expenditure**: Not explicitly indicated.",
        f"• **Original vs Revised Cost**: ₹{orig_c} Cr → ₹{rev_c} Cr" if (orig_c and rev_c) else (
            f"• **Reported Cost**: ₹{orig_c or rev_c} Cr" if (orig_c or rev_c) else "• **Project Cost**: Standard baseline financial metrics apply."
        ),
    ]

    if evidences:
        summary_parts.append("")
        summary_parts.append("### Key Risk Evidence & Implementation Bottlenecks")
        for ev in evidences[:4]:
            summary_parts.append(f"• ⚠ **{ev['finding']}** *(Source: Page {ev['source_page']})*")
            if ev.get("context_snippet"):
                summary_parts.append(f"  > \"{ev['context_snippet']}\"")
    else:
        summary_parts.append("")
        summary_parts.append("### Risk Assessment")
        summary_parts.append("• ✓ No severe structural impediment keywords detected in primary textual passages.")

    summary_parts.extend([
        "",
        "> [!NOTE]",
        "> **Advisory Notice**: *AI-generated summary – verify figures against the authoritative source PDF document.*"
    ])

    return "\n".join(summary_parts)


def answer_document_question(full_text: str, question: str) -> Dict[str, Any]:
    """
    Grounded Document Q&A ('Ask this document').
    Returns:
    - answer: Grounded text answer citing page numbers
    - confidence: float 0.0 - 1.0
    - source_page: optional page number
    """
    if not full_text or len(full_text) < 40:
        return {
            "answer": "The document does not provide enough readable text to answer this question. (Check if OCR is required).",
            "confidence": 0.0,
            "source_page": None,
        }

    q_clean = question.strip().lower()

    # Split document into page chunks
    page_blocks = re.split(r"--- Page (\d+) ---", full_text)
    pages = []
    # page_blocks: ['', '1', 'text...', '2', 'text...']
    for i in range(1, len(page_blocks), 2):
        try:
            p_num = int(page_blocks[i])
            p_txt = page_blocks[i+1].strip()
            pages.append((p_num, p_txt))
        except (ValueError, IndexError):
            continue

    if not pages:
        pages = [(1, full_text)]

    # 1. Check for specific question types:
    # A. Physical Progress
    if any(k in q_clean for k in ["progress", "physical progress", "how much complete", "percentage"]):
        for p_num, p_txt in pages:
            m = re.search(r"(?:physical\s*progress|progress)[:\s]*([\d\.]+)\s*%", p_txt, re.IGNORECASE)
            if m:
                return {
                    "answer": f"The reported physical progress is **{m.group(1)}%** according to the document text.",
                    "confidence": 0.95,
                    "source_page": p_num,
                }

    # B. Cost or Expenditure
    if any(k in q_clean for k in ["cost", "budget", "expenditure", "spent", "cr", "crore"]):
        for p_num, p_txt in pages:
            m = re.search(r"(?:cost|expenditure|sanctioned)[:\s]*(?:₹|rs\.?|inr)?\s*([\d\.,]+)\s*(?:cr|crore)?", p_txt, re.IGNORECASE)
            if m:
                return {
                    "answer": f"The document references an amount of **₹{m.group(1)} Cr** regarding project expenditure/cost.",
                    "confidence": 0.88,
                    "source_page": p_num,
                }

    # C. Completion date / schedule
    if any(k in q_clean for k in ["completion", "schedule", "deadline", "target date"]):
        for p_num, p_txt in pages:
            m = re.search(r"(?:completion\s*date|target\s*date|scheduled)[:\s]*([^\n\r,\.]+)", p_txt, re.IGNORECASE)
            if m:
                return {
                    "answer": f"The scheduled or anticipated completion is indicated as: **{m.group(1).strip()}**.",
                    "confidence": 0.85,
                    "source_page": p_num,
                }

    # D. Delays, issues, or obstacles
    if any(k in q_clean for k in ["delay", "issue", "risk", "problem", "bottleneck", "hindrance"]):
        for p_num, p_txt in pages:
            for kw in ["land acquisition", "clearance", "contractor", "encroachment", "utility"]:
                if kw in p_txt.lower():
                    # Extract line
                    for l in p_txt.splitlines():
                        if kw in l.lower():
                            return {
                                "answer": f"The document notes an implementation challenge regarding **{kw}**: \"{l.strip()[:180]}\"",
                                "confidence": 0.82,
                                "source_page": p_num,
                            }

    # Generic search: Find the page with highest keyword overlap
    tokens = [w for w in re.findall(r"\w+", q_clean) if len(w) > 3]
    best_page = None
    best_score = 0
    best_snippet = ""

    for p_num, p_txt in pages:
        txt_low = p_txt.lower()
        score = sum(1 for t in tokens if t in txt_low)
        if score > best_score:
            best_score = score
            best_page = p_num
            # Find relevant sentence
            sentences = [s.strip() for s in re.split(r"[.\n]", p_txt) if any(t in s.lower() for t in tokens)]
            best_snippet = sentences[0] if sentences else p_txt[:200]

    if best_score > 0 and best_snippet:
        return {
            "answer": f"According to the document: \"{best_snippet.strip()}\".",
            "confidence": min(0.85, 0.4 + (best_score * 0.1)),
            "source_page": best_page,
        }

    return {
        "answer": "The document does not provide enough explicit information to answer this question.",
        "confidence": 0.3,
        "source_page": None,
    }
