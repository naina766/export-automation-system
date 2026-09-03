from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import sys
from pathlib import Path

def generate_presentation_pdf(output_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=8
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )

    story = []
    story.append(Paragraph("Himalayan Artisans Export Ltd.", title_style))
    story.append(Paragraph("Export Catalog & B2B Partnership Presentation | Handcrafted Singing Bowls", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=15))

    story.append(Paragraph("1. Executive Summary", section_style))
    story.append(Paragraph(
        "We are premier exporters of authentic Himalayan hand-hammered singing bowls, meditation gongs, and sound-therapy accessories. "
        "Crafted using traditional 7-metal alloy techniques, our instruments are trusted by wellness centers, yoga studios, and spiritual boutiques across North America, Europe, and Asia-Pacific.",
        body_style
    ))

    story.append(Paragraph("2. Product Range & Specifications", section_style))
    story.append(Paragraph("• <b>Full Moon Singing Bowls:</b> Crafted under moonlight with superior acoustic resonance and sustained frequency for chakra alignment.", body_style))
    story.append(Paragraph("• <b>Jambati & Thadobati Bowls:</b> Deep curved traditional shapes offering warm, low-frequency sound baths.", body_style))
    story.append(Paragraph("• <b>Therapeutic Singing Bowl Sets:</b> 7-piece tuned sets matching standard 432Hz and 528Hz healing frequencies.", body_style))
    story.append(Paragraph("• <b>Accessories:</b> Suede-wrapped rosewood mallets, silk brocade cushions, and protective travel cases.", body_style))

    story.append(Paragraph("3. B2B Wholesale & Customization Benefits", section_style))
    story.append(Paragraph("• <b>Direct Manufacturer Pricing:</b> Eliminating middleman markups with direct FOB/CIF container shipping.", body_style))
    story.append(Paragraph("• <b>Custom Branding & OEM:</b> Laser engraving, custom packaging, and barcode integration for retail shelves.", body_style))
    story.append(Paragraph("• <b>Strict Quality Assurance:</b> Frequency testing and metal composition certificates included with every shipment.", body_style))

    story.append(Paragraph("4. Contact Export Desk", section_style))
    story.append(Paragraph("Email: export@himalayanartisans.example | Web: www.himalayanartisans.example", body_style))

    doc.build(story)

if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "company_presentation.pdf"
    generate_presentation_pdf(out)
    print(f"Generated: {out}")
