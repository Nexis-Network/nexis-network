from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer
from reportlab.platypus import Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "docs/reports/solana-agentkit-feature-gap-matrix.json"
OUTPUT_PATH = ROOT / "output/pdf/solana-agentkit-feature-gap-matrix.pdf"
STATUS_COLORS = {
    "Live": colors.HexColor("#1f7a45"),
    "Partial": colors.HexColor("#a05a00"),
    "Missing": colors.HexColor("#b42318"),
    "Env-dependent": colors.HexColor("#175cd3"),
}


def load_document() -> dict:
    return json.loads(DATA_PATH.read_text())


def styles() -> dict:
    sheet = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "MatrixTitle",
            parent=sheet["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=colors.HexColor("#111827"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "MatrixSubtitle",
            parent=sheet["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=13,
            textColor=colors.HexColor("#475467"),
            spaceAfter=10,
        ),
        "section": ParagraphStyle(
            "MatrixSection",
            parent=sheet["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#1f2937"),
            spaceBefore=8,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "MatrixBody",
            parent=sheet["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#344054"),
        ),
        "small": ParagraphStyle(
            "MatrixSmall",
            parent=sheet["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#475467"),
        ),
        "card_label": ParagraphStyle(
            "CardLabel",
            parent=sheet["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#475467"),
        ),
        "card_value": ParagraphStyle(
            "CardValue",
            parent=sheet["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=colors.HexColor("#101828"),
        ),
    }


def p(text: str, style: ParagraphStyle) -> Paragraph:
    escaped = (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )
    return Paragraph(escaped, style)


def build_cards(items: list[dict], doc: SimpleDocTemplate, palette: dict) -> Table:
    width = (doc.width - 18) / 3
    rows = []
    cards = [
        [
            p(item["label"], palette["card_label"]),
            p(item["value"], palette["card_value"]),
            p(item["body"], palette["body"]),
        ]
        for item in items
    ]
    for index in range(0, len(cards), 3):
        row = cards[index : index + 3]
        while len(row) < 3:
            row.append([p("", palette["card_label"]), p("", palette["card_value"]), p("", palette["body"])])
        rows.append(row)
    table = Table(rows, colWidths=[width, width, width], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d5dd")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#e2e8f0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def build_table(section: dict, doc: SimpleDocTemplate, palette: dict) -> LongTable:
    widths = section.get("columnWidths")
    if widths:
        col_widths = [doc.width * value for value in widths]
    else:
        count = len(section["columns"])
        col_widths = [doc.width / count] * count
    data = [[p(text, palette["small"]) for text in section["columns"]]]
    for row in section["rows"]:
        data.append([p(cell, palette["body"]) for cell in row])
    table = LongTable(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d0d5dd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(1, len(data)):
        bg = colors.HexColor("#ffffff") if row_index % 2 else colors.HexColor("#f8fafc")
        style.append(("BACKGROUND", (0, row_index), (-1, row_index), bg))
    status_column = section.get("statusColumn")
    if status_column is not None:
        for row_index, row in enumerate(section["rows"], start=1):
            status = row[status_column]
            style.append(("FONTNAME", (status_column, row_index), (status_column, row_index), "Helvetica-Bold"))
            style.append(
                (
                    "TEXTCOLOR",
                    (status_column, row_index),
                    (status_column, row_index),
                    STATUS_COLORS.get(status, colors.HexColor("#344054")),
                )
            )
    table.setStyle(TableStyle(style))
    return table


def header_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#667085"))
    canvas.drawString(doc.leftMargin, doc.height + doc.topMargin + 0.18 * inch, "Solana AgentKit Feature Coverage Matrix")
    canvas.drawRightString(
        doc.pagesize[0] - doc.rightMargin,
        doc.height + doc.topMargin + 0.18 * inch,
        doc.generated_label,
    )
    canvas.line(
        doc.leftMargin,
        doc.height + doc.topMargin + 0.12 * inch,
        doc.pagesize[0] - doc.rightMargin,
        doc.height + doc.topMargin + 0.12 * inch,
    )
    canvas.drawString(doc.leftMargin, 0.42 * inch, "Nex-T1 Enterprise - AI SDK V6 + embedded wallets, markets, governance, exchanges, and explorers")
    canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.42 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_story(document: dict, doc: SimpleDocTemplate) -> list:
    palette = styles()
    story = [
        p(document["title"], palette["title"]),
        p(document["subtitle"], palette["subtitle"]),
        build_cards(document["summaryCards"], doc, palette),
        Spacer(1, 0.18 * inch),
        p(document["statusLegend"], palette["small"]),
        Spacer(1, 0.12 * inch),
    ]
    for section in document["sections"]:
        story.append(p(section["title"], palette["section"]))
        story.append(build_table(section, doc, palette))
        story.append(Spacer(1, 0.12 * inch))
    story.append(p("Key Takeaways", palette["section"]))
    for takeaway in document["takeaways"]:
        story.append(p(f"• {takeaway}", palette["body"]))
        story.append(Spacer(1, 0.04 * inch))
    story.append(Spacer(1, 0.08 * inch))
    story.append(p("Reference sources", palette["section"]))
    story.append(p("\n".join(document["references"]), palette["small"]))
    return story


def main() -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    document = load_document()
    generated_label = datetime.now(timezone.utc).strftime("Generated %Y-%m-%d %H:%M UTC")
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=landscape(letter),
        leftMargin=0.48 * inch,
        rightMargin=0.48 * inch,
        topMargin=0.64 * inch,
        bottomMargin=0.62 * inch,
    )
    doc.generated_label = generated_label
    doc.build(
        build_story(document, doc),
        onFirstPage=header_footer,
        onLaterPages=header_footer,
    )
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
