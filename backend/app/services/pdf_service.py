from io import BytesIO
from app.models.resume import Resume


def _try_reportlab(resume: Resume) -> bytes | None:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
    except ImportError:
        return None

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#6366f1")

    name_style = ParagraphStyle("Name", fontSize=20, fontName="Helvetica-Bold",
                                textColor=primary_color, spaceAfter=4, alignment=TA_CENTER)
    contact_style = ParagraphStyle("Contact", fontSize=9, textColor=colors.HexColor("#6b7280"),
                                   spaceAfter=8, alignment=TA_CENTER)
    section_style = ParagraphStyle("Section", fontSize=12, fontName="Helvetica-Bold",
                                   textColor=primary_color, spaceBefore=12, spaceAfter=4)
    body_style = ParagraphStyle("Body", fontSize=10, leading=14, spaceAfter=4)
    item_style = ParagraphStyle("Item", fontSize=10, leading=14, leftIndent=12, spaceAfter=2)

    data = resume.structured_data or {}
    contact = data.get("contact", {})
    story = []

    # Name
    full_name = contact.get("name") or resume.name
    story.append(Paragraph(full_name, name_style))

    # Contact line
    contact_parts = []
    if contact.get("email"):
        contact_parts.append(contact["email"])
    if contact.get("phone"):
        contact_parts.append(contact["phone"])
    if contact.get("location"):
        contact_parts.append(contact["location"])
    if contact.get("linkedin"):
        contact_parts.append(contact["linkedin"])
    if contact_parts:
        story.append(Paragraph("  |  ".join(contact_parts), contact_style))

    story.append(HRFlowable(width="100%", thickness=1, color=primary_color))

    # Summary
    summary = data.get("summary", "")
    if summary:
        story.append(Paragraph("SUMMARY", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 4))
        story.append(Paragraph(str(summary), body_style))

    # Experience
    experience = data.get("experience", [])
    if experience:
        story.append(Paragraph("EXPERIENCE", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 4))
        for exp in experience:
            title = exp.get("title", "")
            company = exp.get("company", "")
            duration = exp.get("duration", "")
            location = exp.get("location", "")
            header = f"<b>{title}</b> — {company}"
            if location:
                header += f", {location}"
            sub = duration
            story.append(Paragraph(header, body_style))
            if sub:
                story.append(Paragraph(f"<i>{sub}</i>", ParagraphStyle("Sub", fontSize=9,
                                       textColor=colors.HexColor("#6b7280"), spaceAfter=2)))
            bullets = exp.get("responsibilities", [])
            for b in bullets[:6]:
                story.append(Paragraph(f"• {b}", item_style))
            story.append(Spacer(1, 4))

    # Education
    education = data.get("education", [])
    if education:
        story.append(Paragraph("EDUCATION", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 4))
        for edu in education:
            degree = edu.get("degree", "")
            institution = edu.get("institution", "")
            year = edu.get("graduation_year", "")
            line = f"<b>{degree}</b>" + (f" — {institution}" if institution else "")
            if year:
                line += f" ({year})"
            story.append(Paragraph(line, body_style))

    # Skills
    skills_data = data.get("skills", {})
    technical = skills_data.get("technical", [])
    soft = skills_data.get("soft", [])
    all_skills = list(technical) + list(soft)
    if all_skills:
        story.append(Paragraph("SKILLS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 4))
        story.append(Paragraph("  •  ".join(str(s) for s in all_skills[:30]), body_style))

    # Projects
    projects = data.get("projects", [])
    if projects:
        story.append(Paragraph("PROJECTS", section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Spacer(1, 4))
        for proj in projects:
            name = proj.get("name", "")
            desc = proj.get("description", "")
            tech = proj.get("technologies", [])
            line = f"<b>{name}</b>"
            if tech:
                line += f" — {', '.join(str(t) for t in tech[:5])}"
            story.append(Paragraph(line, body_style))
            if desc:
                story.append(Paragraph(str(desc)[:300], item_style))

    doc.build(story)
    return buf.getvalue()


def _plain_text_fallback(resume: Resume) -> bytes:
    data = resume.structured_data or {}
    contact = data.get("contact", {})

    lines = []
    lines.append(contact.get("name") or resume.name)
    contact_parts = [v for k, v in contact.items() if k != "name" and v]
    if contact_parts:
        lines.append(" | ".join(str(p) for p in contact_parts))
    lines.append("")

    summary = data.get("summary", "")
    if summary:
        lines += ["SUMMARY", "-" * 40, str(summary), ""]

    for exp in data.get("experience", []):
        lines.append(f"{exp.get('title','')} — {exp.get('company','')} {exp.get('duration','')}")
        for r in exp.get("responsibilities", [])[:4]:
            lines.append(f"  • {r}")
        lines.append("")

    for edu in data.get("education", []):
        lines.append(f"{edu.get('degree','')} — {edu.get('institution','')} {edu.get('graduation_year','')}")
    lines.append("")

    skills_data = data.get("skills", {})
    all_skills = list(skills_data.get("technical", [])) + list(skills_data.get("soft", []))
    if all_skills:
        lines += ["SKILLS", ", ".join(str(s) for s in all_skills[:30]), ""]

    return "\n".join(lines).encode("utf-8")


def generate_resume_pdf(resume: Resume) -> tuple[bytes, str]:
    """Returns (file_bytes, content_type). Tries PDF first, falls back to plain text."""
    pdf_bytes = _try_reportlab(resume)
    if pdf_bytes:
        return pdf_bytes, "application/pdf"
    return _plain_text_fallback(resume), "text/plain"
