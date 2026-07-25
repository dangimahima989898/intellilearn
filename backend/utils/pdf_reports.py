import io
import re
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class AuditReportNumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to draw header, footer and 'Page X of Y' for the At-Risk report.
    """
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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1E3A8A")) # Primary Dark Blue
        
        # Draw Header
        self.drawString(54, 755, "INTELLILEARN — STUDENT RISK AUDIT REPORT")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(558, 755, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        # Header divider
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 747, 558, 747)
        
        # Footer divider
        self.line(54, 55, 558, 55)
        
        # Draw Footer
        self.drawString(54, 42, "CONFIDENTIAL — Academic Evaluation and Faculty Intervention Use Only")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 42, page_text)
        
        self.restoreState()


def generate_at_risk_pdf(students_data: list, semester_title: str = "All Semesters") -> bytes:
    """
    Generates a stylized PDF report listing at-risk students for administrative review.
    """
    buffer = io.BytesIO()
    
    # Setup document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )
    
    styles = getSampleStyleSheet()
    
    # Custom typography styles
    title_style = ParagraphStyle(
        'AuditTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1E3A8A"), # Dark Navy
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'AuditSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4B5563"),
        spaceAfter=15
    )
    
    section_title_style = ParagraphStyle(
        'AuditSection',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E3A8A"),
        spaceBefore=10,
        spaceAfter=8,
        keepWithNext=True
    )
    
    cell_header_style = ParagraphStyle(
        'CellHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white,
        alignment=0 # Left
    )
    
    cell_body_style = ParagraphStyle(
        'CellBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1F2937")
    )
    
    cell_body_bold_style = ParagraphStyle(
        'CellBodyBold',
        parent=cell_body_style,
        fontName='Helvetica-Bold'
    )
    
    badge_high_style = ParagraphStyle(
        'BadgeHigh',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#9C0006"),
        alignment=1 # Center
    )
    
    badge_med_style = ParagraphStyle(
        'BadgeMedium',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#9C4100"),
        alignment=1 # Center
    )
    
    summary_text_style = ParagraphStyle(
        'SummaryText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#374151"),
        spaceAfter=10
    )

    story = []
    
    # 1. Header Information
    story.append(Paragraph("STUDENT RISK ANALYSIS REPORT", title_style))
    story.append(Paragraph(f"Semester Filter: {semester_title} | Department: MCA, MLSU | Total Flags: {len(students_data)} Students", subtitle_style))
    story.append(Spacer(1, 8))
    
    # 2. Executive Summary Block
    summary_html = (
        "This diagnostic report identifies students exhibiting warning behaviors based on "
        "IntelliLearn adaptive analytics thresholds. Indicators include: <b>Inactivity</b> (>7 days), "
        "<b>Low quiz performance</b> (<40% avg), <b>Low daily challenge participation</b> (<20%), "
        "or <b>Unresolved academic doubts</b> (>=3). Please initiate immediate outreach nudges via the dashboard."
    )
    story.append(Paragraph(summary_html, summary_text_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("Identified At-Risk Student Cohort", section_title_style))
    
    # 3. Table Setup
    # Total Printable Width: 612 - 54*2 = 504.
    # Column splits: Student Info (110), Risk Level (64), Risk Reasons (190), Metrics Details (140)
    col_widths = [110, 64, 190, 140]
    
    # Table headers
    table_data = [[
        Paragraph("STUDENT INFO", cell_header_style),
        Paragraph("RISK LEVEL", cell_header_style),
        Paragraph("RISK REASONS / INDICATORS", cell_header_style),
        Paragraph("KEY METRICS", cell_header_style)
    ]]
    
    # Row colors or styles
    row_styles = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
    ]
    
    for row_idx, student in enumerate(students_data, 1):
        # Student cell: Name & Email
        name = student.get("name", "N/A")
        email = student.get("email", "N/A")
        student_cell = Paragraph(f"<b>{name}</b><br/><font color='#64748B' size='7.5'>{email}</font>", cell_body_style)
        
        # Risk Badge cell
        risk_level = student.get("risk_level", "Medium").upper()
        if risk_level == "HIGH":
            risk_cell = Paragraph("<b>HIGH</b>", badge_high_style)
            bg_color = colors.HexColor("#FEE2E2") # Light red
        else:
            risk_cell = Paragraph("<b>MEDIUM</b>", badge_med_style)
            bg_color = colors.HexColor("#FFEDD5") # Light orange
            
        row_styles.append(('BACKGROUND', (1, row_idx), (1, row_idx), bg_color))
        
        # Reasons cell: Bulleted reasons
        reasons = student.get("reasons", [])
        if not reasons:
            reasons_html = "No specific indicators logged."
        else:
            reasons_html = "<br/>".join([f"&bull; {r}" for r in reasons])
        reasons_cell = Paragraph(reasons_html, cell_body_style)
        
        # Metrics cell: Detailed stats
        inactive_days = student.get("inactive_days", 0)
        avg_quiz = student.get("avg_quiz", "N/A")
        doubts = student.get("unresolved_doubts", 0)
        challenge = student.get("challenge_completion", "0%")
        
        metrics_html = (
            f"Quiz Average: <b>{avg_quiz}</b><br/>"
            f"Unresolved Doubts: <b>{doubts}</b><br/>"
            f"Daily Challenges: <b>{challenge}</b><br/>"
            f"Inactivity: <b>{inactive_days} days</b>"
        )
        metrics_cell = Paragraph(metrics_html, cell_body_style)
        
        table_data.append([student_cell, risk_cell, reasons_cell, metrics_cell])
        
        # Alternating row background for details (except the risk column, which has its own color)
        bg_alt = colors.HexColor("#F9FAFB") if row_idx % 2 == 0 else colors.white
        row_styles.append(('BACKGROUND', (0, row_idx), (0, row_idx), bg_alt))
        row_styles.append(('BACKGROUND', (2, row_idx), (3, row_idx), bg_alt))
        row_styles.append(('TOPPADDING', (0, row_idx), (-1, row_idx), 6))
        row_styles.append(('BOTTOMPADDING', (0, row_idx), (-1, row_idx), 6))
        
    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle(row_styles))
    story.append(t)
    
    # Build the document
    doc.build(story, canvasmaker=AuditReportNumberedCanvas)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
