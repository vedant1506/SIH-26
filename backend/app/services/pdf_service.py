import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.pdfgen import canvas
from app.schemas.mitigation import StructuredMitigationPlan


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        self.doc_plan_id = kwargs.pop("doc_plan_id", "MP-2026-AUTOGEN")
        self.doc_plan_hash = kwargs.pop("doc_plan_hash", "")
        self.doc_project_name = kwargs.pop("doc_project_name", "")
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header on later pages
        if self._pageNumber > 1:
            proj_title = f" · {self.doc_project_name[:40]}" if getattr(self, 'doc_project_name', '') else ""
            self.drawString(40, 800, f"TRACE | AI Mitigation Report{proj_title} · Plan ID: {getattr(self, 'doc_plan_id', 'MP-2026')}")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 792, 555, 792)

        # Running Footer
        proj_foot = f" · {self.doc_project_name[:25]}" if getattr(self, 'doc_project_name', '') else ""
        footer_left = f"MoSPI TRACE{proj_foot} · Plan ID: {getattr(self, 'doc_plan_id', 'MP-2026')} · Hash: {getattr(self, 'doc_plan_hash', '')[:16]}"
        footer_right = f"Page {self._pageNumber} of {page_count}"
        self.drawString(40, 30, footer_left)
        self.drawRightString(555, 30, footer_right)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 42, 555, 42)
        self.restoreState()


def _find_website_logo() -> str:
    """Finds the absolute path to the official website logo image."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    possible_paths = [
        os.path.abspath(os.path.join(base_dir, "..", "..", "..", "logo.jpg")),
        os.path.abspath(os.path.join(base_dir, "..", "..", "..", "frontend", "public", "logo.jpg")),
        os.path.abspath(os.path.join(base_dir, "..", "..", "..", "icon.png")),
        os.path.abspath(os.path.join(base_dir, "..", "..", "..", "frontend", "public", "icon.png")),
        os.path.abspath(os.path.join(base_dir, "..", "..", "..", "frontend", "app", "icon.png")),
    ]
    for p in possible_paths:
        if os.path.isfile(p):
            return p
    return ""


def generate_mitigation_pdf(
    plan: StructuredMitigationPlan,
    plan_id: str = "MP-2026-AUTOGEN",
    plan_hash: str = "",
    plan_version: int = 1,
    generated_at: str = "",
    model_name: str = "Qwen 2.5",
    validation_models: list = None
) -> bytes:
    """
    Renders an official, multi-page government PDF from the exact canonical StructuredMitigationPlan record.
    Guarantees exact 1-to-1 match with website data, including prominent Project Name and official Logo.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0284c7")
    )
    project_banner_title = ParagraphStyle(
        'ProjectBannerTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a")
    )
    project_banner_sub = ParagraphStyle(
        'ProjectBannerSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )
    meta_tag_style = ParagraphStyle(
        'DocMetaTag',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#64748b")
    )
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # 1. Header Banner with Website Logo and Official MoSPI Branding
    logo_path = _find_website_logo()
    gen_time_str = generated_at or datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')
    hash_short = plan_hash[:16] if plan_hash else "SHA256-VERIFIED"
    p_sum = plan.project_summary
    tier_name = p_sum.risk_level.upper()
    tier_color_hex = "#dc2626" if tier_name == "CRITICAL" else "#d97706" if tier_name == "HIGH" else "#0284c7"

    meta_text = f"<b>Plan ID:</b> {plan_id} | <b>Version:</b> v{plan_version} | <b>Plan Hash:</b> {hash_short} | <b>Generated:</b> {gen_time_str}"

    if logo_path:
        try:
            img = Image(logo_path, width=48, height=48)
            header_table_data = [[
                img,
                [
                    Paragraph("MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION · GOI", subtitle_style),
                    Paragraph("TRACE AI MITIGATION INTELLIGENCE REPORT", title_style),
                    Paragraph(meta_text, meta_tag_style)
                ]
            ]]
            header_table = Table(header_table_data, colWidths=[56, 459])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ]))
            story.append(header_table)
        except Exception:
            story.append(Paragraph("MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION · GOI", subtitle_style))
            story.append(Paragraph("TRACE AI MITIGATION INTELLIGENCE REPORT", title_style))
            story.append(Paragraph(meta_text, meta_tag_style))
    else:
        story.append(Paragraph("MINISTRY OF STATISTICS & PROGRAMME IMPLEMENTATION · GOI", subtitle_style))
        story.append(Paragraph("TRACE AI MITIGATION INTELLIGENCE REPORT", title_style))
        story.append(Paragraph(meta_text, meta_tag_style))

    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=8))

    # 2. Prominent Project Identification Banner Card
    banner_content = [
        [
            Paragraph(f"<b>PROJECT:</b> {p_sum.project_name}", project_banner_title),
            Paragraph(f"<b>Risk Classification:</b> <font color='{tier_color_hex}'><b>[{tier_name}]</b></font>", project_banner_sub)
        ],
        [
            Paragraph(f"<b>Sector:</b> {p_sum.sector} | <b>Project ID:</b> {p_sum.project_id}", project_banner_sub),
            Paragraph(f"<b>Composite Risk Score:</b> <b>{p_sum.risk_score or 0.0}/100</b> (Schedule: {p_sum.schedule_risk or 0}% | Cost: {p_sum.cost_risk or 0}%)", project_banner_sub)
        ]
    ]
    banner_table = Table(banner_content, colWidths=[335, 180])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#0284c7")),
        ('LINELEFT', (0,0), (-1,-1), 4, colors.HexColor("#0284c7")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 8))

    # 3. Executive Recommendation Box
    story.append(Paragraph("1. Executive Recommendation", section_h1))
    rec_box = Table([[Paragraph(plan.executive_recommendation, body_style)]], colWidths=[515])
    rec_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('LINELEFT', (0,0), (-1,-1), 3.5, colors.HexColor("#0284c7")),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(rec_box)
    story.append(Spacer(1, 8))

    # 4. Key Risk Drivers (SHAP / XGBoost)
    if plan.risk_drivers:
        story.append(Paragraph("2. Key Risk Drivers (SHAP Feature Attribution)", section_h1))
        d_headers = ["Risk Factor", "Impact", "Evidence / Metric", "Source"]
        d_rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in d_headers]]
        for d in plan.risk_drivers:
            d_rows.append([
                Paragraph(d.factor, table_cell_bold),
                Paragraph(d.impact, table_cell),
                Paragraph(d.evidence, table_cell),
                Paragraph(d.source, table_cell),
            ])
        d_table = Table(d_rows, colWidths=[150, 95, 190, 80])
        d_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 4.5),
        ]))
        story.append(d_table)
        story.append(Spacer(1, 8))

    # 5. Root Cause Analysis
    if plan.root_causes:
        story.append(Paragraph("3. Why This Project Is At Risk (Root Cause Analysis)", section_h1))
        for rc in plan.root_causes:
            rc_data = [
                [Paragraph(f"<b>Identified Risk:</b> {rc.risk}", table_cell_bold)],
                [Paragraph(f"<b>Likely Root Cause:</b> {rc.cause}", table_cell)],
                [Paragraph(f"<b>Observed Project Evidence:</b> {rc.evidence}", table_cell)],
            ]
            rc_table = Table(rc_data, colWidths=[515])
            rc_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ffffff")),
                ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#e2e8f0")),
                ('PADDING', (0,0), (-1,-1), 4.5),
            ]))
            story.append(rc_table)
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 6))

    # 6. Priority Mitigation Actions Table
    if plan.mitigation_actions:
        story.append(Paragraph("4. Priority Mitigation Actions", section_h1))
        a_headers = ["Pri", "Risk / Action", "Responsible Role", "Timeline", "Expected Outcome & Escalation"]
        a_rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in a_headers]]
        for act in plan.mitigation_actions:
            sev_badge = f"<font color='#dc2626'><b>[{act.severity}]</b></font>" if act.severity == "CRITICAL" else f"<font color='#d97706'><b>[{act.severity}]</b></font>"
            ev_line = f"<br/><font color='#0284c7'><b>Evidence:</b> {act.evidence}</font>" if act.evidence else ""
            a_rows.append([
                Paragraph(f"<b>P{act.priority}</b>", table_cell_bold),
                Paragraph(f"{sev_badge} <b>{act.action}</b>{ev_line}<br/><font color='#64748b'><b>Reason:</b> {act.reason}</font>", table_cell),
                Paragraph(act.responsible_role, table_cell),
                Paragraph(f"<b>{act.timeline}</b>", table_cell),
                Paragraph(f"{act.expected_outcome}<br/><font color='#dc2626'><b>Escalate:</b> {act.escalation_trigger}</font>", table_cell),
            ])
        a_table = Table(a_rows, colWidths=[24, 186, 95, 75, 135])
        a_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(a_table)
        story.append(Spacer(1, 8))

    # 7. Monitoring Plan Table
    if plan.monitoring_plan:
        story.append(Paragraph("5. Continuous Monitoring Plan", section_h1))
        m_headers = ["Monitoring Indicator", "Current Value", "Target Value", "Cadence", "Accountable Role"]
        m_rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in m_headers]]
        for m in plan.monitoring_plan:
            m_rows.append([
                Paragraph(m.indicator, table_cell),
                Paragraph(m.current_value, table_cell),
                Paragraph(m.target, table_cell_bold),
                Paragraph(m.frequency, table_cell),
                Paragraph(m.responsible_role, table_cell),
            ])
        m_table = Table(m_rows, colWidths=[145, 95, 105, 70, 100])
        m_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(m_table)
        story.append(Spacer(1, 8))

    # 8. Escalation Plan Table
    if plan.escalation_plan:
        story.append(Paragraph("6. Institutional Governance & Escalation Triggers", section_h1))
        e_headers = ["Trigger Event", "Variance Threshold", "Escalate To", "Recommended Action"]
        e_rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in e_headers]]
        for e in plan.escalation_plan:
            e_rows.append([
                Paragraph(e.trigger, table_cell_bold),
                Paragraph(e.threshold, table_cell),
                Paragraph(e.escalate_to, table_cell_bold),
                Paragraph(e.recommended_action, table_cell),
            ])
        e_table = Table(e_rows, colWidths=[120, 95, 115, 185])
        e_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#fee2e2")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fca5a5")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#fecaca")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(e_table)
        story.append(Spacer(1, 10))

    # 9. AI Generation Provenance Box
    add_models_str = ", ".join(validation_models) if validation_models else "None (Single Model Mode)"
    provenance_text = (
        f"<b>AI Provenance & Audit Verification:</b> Plan ID: <b>{plan_id}</b> | Version: <b>v{plan_version}</b> | "
        f"Hash: <b>{hash_short}</b> | Primary Model: <b>{model_name}</b> | Generated: <b>{gen_time_str}</b>"
    )
    story.append(Table([[Paragraph(provenance_text, body_style)]], colWidths=[515], style=[
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))

    # Custom canvas maker carrying Plan ID, Plan Hash, and Project Name
    def make_canvas(*args, **kwargs):
        c = NumberedCanvas(*args, **kwargs)
        c.doc_plan_id = plan_id
        c.doc_plan_hash = plan_hash
        c.doc_project_name = plan.project_summary.project_name
        return c

    doc.build(story, canvasmaker=make_canvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
