import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from app.schemas.mitigation import StructuredMitigationPlan

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 800, "PRISM | MoSPI AI Infrastructure Mitigation Intelligence Report")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 792, 555, 792)

        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 30, footer_text)
        self.drawString(40, 30, f"Confidential & Privileged · Generated {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')} · MoSPI PAIMANA")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 42, 555, 42)
        self.restoreState()


def generate_mitigation_pdf(plan: StructuredMitigationPlan, model_name: str = "Qwen 2.5", validation_models: list = None) -> bytes:
    """
    Renders an executive, multi-page government PDF from the exact StructuredMitigationPlan object.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=55,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0284c7")
    )
    section_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a")
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # Title Banner
    story.append(Paragraph("TRACE / PRISM AI INFRASTRUCTURE MITIGATION PLAN", title_style))
    story.append(Paragraph(f"Authoritative Project Intelligence · Primary Model: {model_name}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=14))

    # Project Summary Table
    p_sum = plan.project_summary
    tier_bg = colors.HexColor("#fee2e2") if p_sum.risk_level.lower() == "critical" else colors.HexColor("#fef3c7") if p_sum.risk_level.lower() == "high" else colors.HexColor("#e0f2fe")
    tier_txt = colors.HexColor("#991b1b") if p_sum.risk_level.lower() == "critical" else colors.HexColor("#92400e") if p_sum.risk_level.lower() == "high" else colors.HexColor("#0369a1")

    meta_data = [
        [
            Paragraph(f"<b>Project Name:</b> {p_sum.project_name}", body_style),
            Paragraph(f"<b>Risk Level:</b> <font color='{tier_txt.hexval()}'><b>{p_sum.risk_level.upper()}</b></font>", body_style)
        ],
        [
            Paragraph(f"<b>Project ID:</b> {p_sum.project_id}", body_style),
            Paragraph(f"<b>Overall Risk Index:</b> {p_sum.overall_risk_score or 0.0}%", body_style)
        ],
        [
            Paragraph(f"<b>Schedule Risk:</b> {p_sum.schedule_risk or 0.0}%", body_style),
            Paragraph(f"<b>Cost Overrun Risk:</b> {p_sum.cost_risk or 0.0}%", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[300, 215])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Executive Summary Box
    story.append(Paragraph("1. Executive Intelligence & Risk Rationale", section_h1))
    exec_box = Table([[Paragraph(plan.executive_summary, body_style)]], colWidths=[515])
    exec_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bae6fd")),
        ('LINELEFT', (0,0), (-1,-1), 3, colors.HexColor("#0284c7")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(exec_box)
    story.append(Spacer(1, 14))

    # Risk Assessment Section
    if plan.risk_assessment:
        story.append(Paragraph("2. Root-Cause Risk Assessment", section_h1))
        for r in plan.risk_assessment:
            r_data = [
                [Paragraph(f"<b>Risk:</b> {r.risk} (Severity: {r.severity})", table_cell_bold)],
                [Paragraph(f"<b>Evidence:</b> {'; '.join(r.evidence)}", table_cell)],
                [Paragraph(f"<b>Probable Root Cause:</b> {r.root_cause}", table_cell)],
                [Paragraph(f"<b>Key Contributing SHAP Drivers:</b> {', '.join(r.shap_factors) if r.shap_factors else 'Baseline Progress'}", table_cell)],
            ]
            r_table = Table(r_data, colWidths=[515])
            r_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ffffff")),
                ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#e2e8f0")),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(r_table)
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 10))

    # Action Items Table Generator
    def render_actions_table(title: str, actions: list):
        if not actions:
            return
        story.append(Paragraph(title, section_h1))
        headers = ["Pri", "Action & Rationale", "Responsible Role", "Timeline", "Expected Outcome"]
        rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in headers]]
        for a in actions:
            rows.append([
                Paragraph(str(a.priority), table_cell_bold),
                Paragraph(f"<b>{a.action}</b><br/><font color='#64748b'>Reason: {a.reason}</font>", table_cell),
                Paragraph(a.responsible_role, table_cell),
                Paragraph(a.timeline, table_cell_bold),
                Paragraph(f"{a.expected_outcome}<br/><font color='#e11d48'>Escalate: {a.escalation_condition}</font>", table_cell),
            ])
        t = Table(rows, colWidths=[25, 185, 105, 75, 125])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))

    render_actions_table("3. Immediate Interventions (Phase 1: 0 - 30 Days)", plan.immediate_actions)
    render_actions_table("4. Short-Term Acceleration Actions (Phase 2: 30 - 90 Days)", plan.short_term_actions)
    render_actions_table("5. Medium-Term Financial & Asset Handover (Phase 3: 90 - 180 Days)", plan.medium_term_actions)

    # Continuous Monitoring Plan
    if plan.monitoring_plan:
        story.append(Paragraph("6. Continuous Indicator Monitoring Framework", section_h1))
        m_headers = ["Monitoring Indicator", "Current Baseline", "Target Value", "Frequency", "Responsible"]
        m_rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in m_headers]]
        for m in plan.monitoring_plan:
            m_rows.append([
                Paragraph(m.indicator, table_cell),
                Paragraph(m.current_value, table_cell),
                Paragraph(m.target_value, table_cell_bold),
                Paragraph(m.frequency, table_cell),
                Paragraph(m.responsible_role, table_cell),
            ])
        m_table = Table(m_rows, colWidths=[140, 95, 105, 75, 100])
        m_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(m_table)
        story.append(Spacer(1, 12))

    # Escalation Triggers Plan
    if plan.escalation_plan:
        story.append(Paragraph("7. Institutional Governance & Escalation Triggers", section_h1))
        e_headers = ["Escalation Trigger", "Variance Threshold", "Escalate To", "Recommended Statutory Action"]
        e_rows = [[Paragraph(f"<b>{h}</b>", table_cell_bold) for h in e_headers]]
        for e in plan.escalation_plan:
            e_rows.append([
                Paragraph(e.trigger, table_cell_bold),
                Paragraph(e.threshold, table_cell),
                Paragraph(e.escalate_to, table_cell_bold),
                Paragraph(e.recommended_action, table_cell),
            ])
        e_table = Table(e_rows, colWidths=[120, 100, 115, 180])
        e_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#fee2e2")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fca5a5")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#fecaca")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(e_table)
        story.append(Spacer(1, 16))

    doc.build(story, canvasmaker=NumberedCanvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
