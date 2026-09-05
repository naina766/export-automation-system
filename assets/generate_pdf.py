from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import sys
from pathlib import Path

def generate_catalog_pdf(output_path: Path, title: str, subtitle: str, description: str, items: list):
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
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#475569'),
        spaceAfter=12
    )
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=5
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    story = []
    story.append(Paragraph("Himalayan Artisans Export Ltd.", title_style))
    story.append(Paragraph(f"<b>{title}</b> — {subtitle}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3B82F6'), spaceAfter=12))

    story.append(Paragraph("1. Product Overview", section_style))
    story.append(Paragraph(description, body_style))

    story.append(Paragraph("2. Export Specifications & Catalog Line", section_style))
    for item in items:
        story.append(Paragraph(f"• {item}", body_style))

    story.append(Paragraph("3. Wholesale Terms & Compliance", section_style))
    story.append(Paragraph("• <b>FOB / CIF Export Tiers:</b> Direct factory pricing with volume discounts on MOQs over 20 units.", body_style))
    story.append(Paragraph("• <b>Custom Branding & Packaging:</b> Custom laser engraving, retail boxes, and multilingual instruction inserts.", body_style))
    story.append(Paragraph("• <b>Quality Certification:</b> Acoustic frequency calibration, metal alloy purity certificates, and customs documentation.", body_style))

    story.append(Paragraph("4. International Trade Desk", section_style))
    story.append(Paragraph("Email: export@himalayanartisans.example | Web: www.himalayanartisans.example", body_style))

    doc.build(story)

def generate_all_pdfs(assets_dir: Path):
    assets_dir.mkdir(parents=True, exist_ok=True)

    # 1. General Company Presentation
    generate_catalog_pdf(
        assets_dir / "company_presentation.pdf",
        "Company Presentation & Export Catalog",
        "Handcrafted Himalayan Sound Instruments & Singing Bowls",
        "We are premier exporters of authentic Himalayan hand-hammered singing bowls, meditation gongs, and sound-therapy accessories. Crafted using traditional 7-metal alloy techniques, our instruments are trusted by wellness centers, yoga studios, and spiritual boutiques across North America, Europe, and Asia-Pacific.",
        [
            "<b>Full Moon Singing Bowls:</b> Crafted under moonlight with superior acoustic resonance and sustained frequency for chakra alignment.",
            "<b>Jambati & Thadobati Bowls:</b> Deep curved traditional shapes offering warm, low-frequency sound baths.",
            "<b>Therapeutic Singing Bowl Sets:</b> 7-piece tuned sets matching standard 432Hz and 528Hz healing frequencies.",
            "<b>Accessories:</b> Suede-wrapped rosewood mallets, silk brocade cushions, and protective travel cases."
        ]
    )

    # 2. Himalayan Sound Healing Bowls
    generate_catalog_pdf(
        assets_dir / "himalayan_sound_healing_bowls_catalog.pdf",
        "Himalayan Sound Healing Bowls Catalog",
        "Acoustic Therapy Grade 7-Metal Instruments",
        "Authentic hand-hammered 7-metal acoustic healing bowls forged in the Himalayas for certified sound therapists, meditation centers, and holistic distributors. Each bowl is individually master-tuned for clinical sound baths and therapeutic acoustic resonance.",
        [
            "<b>Therapy Master Bowls:</b> 10-inch to 14-inch heavy-gauge bowls calibrated for deep vibrational body placement.",
            "<b>7-Chakra Tuned Sets:</b> Harmonically calibrated root to crown octave sets.",
            "<b>Export Packaging:</b> Reinforced wooden crates with custom foam inlays and striker sets included."
        ]
    )

    # 3. Tibetan Singing Bowls
    generate_catalog_pdf(
        assets_dir / "tibetan_singing_bowls_catalog.pdf",
        "Tibetan Singing Bowls Catalog",
        "Traditional Handcrafted Chakra Bowls",
        "Traditional hand-crafted Tibetan singing bowls tuned to fundamental chakra frequencies, suited for Buddhist centers, yoga studios, and spiritual gift retailers with authentic antique brass and bronze finishes.",
        [
            "<b>Mantra Etched Bowls:</b> Traditional Om Mani Padme Hum artisan engravings with long acoustic sustain.",
            "<b>Temple Gong Series:</b> Rich ceremonial sound bowls with suede wrapped strikers.",
            "<b>Gift Box Bundles:</b> Hand-stitched Tibetan silk cushions and presentation gift boxes."
        ]
    )

    # 4. Crystal Singing Bowls
    generate_catalog_pdf(
        assets_dir / "crystal_singing_bowls_catalog.pdf",
        "Crystal Singing Bowls Catalog",
        "High-Purity 432Hz & 528Hz Quartz Instruments",
        "High-purity 99.99% quartz crystal singing bowls tuned precisely to 432Hz and 528Hz solfeggio scales for modern sound baths, holistic clinics, and therapeutic meditation practices.",
        [
            "<b>Frosted Quartz Series:</b> 6-inch to 16-inch high-resonance white frosted quartz bowls.",
            "<b>Rainbow & Alchemy Finishes:</b> Titanium-infused rainbow and gemstone acoustic coatings.",
            "<b>Heavy-Duty Padded Travel Bags:</b> Water-resistant modular carry cases with silicone mallets."
        ]
    )

    # 5. Meditation Bowls
    generate_catalog_pdf(
        assets_dir / "meditation_bowls_catalog.pdf",
        "Meditation Bowls Catalog",
        "Mindfulness Gift & Retail Sets",
        "Compact etched meditation and mindfulness singing bowls with wooden strikers and silk cushions, ideal for retail gift chains, yoga studios, and mindfulness subscription boxes.",
        [
            "<b>Compact 4-Inch Mindfulness Bowls:</b> Lightweight, portable bowls designed for desk meditation and daily ritual.",
            "<b>Color Etched Series:</b> Chakra-themed vibrant matte and gold etched designs.",
            "<b>Retail Ready Packaging:</b> Full color barcode packaging with instructional booklet."
        ]
    )

    # 6. Handcrafted Brass Singing Bowls
    generate_catalog_pdf(
        assets_dir / "handcrafted_brass_singing_bowls_catalog.pdf",
        "Handcrafted Brass Singing Bowls Catalog",
        "Antique Etched Motif Acoustic Series",
        "Heavy-gauge brass alloy singing bowls with antique etched motifs and long sustain, designed for acoustic sound therapy and cultural craft importers seeking museum-grade artisan finishes.",
        [
            "<b>Antique Brass Resonance Bowls:</b> Hand-hammered bell metal brass with warm overtone decay.",
            "<b>Carved Mandala Series:</b> Intricate geometric mandala engravings with solid wood striking mallets.",
            "<b>Distributor Master Carton:</b> Export grade shipping cartons with batch inspection certificates."
        ]
    )

if __name__ == "__main__":
    assets = Path(__file__).resolve().parent
    generate_all_pdfs(assets)
    print(f"All catalog PDFs successfully generated in: {assets}")

