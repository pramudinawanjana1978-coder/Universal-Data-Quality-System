
import streamlit as st
import pandas as pd
import plotly.express as px
from io import BytesIO
from zipfile import ZipFile

from main import (
    COLUMNS,
    FLAGS,
    validate_data,
    clean_data,
    generate_report
)

# PAGE SETTINGS
st.set_page_config(
    page_title="Data Quality Automation",
    page_icon="💎",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CUSTOM DARK THEME
st.markdown("""
<style>
.stApp {
    background: linear-gradient(135deg, #0C1025, #171638, #21143D);
    color: #F4F1FF;
}

[data-testid="stSidebar"] {
    background: #11152D;
    border-right: 1px solid #44366F;
}

[data-testid="stSidebar"] * {
    color: #EAE4FF;
}

h1, h2, h3 {
    color: #F4F1FF !important;
}

div[data-testid="stMetric"] {
    background: linear-gradient(135deg, #25244B, #34265D);
    padding: 20px;
    border-radius: 16px;
    border: 1px solid #594B86;
}

div[data-testid="stMetricLabel"] {
    color: #C6BDE5;
}

div[data-testid="stMetricValue"] {
    color: #C58AFF;
}

.stButton > button[kind="primary"] {
    background: linear-gradient(90deg, #7048E8, #A45BEB);
    color: white;
    border: none;
    border-radius: 12px;
}

div[data-testid="stFileUploader"] {
    border: 1px dashed #986FE5;
    border-radius: 15px;
    padding: 12px;
}

.hero {
    padding: 28px;
    border-radius: 20px;
    background: linear-gradient(110deg, #39256B, #24224E);
    border: 1px solid #59438D;
    margin-bottom: 22px;
}

.hero-title {
    font-size: 30px;
    font-weight: 800;
    color: #FFFFFF;
}

.hero-subtitle {
    color: #D5C8F7;
    font-size: 15px;
    margin-top: 8px;
}

.section-title {
    font-size: 21px;
    font-weight: 700;
    margin: 20px 0 12px;
    color: #F3EAFF;
}
</style>
""", unsafe_allow_html=True)


# HELPER FUNCTIONS
def csv_bytes(df):
    return df.to_csv(index=False).encode("utf-8-sig")


def create_zip(results):
    buffer = BytesIO()

    with ZipFile(buffer, "w") as archive:
        archive.writestr(
            "cleaned_customers.csv",
            csv_bytes(results["cleaned"])
        )
        archive.writestr(
            "validated_customers.csv",
            csv_bytes(results["after"])
        )
        archive.writestr(
            "valid_customers.csv",
            csv_bytes(results["valid"])
        )
        archive.writestr(
            "review_customers.csv",
            csv_bytes(results["review"])
        )
        archive.writestr(
            "quality_report.csv",
            csv_bytes(results["report"])
        )
        archive.writestr(
            "audit_log.csv",
            csv_bytes(results["audit"])
        )
        archive.writestr(
            "before_after_comparison.csv",
            csv_bytes(results["comparison"])
        )

    return buffer.getvalue()


def process_dataset(df):
    before = validate_data(df)
    cleaned, audit = clean_data(df)
    after = validate_data(cleaned)

    report = generate_report(after)

    comparison = pd.DataFrame({
        "Problem": FLAGS,
        "Before": [
            int(before[col].sum()) for col in FLAGS
        ],
        "After": [
            int(after[col].sum()) for col in FLAGS
        ]
    })

    comparison["IssuesResolved"] = (
        comparison["Before"] - comparison["After"]
    )

    valid = after[~after["NeedsReview"]].copy()
    review = after[after["NeedsReview"]].copy()

    return {
        "original": df,
        "before": before,
        "cleaned": cleaned,
        "after": after,
        "audit": audit,
        "report": report,
        "comparison": comparison,
        "valid": valid,
        "review": review
    }


def show_metrics(results):
    total = len(results["after"])
    valid = len(results["valid"])
    review = len(results["review"])

    rate = valid / total * 100 if total else 0

    c1, c2, c3, c4 = st.columns(4)

    c1.metric("📁 Total Records", f"{total:,}")
    c2.metric("✅ Valid Records", f"{valid:,}")
    c3.metric("⚠️ Needs Review", f"{review:,}")
    c4.metric("📊 Pass Rate", f"{rate:.2f}%")


def show_issue_chart(results):
    report = results["report"].copy()
    report = report.sort_values("Count")

    fig = px.bar(
        report,
        x="Count",
        y="Problem",
        orientation="h",
        color="Count",
        color_continuous_scale=[
            "#55C5FF",
            "#8368FF",
            "#D66DFF"
        ],
        text="Count"
    )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        coloraxis_showscale=False,
        margin=dict(l=10, r=20, t=15, b=10),
        height=390,
        xaxis_title="Flagged Records",
        yaxis_title=""
    )

    st.plotly_chart(fig, use_container_width=True)


def show_distribution(results):
    df = pd.DataFrame({
        "Status": ["Valid", "Needs Review"],
        "Records": [
            len(results["valid"]),
            len(results["review"])
        ]
    })

    fig = px.pie(
        df,
        names="Status",
        values="Records",
        hole=0.68,
        color="Status",
        color_discrete_map={
            "Valid": "#8873FF",
            "Needs Review": "#FF66B2"
        }
    )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=10, r=10, t=10, b=10),
        height=330,
        legend=dict(orientation="h", y=-0.1)
    )

    st.plotly_chart(fig, use_container_width=True)


def show_comparison(results):
    before = results["before"]
    after = results["after"]

    before_rate = (
        (~before["NeedsReview"]).mean() * 100
        if len(before) else 0
    )

    after_rate = (
        (~after["NeedsReview"]).mean() * 100
        if len(after) else 0
    )

    chart_df = pd.DataFrame({
        "Stage": ["Before", "After"],
        "Pass Rate": [before_rate, after_rate]
    })

    fig = px.bar(
        chart_df,
        x="Stage",
        y="Pass Rate",
        color="Stage",
        text=chart_df["Pass Rate"].map(
            lambda x: f"{x:.2f}%"
        ),
        color_discrete_map={
            "Before": "#4CB9FF",
            "After": "#B46AFF"
        }
    )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
        yaxis_range=[0, 100],
        height=330,
        margin=dict(l=10, r=10, t=10, b=10)
    )

    st.plotly_chart(fig, use_container_width=True)


# SESSION STATE
if "results" not in st.session_state:
    st.session_state.results = None

if "uploaded_name" not in st.session_state:
    st.session_state.uploaded_name = None


# SIDEBAR
with st.sidebar:
    st.markdown("## 💎 Data Quality")
    st.caption("AUTOMATION SYSTEM")
    st.divider()

    page = st.radio(
        "Navigation",
        [
            "🏠 Home",
            "🧹 Validate & Clean",
            "📊 Results & Reports",
            "📋 Audit Log",
            "📖 How It Works",
            "ℹ️ About"
        ],
        label_visibility="collapsed"
    )

    st.divider()
    st.caption("Python • Pandas • Streamlit • Plotly")
    st.caption("Safe Cleaning | Quality Monitoring")


# HEADER
st.markdown("""
<div class="hero">
    <div class="hero-title">
        Automated Data Quality Monitoring
        & Cleaning System
    </div>
    <div class="hero-subtitle">
        Upload your dataset, identify quality issues,
        apply safe cleaning and explore interactive reports.
    </div>
</div>
""", unsafe_allow_html=True)


# HOME PAGE
if page == "🏠 Home":

    st.markdown("### 🚀 Welcome to Data Quality Automation")

    st.write(
        "Monitor customer data quality, identify invalid "
        "records and download validation reports."
    )

    uploaded_file = st.file_uploader(
        "📤 Upload Your Customer CSV File",
        type=["csv"],
        key="home_upload"
    )

    if uploaded_file is not None:

        if st.session_state.uploaded_name != (
            uploaded_file.name,
            uploaded_file.size
        ):
            st.session_state.results = None
            st.session_state.uploaded_name = (
                uploaded_file.name,
                uploaded_file.size
            )

        try:
            df = pd.read_csv(uploaded_file)

            st.success(
                f"Uploaded successfully: {uploaded_file.name}"
            )

            st.write(
                f"**Records:** {len(df):,} | "
                f"**Columns:** {len(df.columns)}"
            )

            with st.expander("Preview Dataset"):
                st.dataframe(
                    df.head(15),
                    use_container_width=True
                )

            if st.button(
                "🚀 Run Validation & Safe Cleaning",
                type="primary"
            ):
                with st.spinner("Analyzing your dataset..."):
                    st.session_state.results = process_dataset(df)

                st.success("Analysis completed!")

        except Exception as error:
            st.error(f"Error: {error}")

    results = st.session_state.results

    if results is not None:

        st.markdown(
            '<div class="section-title">Dashboard Overview</div>',
            unsafe_allow_html=True
        )

        show_metrics(results)

        left, right = st.columns([1.5, 1])

        with left:
            st.subheader("📊 Data Quality Issues")
            show_issue_chart(results)

        with right:
            st.subheader("🍩 Records Distribution")
            show_distribution(results)

        st.subheader("📈 Before vs After Cleaning")
        show_comparison(results)

        st.info(
            "Validation pass rate measures rule compliance, "
            "not verified real-world data accuracy."
        )

        st.download_button(
            "📦 Download All Reports (ZIP)",
            data=create_zip(results),
            file_name="data_quality_reports.zip",
            mime="application/zip",
            type="primary"
        )


# VALIDATE & CLEAN PAGE
elif page == "🧹 Validate & Clean":

    st.header("🧹 Validate & Clean")

    st.write(
        "Upload a CSV file to identify quality problems "
        "and apply safe cleaning rules."
    )

    uploaded_file = st.file_uploader(
        "Choose Customer CSV",
        type=["csv"],
        key="validate_upload"
    )

    if uploaded_file is not None:

        try:
            df = pd.read_csv(uploaded_file)

            st.dataframe(
                df.head(10),
                use_container_width=True
            )

            if st.button(
                "Run Validation",
                type="primary"
            ):
                with st.spinner("Processing..."):
                    st.session_state.results = process_dataset(df)

                st.success("Validation and cleaning completed!")

        except Exception as error:
            st.error(f"Processing failed: {error}")

    if st.session_state.results is not None:
        show_metrics(st.session_state.results)

        st.subheader("Validation Results")
        st.dataframe(
            st.session_state.results["after"],
            use_container_width=True
        )


# RESULTS & REPORTS PAGE
elif page == "📊 Results & Reports":

    st.header("📊 Results & Reports")

    if st.session_state.results is None:
        st.warning("Please upload and process a dataset first.")

    else:
        results = st.session_state.results

        show_metrics(results)

        st.subheader("Data Quality Issues")
        show_issue_chart(results)

        st.subheader("Before vs After Comparison")
        show_comparison(results)

        st.subheader("Detailed Comparison")
        st.dataframe(
            results["comparison"],
            use_container_width=True,
            hide_index=True
        )

        st.download_button(
            "Download Quality Report",
            csv_bytes(results["report"]),
            "quality_report.csv",
            "text/csv"
        )

        st.download_button(
            "Download All Reports",
            create_zip(results),
            "data_quality_reports.zip",
            "application/zip"
        )


# AUDIT LOG PAGE
elif page == "📋 Audit Log":

    st.header("📋 Cleaning Audit Log")

    if st.session_state.results is None:
        st.warning("Please process a dataset first.")

    else:
        audit = st.session_state.results["audit"]

        st.metric("Cleaning Changes", len(audit))

        if audit.empty:
            st.info(
                "No whitespace corrections were needed "
                "for this dataset."
            )
        else:
            st.dataframe(
                audit,
                use_container_width=True,
                hide_index=True
            )

        st.download_button(
            "Download Audit Log",
            csv_bytes(audit),
            "audit_log.csv",
            "text/csv"
        )


# HOW IT WORKS PAGE
elif page == "📖 How It Works":

    st.header("📖 How It Works")

    st.markdown("""
    ### Step 1 — Upload
    Upload a CSV containing the required customer columns.

    ### Step 2 — Validate
    Detect missing names, invalid ages, email format issues,
    invalid dates, purchase issues and duplicates.

    ### Step 3 — Clean Safely
    Remove unnecessary spaces from Name and City values.
    Original values are preserved in the audit log.

    ### Step 4 — Review
    Explore flagged records and quality comparisons.

    ### Step 5 — Download
    Download cleaned data, reports and audit logs.

    **Important:** Negative purchase amounts may be refunds.
    They are flagged for review, not automatically deleted.
    """)


# ABOUT PAGE
elif page == "ℹ️ About":

    st.header("ℹ️ About This Project")

    st.write(
        "An Automated Data Quality Monitoring and "
        "Cleaning System developed using Python, "
        "Pandas, Streamlit and Plotly."
    )

    st.subheader("Main Features")

    st.markdown("""
    - Automated CSV validation
    - Missing value detection
    - Invalid age and email detection
    - Duplicate detection
    - Safe whitespace cleaning
    - Audit logging
    - Before vs after quality comparison
    - Interactive data visualization
    - Downloadable reports
    """)

    st.info(
        "This version supports the eight-column "
        "customer dataset schema. It is not yet "
        "a general-purpose cleaning tool for every CSV."
    )
