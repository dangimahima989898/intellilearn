import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from reportlab.lib import colors
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to draw header and footer with total page count.
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
        self.setFillColor(colors.HexColor("#4F46E5")) # Violet primary
        
        # Draw Header
        self.drawString(54, 755, "INTELLILEARN — ACADEMIC NOTES SUMMARIZER")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(558, 755, f"{self.subject_code} · {self.unit_name}")
        
        # Header divider
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 747, 558, 747)
        
        # Footer divider
        self.line(54, 55, 558, 55)
        
        # Draw Footer
        self.drawString(54, 42, f"Verified by: {self.approver_name} on {self.approval_date}")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 42, page_text)
        
        self.restoreState()


def generate_summary_pdf(summary_text: str, metadata: dict, output_path: str):
    """
    Convert markdown summary text to a formatted PDF.
    """
    # Create target directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Setup custom canvas fields dynamically
    class DynamicNumberedCanvas(NumberedCanvas):
        subject_code = metadata.get("subject_code", "Syllabus")
        unit_name = metadata.get("unit", "Unit")
        approver_name = metadata.get("approver_name", "Assigned Faculty")
        approval_date = metadata.get("approval_date", "N/A")

    # Document Setup
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#4F46E5"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    story = []

    # Title Banner
    story.append(Paragraph(metadata.get("title", "Revision Notes Summary"), title_style))
    story.append(Paragraph(f"Subject: {metadata.get('subject_name', 'Subject')} | Unit: {metadata.get('unit', 'Unit')}", subtitle_style))
    story.append(Spacer(1, 10))

    # Parse markdown line by line
    lines = summary_text.split("\n")
    for line in lines:
        line_str = line.strip()
        if not line_str:
            story.append(Spacer(1, 4))
            continue
        
        # Headings
        if line_str.startswith("## "):
            header_text = line_str.replace("## ", "").upper()
            story.append(Paragraph(header_text, h2_style))
        
        # Bullet Points
        elif line_str.startswith("•") or line_str.startswith("-"):
            bullet_text = line_str.replace("•", "").replace("-", "").strip()
            # Parse bold text within bullet
            bullet_text = reformat_markdown_bold(bullet_text)
            story.append(Paragraph(f"&bull; {bullet_text}", bullet_style))
        
        # Numbered List / Questions
        elif re.match(r"^\d+\.", line_str):
            match = re.match(r"^(\d+\.)\s*(.*)", line_str)
            num = match.group(1)
            content = reformat_markdown_bold(match.group(2))
            story.append(Paragraph(f"{num} {content}", bullet_style))
            
        # Standard definitions / lines
        else:
            formatted_line = reformat_markdown_bold(line_str)
            story.append(Paragraph(formatted_line, body_style))

    # Build Document using two-pass numbered canvas
    doc.build(story, canvasmaker=DynamicNumberedCanvas)


def reformat_markdown_bold(text: str) -> str:
    """Helper to convert **bold** markdown text to HTML <b>bold</b> for ReportLab Paragraphs."""
    # Convert **text** to <b>text</b>
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    # Convert *text* to <i>text</i>
    text = re.sub(r"\*(.*?)\*", r"<i>\1</i>", text)
    # Convert ⚡ to symbol
    text = text.replace("⚡", "<font color='#F59E0B'><b>⚡</b></font>")
    return text
