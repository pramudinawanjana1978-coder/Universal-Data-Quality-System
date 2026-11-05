from pdf_report import generate_pdf_report
import hashlib
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from universal_cleaner import (
    analyze_data,
    clean_data,
    clean_missing_values,
    calculate_quality_score,
    recommend_cleaning_methods,
    detect_outliers,
    validate_data_rules
)


# --------------------------------------------------
# Page Configuration
# --------------------------------------------------

st.set_page_config(
    page_title="Universal Data Quality",
    layout="wide"
)


# --------------------------------------------------
# Session State
# --------------------------------------------------

if "cleaning_results" not in st.session_state:
    st.session_state.cleaning_results = None

if "uploaded_dataset_id" not in st.session_state:
    st.session_state.uploaded_dataset_id = None


# --------------------------------------------------
# Dashboard Styling
# --------------------------------------------------

css_path = Path(__file__).parent / "styles.css"

if css_path.exists():
    st.markdown(
        f"<style>{css_path.read_text(encoding='utf-8')}</style>",
        unsafe_allow_html=True
    )


def style_table(dataframe):
    return dataframe.style.set_table_styles([
        {
            "selector": "thead th",
            "props": [
                ("background-color", "#12304A"),
                ("color", "#FFFFFF"),
                ("font-weight", "600")
            ]
        },
        {
            "selector": "tbody tr:nth-child(even) td",
            "props": [
                ("background-color", "#F4F8FC")
            ]
        },
        {
            "selector": "tbody tr:nth-child(odd) td",
            "props": [
                ("background-color", "#FFFFFF")
            ]
        },
        {
            "selector": "td",
            "props": [
                ("color", "#18324A"),
                ("border-color", "#E1EAF2")
            ]
        }
    ])


# --------------------------------------------------
# Main Dashboard
# --------------------------------------------------

st.title("Universal Data Quality System")

st.write(
    "Upload a CSV dataset, identify data quality issues, "
    "apply cleaning methods and review the results."
)

uploaded_file = st.file_uploader(
    "Upload your CSV dataset",
    type=["csv"]
)


if uploaded_file is not None:

    try:

        # ------------------------------------------
        # Load Dataset
        # ------------------------------------------

        dataset_id = hashlib.sha256(
            uploaded_file.getvalue()
        ).hexdigest()

        if st.session_state.uploaded_dataset_id != dataset_id:
            st.session_state.cleaning_results = None
            st.session_state.uploaded_dataset_id = dataset_id

        df = pd.read_csv(uploaded_file)

        st.success("Dataset uploaded successfully!")

        st.write(
            f"Records: {len(df):,} | "
            f"Columns: {len(df.columns)}"
        )

        with st.expander("Preview Original Dataset"):
            st.dataframe(
                df.head(100),
                width="stretch"
            )

        # ------------------------------------------
        # Data Quality Analysis
        # ------------------------------------------

        summary, report = analyze_data(df)

        quality_score = calculate_quality_score(df)

        st.subheader("Data Quality Score")

        st.metric(
            "Overall Quality Score",
            f"{quality_score}%"
        )

        st.progress(
            min(max(quality_score / 100, 0.0), 1.0)
        )

        st.caption(
            "Score based on 70% completeness "
            "and 30% row uniqueness."
        )

        st.subheader("Data Quality Overview")

        c1, c2, c3, c4 = st.columns(4)

        c1.metric("Total Records", summary["total_rows"])
        c2.metric("Total Columns", summary["total_columns"])
        c3.metric("Missing Cells", summary["missing_cells"])
        c4.metric("Duplicate Rows", summary["duplicate_rows"])

        st.subheader("Column Quality Report")

        st.dataframe(
            style_table(report),
            width="stretch"
        )
        
        # ------------------------------------------
        # Data Validation Rules
        # ------------------------------------------

        st.subheader("Data Validation Rules")

        st.write(
            "Identify potential data validation issues "
            "before cleaning."
        )

        validation_report = validate_data_rules(df)

        if not validation_report.empty:

            st.warning(
                f"{len(validation_report)} potential "
                "validation issues detected."
            )

            issue_summary = (
                validation_report["Issue"]
                .value_counts()
                .reset_index()
            )

            issue_summary.columns = [
                "Issue Type",
                "Count"
            ]

            st.subheader("Validation Summary")

            st.dataframe(
                issue_summary,
                width="stretch",
                hide_index=True
            )



            
            # Validation Issue Filtering

            st.subheader("Validation Issue Details")

            issue_types = sorted(
                validation_report["Issue"].dropna().unique().tolist()
            )

            selected_issues = st.multiselect(
                "Filter by Issue Type",
                options=issue_types,
                default=issue_types,
                key="validation_issue_filter"
            )

            filtered_report = validation_report[
                validation_report["Issue"].isin(selected_issues)
            ].copy()

            st.metric(
                "Matching Validation Issues",
                len(filtered_report)
            )

            st.dataframe(
                filtered_report,
                width="stretch",
                hide_index=True
            )


            st.download_button(
                "Download Validation Report",
                data=validation_report.to_csv(index=False),
                file_name="validation_report.csv",
                mime="text/csv",
                key="download_validation_report"
            )

        else:

            st.success(
                "No issues detected by the "
                "configured validation rules."
            )

        # ------------------------------------------
        # Outlier Detection
        # ------------------------------------------

        st.subheader("Outlier Detection")

        st.write(
            "Identify potential outliers using "
            "the Interquartile Range (IQR) method."
        )


        outlier_report = detect_outliers(df)

        if not outlier_report.empty:

            st.dataframe(
                outlier_report,
                width="stretch",
                hide_index=True
            )

            selected_column = st.selectbox(
                "Select a column to view its distribution",
                outlier_report["Column"].tolist(),
                key="outlier_column"
            )

            fig_outlier = px.box(
                df,
                y=selected_column,
                points="outliers",
                title=f"Outlier Analysis: {selected_column}"
            )

            fig_outlier.update_layout(
                template="plotly_white",
                paper_bgcolor="#FFFFFF",
                plot_bgcolor="#FFFFFF",
                font_color="#12304A",
                height=400
            )

            fig_outlier.update_traces(
                marker_color="#0D9488",
                line_color="#2563A6"
            )

            st.plotly_chart(
                fig_outlier,
                width="stretch"
            )

            
            # Outlier Details Table

            st.subheader("Outlier Details")

            values = pd.to_numeric(
                df[selected_column],
                errors="coerce"
            )

            valid_values = values.dropna()

            q1 = valid_values.quantile(0.25)
            q3 = valid_values.quantile(0.75)
            iqr = q3 - q1

            if len(valid_values) >= 4 and iqr > 0:

                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr

                mask = (
                    (values < lower) |
                    (values > upper)
                )

                outlier_details = pd.DataFrame({
                    "Row Number": df.index[mask] + 1,
                    "Column": selected_column,
                    "Value": values[mask].values,
                    "Status": "Review"
                })

                st.metric(
                    "Potential Outliers",
                    len(outlier_details)
                )

                if not outlier_details.empty:

                    st.dataframe(
                        outlier_details,
                        width="stretch",
                        hide_index=True
                    )

                    st.download_button(
                        "Download Outlier Report",
                        data=outlier_details.to_csv(index=False),
                        file_name="outlier_report.csv",
                        mime="text/csv",
                        key="download_outlier_report"
                    )

                else:
                    st.success(
                        "No outliers found in this column."
                    )

            st.caption(
                "Outliers are flagged for review. "
                "No records are automatically removed."
            )

        else:
            st.info(
                "No suitable numeric columns found "
                "for IQR analysis."
            )

        # ------------------------------------------
        # Missing Values Chart
        # ------------------------------------------

        st.subheader("Missing Values by Column")

        if summary["missing_cells"] > 0:

            show_all = st.checkbox(
                "View all columns",
                value=False
            )

            missing_chart = report[
                report["Missing Values"] > 0
            ].copy()

            if not show_all:
                missing_chart = missing_chart.nlargest(
                    10,
                    "Missing Values"
                )

            missing_chart = missing_chart.sort_values(
                "Missing Values",
                ascending=True
            )

            missing_chart["Chart Label"] = (
                missing_chart.apply(
                    lambda row: (
                        f"{int(row['Missing Values']):,} "
                        f"({row['Missing %']:.2f}%)"
                    ),
                    axis=1
                )
            )

            fig_missing = px.bar(
                missing_chart,
                x="Missing Values",
                y="Column",
                orientation="h",
                color="Missing %",
                color_continuous_scale=[
                    "#12304A",
                    "#2563A6",
                    "#0D9488"
                ],
                text="Chart Label",
                title="Missing Values Distribution"
            )

            fig_missing.update_layout(
                template="plotly_white",
                paper_bgcolor="#FFFFFF",
                plot_bgcolor="#FFFFFF",
                font_color="#18324A",
                coloraxis_showscale=False,
                height=min(
                    560,
                    max(250, len(missing_chart) * 34 + 70)
                ),
                margin=dict(
                    l=20,
                    r=100,
                    t=50,
                    b=30
                )
            )

            fig_missing.update_traces(
                textposition="outside",
                cliponaxis=False
            )

            st.plotly_chart(
                fig_missing,
                width="stretch"
            )

        else:
            st.success("No missing values found.")

        # ------------------------------------------
        # Cleaning Options
        # ------------------------------------------

        st.subheader("Select Cleaning Options")

        trim = st.checkbox(
            "Remove unnecessary spaces",
            value=True
        )

        duplicates = st.checkbox(
            "Remove exact duplicate rows",
            value=False
        )

        # ------------------------------------------
        # Cleaning Recommendations
        # ------------------------------------------

        st.subheader("Cleaning Recommendations")

        recommendations = recommend_cleaning_methods(df)

        if not recommendations.empty:

            st.dataframe(
                recommendations,
                width="stretch",
                hide_index=True
            )

            st.caption(
                "These are rule-based suggestions. "
                "Review them before cleaning."
            )

        else:
            st.success("No missing values detected.")

        # ------------------------------------------
        # Smart Missing Value Cleaning
        # ------------------------------------------

        st.subheader("Smart Missing Value Cleaning")

        st.write(
            "Choose how to handle missing values "
            "for each column."
        )

        cleaning_rules = {}

        missing_columns = [
            col for col in df.columns
            if df[col].isna().any()
        ]

        for column in missing_columns:

            if pd.api.types.is_numeric_dtype(df[column]):
                options = [
                    "Keep Missing",
                    "Mean",
                    "Median",
                    "Mode"
                ]
            else:
                options = [
                    "Keep Missing",
                    "Mode",
                    "Unknown"
                ]

            method = st.selectbox(
                f"{column} ({df[column].isna().sum()} missing)",
                options,
                key=f"missing_{column}"
            )

            if method != "Keep Missing":

                cleaning_rules[column] = method

                if method == "Mean":
                    preview_value = df[column].mean()

                elif method == "Median":
                    preview_value = df[column].median()

                elif method == "Mode":
                    modes = df[column].mode(dropna=True)
                    preview_value = (
                        modes.iloc[0]
                        if not modes.empty
                        else None
                    )

                else:
                    preview_value = "Unknown"

                if (
                    preview_value is not None
                    and pd.notna(preview_value)
                ):
                    st.info(
                        f"Replacement Preview: "
                        f"{preview_value}"
                    )

        # ------------------------------------------
        # Run Cleaning
        # ------------------------------------------

        if st.button(
            "Run Safe Cleaning",
            type="primary"
        ):

            cleaned, audit = clean_data(
                df,
                trim_spaces=trim,
                remove_duplicates=duplicates,
                fill_missing=False
            )

            cleaned, missing_audit = clean_missing_values(
                cleaned,
                cleaning_rules
            )

            audit = pd.concat(
                [audit, missing_audit],
                ignore_index=True
            )

            after_summary, after_report = analyze_data(
                cleaned
            )

            after_score = calculate_quality_score(cleaned)

            comparison = pd.DataFrame({
                "Metric": [
                    "Total Records",
                    "Missing Cells",
                    "Duplicate Rows"
                ],
                "Before": [
                    summary["total_rows"],
                    summary["missing_cells"],
                    summary["duplicate_rows"]
                ],
                "After": [
                    after_summary["total_rows"],
                    after_summary["missing_cells"],
                    after_summary["duplicate_rows"]
                ]
            })

            # Save results for future reruns

            st.session_state.cleaning_results = {
                "cleaned": cleaned,
                "audit": audit,
                "after_report": after_report,
                "comparison": comparison,
                "before_score": quality_score,
                "after_score": after_score
            }

        # ------------------------------------------
        # Display Saved Cleaning Results
        # ------------------------------------------

        results = st.session_state.cleaning_results

        if results is not None:

            cleaned = results["cleaned"]
            audit = results["audit"]
            after_report = results["after_report"]
            comparison = results["comparison"]

            # Quality Score Comparison

            st.subheader("Quality Score Comparison")

            score_col1, score_col2 = st.columns(2)

            with score_col1:
                st.metric(
                    "Before Cleaning",
                    f"{results['before_score']}%"
                )

            with score_col2:
                st.metric(
                    "After Cleaning",
                    f"{results['after_score']}%",
                    delta=(
                        f"{results['after_score'] - results['before_score']:+.2f} pp"
                    )
                )

            # Before vs After Summary

            st.subheader("Before vs After")

            st.dataframe(
                style_table(comparison),
                width="stretch",
                hide_index=True
            )

            # Cleaning Impact Chart

            st.subheader("Cleaning Impact Analysis")

            chart_data = comparison.melt(
                id_vars="Metric",
                value_vars=["Before", "After"],
                var_name="Stage",
                value_name="Count"
            )

            fig_comparison = px.bar(
                chart_data,
                x="Metric",
                y="Count",
                color="Stage",
                barmode="group",
                text="Count",
                color_discrete_map={
                    "Before": "#2563A6",
                    "After": "#0D9488"
                },
                title="Data Quality: Before vs After"
            )

            fig_comparison.update_layout(
                template="plotly_white",
                paper_bgcolor="#FFFFFF",
                plot_bgcolor="#FFFFFF",
                font_color="#12304A",
                height=420
            )

            st.plotly_chart(
                fig_comparison,
                width="stretch"
            )

            # --------------------------------------
            # NEW: Distribution Analysis
            # --------------------------------------

            st.subheader("Before vs After Data Distribution")

            st.write(
                "Compare numeric values before "
                "and after cleaning."
            )

            numeric_columns = [
                col for col in df.select_dtypes(
                    include="number"
                ).columns
                if col in cleaned.columns
            ]

            if numeric_columns:

                selected_numeric = st.selectbox(
                    "Select a numeric column",
                    numeric_columns,
                    key="distribution_column"
                )

                before_values = pd.to_numeric(
                    df[selected_numeric],
                    errors="coerce"
                )

                after_values = pd.to_numeric(
                    cleaned[selected_numeric],
                    errors="coerce"
                )

                # Statistical Comparison

                statistics = pd.DataFrame({
                    "Metric": [
                        "Missing Values",
                        "Mean",
                        "Median",
                        "Standard Deviation"
                    ],
                    "Before": [
                        before_values.isna().sum(),
                        before_values.mean(),
                        before_values.median(),
                        before_values.std()
                    ],
                    "After": [
                        after_values.isna().sum(),
                        after_values.mean(),
                        after_values.median(),
                        after_values.std()
                    ]
                })

                st.subheader("Statistical Comparison")

                st.dataframe(
                    statistics.round(2),
                    width="stretch",
                    hide_index=True
                )

                # Histogram Data

                before_data = pd.DataFrame({
                    "Value": before_values.dropna(),
                    "Stage": "Before"
                })

                after_data = pd.DataFrame({
                    "Value": after_values.dropna(),
                    "Stage": "After"
                })

                distribution_data = pd.concat(
                    [before_data, after_data],
                    ignore_index=True
                )

                if not distribution_data.empty:

                    fig_distribution = px.histogram(
                        distribution_data,
                        x="Value",
                        color="Stage",
                        barmode="overlay",
                        histnorm="probability density",
                        opacity=0.55,
                        nbins=35,
                        color_discrete_map={
                            "Before": "#2563A6",
                            "After": "#0D9488"
                        },
                        title=(
                            f"Distribution of {selected_numeric}"
                        )
                    )

                    fig_distribution.update_layout(
                        template="plotly_white",
                        paper_bgcolor="#FFFFFF",
                        plot_bgcolor="#FFFFFF",
                        font_color="#12304A",
                        height=420,
                        xaxis_title=selected_numeric,
                        yaxis_title="Density",
                        legend_title="Stage"
                    )

                    st.plotly_chart(
                        fig_distribution,
                        width="stretch"
                    )

                # Missing Value Comparison

                missing_before = int(
                    before_values.isna().sum()
                )

                missing_after = int(
                    after_values.isna().sum()
                )

                st.metric(
                    "Missing Values Reduced",
                    missing_before - missing_after
                )

                # Distribution Warning

                before_mean = before_values.mean()
                after_mean = after_values.mean()
                before_std = before_values.std()

                if (
                    pd.notna(before_mean)
                    and pd.notna(after_mean)
                    and pd.notna(before_std)
                    and before_std > 0
                    and abs(after_mean - before_mean)
                    > 0.1 * before_std
                ):
                    st.warning(
                        "The mean changed noticeably "
                        "after cleaning. Review the results."
                    )

                st.caption(
                    "Missing-value replacement can change "
                    "the distribution. Review the impact "
                    "before using the cleaned dataset."
                )

            else:
                st.info(
                    "No numeric columns available "
                    "for distribution analysis."
                )

            # --------------------------------------
            # Cleaning Audit Log
            # --------------------------------------

            st.subheader("Cleaning Audit Log")

            audit_display = audit.copy()

            audit_display["Old Value"] = (
                audit_display["Old Value"].astype(str)
            )

            audit_display["New Value"] = (
                audit_display["New Value"].astype(str)
            )

            st.dataframe(
                style_table(audit_display),
                width="stretch"
            )

            st.info(
                f"Cleaning operations logged: {len(audit)}"
            )

            # --------------------------------------
            # Download Results
            # --------------------------------------

            st.subheader("Download Results")

            col1, col2, col3 = st.columns(3)

            with col1:
                st.download_button(
                    "Cleaned Dataset",
                    data=cleaned.to_csv(index=False),
                    file_name="cleaned_dataset.csv",
                    mime="text/csv",
                    width="stretch"
                )

            with col2:
                st.download_button(
                    "Quality Report",
                    data=after_report.to_csv(index=False),
                    file_name="quality_report.csv",
                    mime="text/csv",
                    width="stretch"
                )

            with col3:
                st.download_button(
                    "Audit Log",
                    data=audit.to_csv(index=False),
                    file_name="audit_log.csv",
                    mime="text/csv",
                    width="stretch"
                )
                
            # Professional PDF Report

            st.subheader("Professional PDF Report")

            st.write(
                "Generate a complete PDF report "
                "of the data quality assessment."
            )

            pdf_bytes = generate_pdf_report(
                original_df=df,
                cleaned_df=cleaned,
                before_summary=summary,
                after_summary=analyze_data(cleaned)[0],
                before_score=results["before_score"],
                after_score=results["after_score"],
                outlier_report=detect_outliers(cleaned),
                audit=audit
            )

            st.download_button(
                label="Download Professional PDF Report",
                data=pdf_bytes,
                file_name="data_quality_assessment_report.pdf",
                mime="application/pdf",
                width="stretch",
                key="download_pdf_report"
            )


    except Exception as error:
        st.error(f"Unable to process dataset: {error}")
