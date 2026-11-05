
from io import BytesIO
from datetime import datetime

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)


def generate_pdf_report(
    original_df,
    cleaned_df,
    before_summary,
    after_summary,
    before_score,
    after_score,
    outlier_report,
    audit
):
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            fontSize=19,
            leading=24,
            textColor=colors.HexColor("#12304A"),
            alignment=TA_CENTER,
            spaceAfter=15
        )
    )

    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=colors.HexColor("#2563A6"),
            spaceBefore=15,
            spaceAfter=9
        )
    )

    story = []

    def heading(text):
        story.append(
            Paragraph(text, styles["SectionHeading"])
        )

    def add_table(data, widths=None):
        table = Table(
            data,
            colWidths=widths,
            repeatRows=1,
            hAlign="LEFT"
        )

        table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#12304A")),
                ("TEXTCOLOR", (0, 0), (-1, 0),
                 colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1),
                 [colors.white, colors.HexColor("#F1F6FA")]),
                ("GRID", (0, 0), (-1, -1),
                 0.3, colors.HexColor("#D9E3EC")),
                ("FONTNAME", (0, 0), (-1, 0),
                 "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 9)
            ])
        )

        story.append(table)
        story.append(Spacer(1, 12))

    # Report Title

    story.append(
        Paragraph(
            "DATA QUALITY ASSESSMENT REPORT",
            styles["ReportTitle"]
        )
    )

    story.append(
        Paragraph(
            "Universal Data Quality System",
            styles["Normal"]
        )
    )

    story.append(Spacer(1, 10))

    story.append(
        Paragraph(
            f"Generated: {datetime.now():%Y-%m-%d %H:%M}",
            styles["Normal"]
        )
    )

    # Dataset Overview

    heading("1. Dataset Overview")

    add_table([
        ["Metric", "Value"],
        ["Original Records", str(len(original_df))],
        ["Cleaned Records", str(len(cleaned_df))],
        ["Total Columns", str(len(original_df.columns))]
    ])

    # Quality Score

    heading("2. Data Quality Score")

    add_table([
        ["Stage", "Quality Score"],
        ["Before Cleaning", f"{before_score:.2f}%"],
        ["After Cleaning", f"{after_score:.2f}%"]
    ])

    story.append(
        Paragraph(
            "Illustrative score: 70% completeness "
            "and 30% row uniqueness.",
            styles["Normal"]
        )
    )

    # Quality Issues

    heading("3. Data Quality Issues")

    add_table([
        ["Issue", "Before", "After"],
        [
            "Missing Cells",
            str(before_summary["missing_cells"]),
            str(after_summary["missing_cells"])
        ],
        [
            "Duplicate Rows",
            str(before_summary["duplicate_rows"]),
            str(after_summary["duplicate_rows"])
        ]
    ])

    # Outliers

    heading("4. Potential Outliers")

    if not outlier_report.empty:

        outlier_data = [
            ["Column", "Outlier Count", "Outlier %"]
        ]

        for _, row in outlier_report.iterrows():
            outlier_data.append([
                str(row["Column"]),
                str(row["Outlier Count"]),
                str(row["Outlier %"]) + "%"
            ])

        add_table(outlier_data)

    else:
        story.append(
            Paragraph(
                "No potential outliers were reported "
                "by the IQR analysis.",
                styles["Normal"]
            )
        )

    story.append(
        Paragraph(
            "Outliers require review and are not "
            "automatically treated as errors.",
            styles["Normal"]
        )
    )

    # Cleaning Audit

    heading("5. Cleaning Audit Summary")

    story.append(
        Paragraph(
            f"Total audit entries: {len(audit)}",
            styles["Normal"]
        )
    )

    if not audit.empty and "Action" in audit.columns:

        actions = audit["Action"].value_counts()

        action_data = [
            ["Cleaning Action", "Count"]
        ]

        for action, count in actions.items():
            action_data.append([
                str(action),
                str(count)
            ])

        add_table(action_data)

    else:
        story.append(
            Paragraph(
                "No cleaning changes were logged.",
                styles["Normal"]
            )
        )

    # Recommendations

    heading("6. Recommendations")

    recommendations = []

    if after_summary["missing_cells"] > 0:
        recommendations.append(
            "Review remaining missing values "
            "before further analysis."
        )

    if after_summary["duplicate_rows"] > 0:
        recommendations.append(
            "Investigate remaining duplicate records."
        )

    if not outlier_report.empty:
        recommendations.append(
            "Review unusual numeric values "
            "using domain knowledge."
        )

    if len(cleaned_df) < len(original_df):
        recommendations.append(
            "Verify that removed duplicate records "
            "were unnecessary."
        )

    if not recommendations:
        recommendations.append(
            "No additional issues were identified "
            "by the included checks."
        )

    for item in recommendations:
        story.append(
            Paragraph(
                "- " + item,
                styles["Normal"]
            )
        )
        story.append(Spacer(1, 7))

    # Final Note

    story.append(Spacer(1, 20))

    story.append(
        Paragraph(
            "This report is automatically generated. "
            "Its findings depend on the implemented "
            "validation rules and should be reviewed "
            "before making business decisions.",
            styles["Normal"]
        )
    )

    document.build(story)

    buffer.seek(0)

    return buffer.getvalue()
