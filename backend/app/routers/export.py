"""
Export Router - Generare rapoarte PDF pentru jucatori.
"""
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

from app.database import get_db
from app.models import Player, Injury, SeasonStat
from app.ml.predictor import predictor, risk_category

router = APIRouter(prefix="/api/export", tags=["Export"])


def _color_for_score(score: float) -> HexColor:
    """Return background color based on risk score."""
    if score < 25:
        return HexColor("#10b981")
    elif score < 50:
        return HexColor("#f59e0b")
    elif score < 75:
        return HexColor("#ef4444")
    else:
        return HexColor("#7c3aed")


def _build_pdf(player, injuries, latest_stat, prediction, injury_summary, shap_values) -> bytes:
    """Build a PDF report and return as bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    elements = []

    # -- Custom styles --
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=HexColor("#1e293b"),
        spaceAfter=2 * mm,
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#64748b"),
        alignment=TA_CENTER,
        spaceAfter=6 * mm,
    )
    section_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=HexColor("#1e40af"),
        spaceBefore=8 * mm,
        spaceAfter=3 * mm,
        borderPadding=(0, 0, 2, 0),
    )
    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontSize=9,
        textColor=HexColor("#64748b"),
    )
    value_style = ParagraphStyle(
        "Value",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#1e293b"),
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=9,
        textColor=HexColor("#334155"),
        leading=13,
    )
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=HexColor("#94a3b8"),
        alignment=TA_CENTER,
    )

    page_width = A4[0] - 4 * cm  # usable width

    # ===================== HEADER =====================
    now = datetime.now().strftime("%d.%m.%Y, %H:%M")
    elements.append(Paragraph("Raport Risc Accidentare", title_style))
    elements.append(Paragraph(f"FootballRisk Analytics &bull; Generat: {now}", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=HexColor("#cbd5e1")))
    elements.append(Spacer(1, 4 * mm))

    # ===================== PLAYER INFO =====================
    elements.append(Paragraph("Informatii Jucator", section_style))

    p = player
    bmi_str = f"{p.bmi:.1f}" if p.bmi else "N/A"
    fitness_str = f"{p.scor_fitness:.0f}" if p.scor_fitness else "N/A"

    info_data = [
        [
            Paragraph("Nume", label_style),
            Paragraph("Club", label_style),
            Paragraph("Pozitie", label_style),
            Paragraph("Nationalitate", label_style),
        ],
        [
            Paragraph(p.nume or "N/A", value_style),
            Paragraph(p.club or "N/A", value_style),
            Paragraph(p.pozitie or "N/A", value_style),
            Paragraph(p.nationalitate or "N/A", value_style),
        ],
        [
            Paragraph("Varsta", label_style),
            Paragraph("Inaltime", label_style),
            Paragraph("Greutate", label_style),
            Paragraph("BMI", label_style),
        ],
        [
            Paragraph(f"{p.varsta} ani" if p.varsta else "N/A", value_style),
            Paragraph(f"{p.inaltime_cm:.0f} cm" if p.inaltime_cm else "N/A", value_style),
            Paragraph(f"{p.greutate_kg:.0f} kg" if p.greutate_kg else "N/A", value_style),
            Paragraph(bmi_str, value_style),
        ],
        [
            Paragraph("Scor Fitness", label_style),
            Paragraph("Experienta", label_style),
            Paragraph("", label_style),
            Paragraph("", label_style),
        ],
        [
            Paragraph(fitness_str, value_style),
            Paragraph(f"{p.ani_experienta_pro} ani" if p.ani_experienta_pro else "N/A", value_style),
            Paragraph("", value_style),
            Paragraph("", value_style),
        ],
    ]
    col_w = page_width / 4
    info_table = Table(info_data, colWidths=[col_w] * 4)
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(info_table)

    # ===================== RISK SCORE =====================
    elements.append(Paragraph("Scor de Risc", section_style))

    risk_score = prediction["risk_score"]
    risk_level = prediction["risk_level"]
    bg_color = _color_for_score(risk_score)

    score_data = [[
        Paragraph(
            f'<font size="24" color="white"><b>{risk_score}</b></font>'
            f'<font size="10" color="white"> / 100</font>',
            ParagraphStyle("ScoreVal", alignment=TA_CENTER),
        ),
    ], [
        Paragraph(
            f'<font size="11" color="white">Nivel: {risk_level}</font>',
            ParagraphStyle("ScoreLvl", alignment=TA_CENTER),
        ),
    ]]
    score_table = Table(score_data, colWidths=[page_width * 0.4])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (0, 0), 10),
        ("BOTTOMPADDING", (-1, -1), (-1, -1), 8),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    # Wrap in outer table to centre it
    wrapper = Table([[score_table]], colWidths=[page_width])
    wrapper.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    elements.append(wrapper)

    # ===================== MULTI-HORIZON PREDICTIONS =====================
    horizons = prediction.get("horizons", [])
    if horizons:
        elements.append(Paragraph("Predictii Multi-Orizont", section_style))

        h_header = [
            Paragraph("<b>Orizont</b>", body_style),
            Paragraph("<b>Scor Risc</b>", body_style),
            Paragraph("<b>Nivel</b>", body_style),
        ]
        h_rows = [h_header]
        for h in horizons:
            h_rows.append([
                Paragraph(h["label"], body_style),
                Paragraph(str(h["risk_score"]), body_style),
                Paragraph(h["risk_level"], body_style),
            ])

        h_table = Table(h_rows, colWidths=[page_width * 0.33] * 3)
        h_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#e2e8f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(h_table)

    # ===================== INJURY HISTORY SUMMARY =====================
    elements.append(Paragraph("Sumar Istoric Accidentari", section_style))

    total_inj = injury_summary["total"]
    severe_inj = injury_summary["serious"]
    total_days = injury_summary["total_days"]
    avg_recovery = injury_summary["avg_days"]
    recurrence_rate = round(injury_summary["recurrences"] / max(total_inj, 1) * 100, 1)

    inj_data = [
        [
            Paragraph("Total Accidentari", label_style),
            Paragraph("Accidentari Severe", label_style),
            Paragraph("Zile Absenta (total)", label_style),
        ],
        [
            Paragraph(str(total_inj), value_style),
            Paragraph(str(severe_inj), value_style),
            Paragraph(str(total_days), value_style),
        ],
        [
            Paragraph("Recuperare Medie", label_style),
            Paragraph("Rata Recidiva", label_style),
            Paragraph("", label_style),
        ],
        [
            Paragraph(f"{avg_recovery} zile", value_style),
            Paragraph(f"{recurrence_rate}%", value_style),
            Paragraph("", value_style),
        ],
    ]
    inj_col_w = page_width / 3
    inj_table = Table(inj_data, colWidths=[inj_col_w] * 3)
    inj_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(inj_table)

    # ===================== TOP RISK FACTORS (SHAP) =====================
    if shap_values:
        elements.append(Paragraph("Top Factori de Risc", section_style))
        top_shap = sorted(shap_values, key=lambda x: abs(x["shap_value"]), reverse=True)[:6]

        shap_header = [
            Paragraph("<b>Factor</b>", body_style),
            Paragraph("<b>Valoare Jucator</b>", body_style),
            Paragraph("<b>Importanta (SHAP)</b>", body_style),
        ]
        shap_rows = [shap_header]
        for sv in top_shap:
            direction = "+" if sv["shap_value"] > 0 else ""
            shap_rows.append([
                Paragraph(sv["feature"], body_style),
                Paragraph(str(sv["feature_value"]), body_style),
                Paragraph(f"{direction}{sv['shap_value']:.4f}", body_style),
            ])

        shap_table = Table(shap_rows, colWidths=[page_width * 0.45, page_width * 0.25, page_width * 0.30])
        shap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#e2e8f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e1")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(shap_table)

    # ===================== RECOMMENDATIONS =====================
    recs = prediction.get("recommendations", [])
    if recs:
        elements.append(Paragraph("Recomandari", section_style))
        for i, rec in enumerate(recs, 1):
            text = rec.get("text", "")
            elements.append(Paragraph(f"{i}. {text}", body_style))
            elements.append(Spacer(1, 2 * mm))

    # ===================== FOOTER =====================
    elements.append(Spacer(1, 10 * mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#cbd5e1")))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(
        "Generated by FootballRisk Analytics - Lucrare de Licenta 2026",
        footer_style,
    ))

    doc.build(elements)
    buf.seek(0)
    return buf.getvalue()


@router.get("/player/{player_id}/pdf")
def export_player_pdf(player_id: str, db: Session = Depends(get_db)):
    """Generate and download a PDF risk report for a player."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    # Fetch player
    player = db.query(Player).filter(Player.player_id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    # Latest season stats
    latest_stat = (
        db.query(SeasonStat)
        .filter(SeasonStat.player_id == player_id)
        .order_by(SeasonStat.sezon.desc())
        .first()
    )

    # Injuries
    injuries = db.query(Injury).filter(Injury.player_id == player_id).all()
    total_injuries = len(injuries)
    total_days = sum(inj.zile_absenta or 0 for inj in injuries)
    serious_injuries = [inj for inj in injuries if (inj.zile_absenta or 0) > 28]
    recurrences = sum(1 for inj in injuries if inj.recidiva == "Da")

    injury_summary = {
        "total": total_injuries,
        "serious": len(serious_injuries),
        "total_days": total_days,
        "recurrences": recurrences,
        "avg_days": round(total_days / max(total_injuries, 1), 1),
    }

    # Build input data for prediction (same logic as players router)
    input_data = {
        "varsta": player.varsta or 25,
        "bmi": player.bmi or 23.0,
        "ani_experienta_pro": player.ani_experienta_pro or 5,
        "scor_fitness": player.scor_fitness or 75,
        "pozitie": player.pozitie or "ST",
        "inaltime_cm": player.inaltime_cm or 180,
        "greutate_kg": player.greutate_kg or 75,
        "minute_jucate": latest_stat.minute_jucate if latest_stat else 2000,
        "meciuri_jucate": latest_stat.meciuri_jucate if latest_stat else 25,
        "distanta_totala_km": latest_stat.distanta_totala_km if latest_stat else 300,
        "sprinturi_totale": latest_stat.sprinturi_totale if latest_stat else 1500,
        "indice_incarcare": latest_stat.indice_incarcare if latest_stat else 60,
        "cartonase_galbene": latest_stat.cartonase_galbene if latest_stat else 3,
        "total_prev_injuries": total_injuries,
        "injury_frequency": total_injuries / max(player.ani_experienta_pro or 1, 1),
        "avg_days_absent": total_days / max(total_injuries, 1),
        "max_severity_prev": max((inj.zile_absenta or 0) for inj in injuries) if injuries else 0,
        "recurrence_rate": recurrences / max(total_injuries, 1),
    }

    prediction = predictor.predict(input_data)
    shap_values = prediction.get("shap_values")

    # Build PDF
    pdf_bytes = _build_pdf(player, injuries, latest_stat, prediction, injury_summary, shap_values)

    safe_name = (player.nume or "player").replace(" ", "_")
    filename = f"raport_risc_{safe_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
