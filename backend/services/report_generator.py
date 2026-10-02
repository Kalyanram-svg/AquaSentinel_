import os
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.config import REPORTS_DIR

class ReportGenerator:
    """
    Automated Marine Inspection & Sonar Evidence Report Generator.
    Produces high-fidelity scientific PDFs, structured JSON payloads, and CSV exports.
    """

    @classmethod
    def generate_pdf_report(
        cls,
        survey_data: Dict[str, Any],
        detections: List[Dict[str, Any]],
        output_filename: str = None
    ) -> str:
        if not output_filename:
            output_filename = f"AquaSentinel_Report_{survey_data.get('survey_code', 'SURV-001')}_{int(datetime.utcnow().timestamp())}.pdf"

        file_path = REPORTS_DIR / output_filename
        doc = SimpleDocTemplate(
            str(file_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#041527'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#1d6eb8'),
            fontName='Helvetica'
        )
        section_style = ParagraphStyle(
            'ReportSection',
            parent=styles['Heading2'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#0a2a4d'),
            fontName='Helvetica-Bold'
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1e293b')
        )
        disclaimer_style = ParagraphStyle(
            'ReportDisclaimer',
            parent=styles['Italic'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#64748b')
        )

        elements = []

        # Header Title
        elements.append(Paragraph("AQUASENTINEL | UNDERWATER INTELLIGENCE REPORT", title_style))
        elements.append(Paragraph("SIH26057 • Ministry of Earth Sciences (MoES) Autonomous Sonar Analytics", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#00f0ff'), spaceBefore=2, spaceAfter=12))

        # Survey Summary Table
        elements.append(Paragraph("1. Survey Mission Provenance", section_style))
        survey_table_data = [
            ["Survey Code", survey_data.get("survey_code", "N/A"), "Platform", survey_data.get("platform", "AUV")],
            ["Survey Date", str(survey_data.get("survey_date", datetime.utcnow().strftime("%Y-%m-%d"))), "Sensor Model", survey_data.get("sensor_model", "Klein 3900 SSS")],
            ["Acoustic Freq", f"{survey_data.get('frequency_khz', 455.0)} kHz", "Range / Swath", f"{survey_data.get('range_meters', 75.0)} m"],
            ["Seabed Type", survey_data.get("seabed_type", "Sandy Silt"), "Coordinates", f"{survey_data.get('latitude', 18.9220)}°N, {survey_data.get('longitude', 72.8347)}°E"],
        ]
        t1 = Table(survey_table_data, colWidths=[90, 180, 90, 180])
        t1.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#0f172a')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t1)
        elements.append(Spacer(1, 14))

        # Detection Summary
        elements.append(Paragraph("2. Acoustic Contacts & Anomaly Detections", section_style))
        det_table_data = [["ID", "Detected Class", "Conf", "Est. Length", "Est. Height", "Hazard Score", "Review Status"]]
        for d in detections[:15]:
            det_table_data.append([
                str(d.get("id", "-")),
                d.get("class_name", "Anomaly"),
                f"{round(float(d.get('confidence', 0.0)) * 100, 1)}%",
                f"{d.get('length_meters', '-')} m",
                f"{d.get('estimated_height_m', '-')} m",
                f"{round(float(d.get('hazard_score', 0.5)) * 10, 1)} / 10",
                str(d.get("review_status", "pending")).capitalize()
            ])

        t2 = Table(det_table_data, colWidths=[30, 160, 45, 65, 65, 75, 100])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0a2a4d')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')])
        ]))
        elements.append(t2)
        elements.append(Spacer(1, 16))

        # Scientific Disclaimer & Integrity Notice
        elements.append(Paragraph("3. Scientific Integrity & Operational Limitations", section_style))
        disclaimer_text = (
            "NOTICE: Detections are candidate acoustic observations generated by AquaSentinel AI "
            "and validated through human-in-the-loop inspection. Pixel measurements rely on acoustic "
            "shadow projection trigonometry and nominal sensor altitude calibration. Coordinates are "
            "derived from dead reckoning or acoustic positioning. This document adheres to SIH26057 "
            "and Ministry of Earth Sciences (MoES) auditable data provenance guidelines."
        )
        elements.append(Paragraph(disclaimer_text, disclaimer_style))

        doc.build(elements)
        return f"/api/sonar/reports/{output_filename}"

    @classmethod
    def generate_csv_report(cls, survey_data: Dict[str, Any], detections: List[Dict[str, Any]], filename: str = None) -> str:
        if not filename:
            filename = f"AquaSentinel_Detections_{survey_data.get('survey_code', 'SURV')}_{int(datetime.utcnow().timestamp())}.csv"
        file_path = REPORTS_DIR / filename
        
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Detection_ID", "Survey_Code", "Class_Name", "Confidence",
                "BBox_X", "BBox_Y", "BBox_W", "BBox_H",
                "Length_Meters", "Width_Meters", "Estimated_Height_M", "Shadow_Length_Px",
                "Hazard_Score", "Hazard_Type", "Uncertainty_Score",
                "Review_Status", "Reviewed_Class", "Model_Version", "Timestamp"
            ])
            for d in detections:
                writer.writerow([
                    d.get("id"), survey_data.get("survey_code"), d.get("class_name"), d.get("confidence"),
                    d.get("bbox_x"), d.get("bbox_y"), d.get("bbox_w"), d.get("bbox_h"),
                    d.get("length_meters"), d.get("width_meters"), d.get("estimated_height_m"), d.get("shadow_length_px"),
                    d.get("hazard_score"), d.get("hazard_type"), d.get("uncertainty_score"),
                    d.get("review_status"), d.get("reviewed_class"), d.get("model_version"), datetime.utcnow().isoformat()
                ])
        return f"/api/sonar/reports/{filename}"

    @classmethod
    def generate_json_report(cls, survey_data: Dict[str, Any], detections: List[Dict[str, Any]], filename: str = None) -> str:
        if not filename:
            filename = f"AquaSentinel_Report_{survey_data.get('survey_code', 'SURV')}_{int(datetime.utcnow().timestamp())}.json"
        file_path = REPORTS_DIR / filename
        
        payload = {
            "metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "system": "AquaSentinel Underwater Intelligence Platform",
                "version": "1.0.0",
                "problem_statement": "SIH26057 - Ministry of Earth Sciences (MoES)"
            },
            "survey": survey_data,
            "detection_count": len(detections),
            "detections": detections
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
            
        return f"/api/sonar/reports/{filename}"
