
from io import BytesIO
from pathlib import Path
import sys
import math
import uuid

import numpy as np
import pandas as pd

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field


# -----------------------------------------
# IMPORT EXISTING PYTHON FUNCTIONS
# -----------------------------------------

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from universal_cleaner import (
    analyze_data,
    clean_data,
    clean_missing_values,
    calculate_quality_score,
    recommend_cleaning_methods,
    detect_outliers,
    validate_data_rules,
)


# -----------------------------------------
# FASTAPI APPLICATION
# -----------------------------------------

app = FastAPI(
    title="DataQuality 360 API",
    description="Python backend for React Data Quality Workspace",
    version="1.0.0",
)


# -----------------------------------------
# CORS CONFIGURATION
# -----------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------
# CONFIGURATION
# -----------------------------------------

MAX_FILE_SIZE = 10 * 1024 * 1024

# Temporary local development storage
datasets = {}


# -----------------------------------------
# JSON HELPER FUNCTIONS
# -----------------------------------------

def safe_value(value):
    """Convert pandas/numpy values to JSON-safe values."""

    if value is None:
        return None

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    if isinstance(value, np.generic):
        value = value.item()

    if isinstance(value, (float, int)):
        if isinstance(value, float) and not math.isfinite(value):
            return None

    try:
        missing = pd.isna(value)

        if isinstance(missing, (bool, np.bool_)) and missing:
            return None

    except (TypeError, ValueError):
        pass

    return value


def records(df):
    """Convert DataFrame to JSON-compatible records."""

    return [
        {
            str(key): safe_value(value)
            for key, value in row.items()
        }
        for row in df.to_dict(orient="records")
    ]


def get_dataset(dataset_id):
    """Retrieve previously uploaded dataset."""

    if dataset_id not in datasets:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found. Please upload it again.",
        )

    return datasets[dataset_id]


async def read_csv(file: UploadFile):
    """Read and validate uploaded CSV."""

    if (
        not file.filename
        or not file.filename.lower().endswith(".csv")
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file.",
        )

    contents = await file.read(MAX_FILE_SIZE + 1)

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 10 MB.",
        )

    try:
        df = pd.read_csv(BytesIO(contents))

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to read CSV file.",
        )

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="CSV file contains no records.",
        )

    return df


# -----------------------------------------
# HEALTH CHECK
# -----------------------------------------

@app.get("/")
def home():
    return {
        "message": "DataQuality 360 Backend is running!",
        "status": "success",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "backend": "FastAPI",
    }


# -----------------------------------------
# HOME PAGE - DATASET ANALYSIS
# -----------------------------------------

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):

    df = await read_csv(file)

    summary, report = analyze_data(df)

    quality_score = calculate_quality_score(df)

    dataset_id = str(uuid.uuid4())

    datasets[dataset_id] = {
        "original": df,
        "cleaned": None,
        "audit": None,
    }

    column_missing = []

    for _, row in report.iterrows():
        column_missing.append({
            "column": str(row["Column"]),
            "missing": int(row["Missing Values"]),
        })

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "rows": summary["total_rows"],
        "columns": summary["total_columns"],
        "missing_values": summary["missing_cells"],
        "duplicates": summary["duplicate_rows"],
        "quality_score": quality_score,
        "column_missing": column_missing,
        "preview": records(df.head(5)),
    }


# -----------------------------------------
# PROFILE PAGE - DATA PROFILING
# -----------------------------------------

@app.post("/api/profile")
async def profile(file: UploadFile = File(...)):

    df = await read_csv(file)

    summary, report = analyze_data(df)

    columns = []

    for _, row in report.iterrows():
        columns.append({
            "name": str(row["Column"]),
            "type": str(row["Data Type"]),
            "missing": int(row["Missing Values"]),
            "missing_percentage": float(row["Missing %"]),
            "unique": int(row["Unique Values"]),
        })

    # Numerical statistics
    statistics = []

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns

    for column in numeric_columns:

        series = df[column].dropna()

        if series.empty:
            continue

        statistics.append({
            "column": str(column),
            "mean": safe_value(
                round(float(series.mean()), 2)
            ),
            "median": safe_value(
                round(float(series.median()), 2)
            ),
            "minimum": safe_value(
                float(series.min())
            ),
            "maximum": safe_value(
                float(series.max())
            ),
        })

    # Original Python IQR algorithm
    outlier_report = detect_outliers(df)

    outlier_details = {}

    for _, row in outlier_report.iterrows():

        column = row["Column"]

        values = pd.to_numeric(
            df[column],
            errors="coerce",
        )

        # Calculate precise bounds for detail filtering
        valid_values = values.dropna()

        q1 = valid_values.quantile(0.25)
        q3 = valid_values.quantile(0.75)
        iqr = q3 - q1

        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr

        mask = (
            (values < lower)
            | (values > upper)
        )

        details = pd.DataFrame({
            "Row Number": df.index[mask] + 1,
            "Column": column,
            "Value": values[mask].values,
            "Status": "Review",
        })

        outlier_details[str(column)] = records(details)

    return {
        "rows": summary["total_rows"],
        "columns": columns,
        "statistics": statistics,
        "outliers": records(outlier_report),
        "outlier_details": outlier_details,
    }


# -----------------------------------------
# VALIDATE PAGE - DATA VALIDATION
# -----------------------------------------

@app.get("/api/validate/{dataset_id}")
def validate(dataset_id: str):

    df = get_dataset(dataset_id)["original"]

    validation_report = validate_data_rules(df)

    if validation_report.empty:
        return {
            "total_issues": 0,
            "issue_summary": [],
            "issues": [],
        }

    issue_summary = (
        validation_report["Issue"]
        .value_counts()
        .reset_index()
    )

    issue_summary.columns = [
        "Issue Type",
        "Count",
    ]

    return {
        "total_issues": len(validation_report),
        "issue_summary": records(issue_summary),
        "issues": records(validation_report),
    }


# -----------------------------------------
# CLEAN PAGE - RECOMMENDATIONS
# -----------------------------------------

@app.get("/api/recommendations/{dataset_id}")
def recommendations(dataset_id: str):

    df = get_dataset(dataset_id)["original"]

    report = recommend_cleaning_methods(df)

    missing_columns = []

    for column in df.columns:

        missing_count = int(
            df[column].isna().sum()
        )

        if missing_count == 0:
            continue

        numeric = pd.api.types.is_numeric_dtype(
            df[column]
        )

        if numeric:
            methods = [
                "Keep Missing",
                "Mean",
                "Median",
                "Mode",
            ]
        else:
            methods = [
                "Keep Missing",
                "Mode",
                "Unknown",
            ]

        missing_columns.append({
            "column": str(column),
            "missing": missing_count,
            "type": "numeric" if numeric else "text",
            "methods": methods,
        })

    return {
        "recommendations": records(report),
        "missing_columns": missing_columns,
    }


# -----------------------------------------
# CLEAN PAGE - SMART CLEANING
# -----------------------------------------

class CleaningRequest(BaseModel):

    dataset_id: str

    trim_spaces: bool = True

    remove_duplicates: bool = False

    cleaning_rules: dict[str, str] = Field(
        default_factory=dict
    )


@app.post("/api/clean")
def run_cleaning(request: CleaningRequest):

    dataset = get_dataset(request.dataset_id)

    original = dataset["original"]

    allowed_methods = {
        "Keep Missing",
        "Mean",
        "Median",
        "Mode",
        "Unknown",
    }

    # Validate cleaning rules
    for column, method in request.cleaning_rules.items():

        if column not in original.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown column: {column}",
            )

        if method not in allowed_methods:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid cleaning method: {method}",
            )

        numeric = pd.api.types.is_numeric_dtype(
            original[column]
        )

        if numeric and method == "Unknown":
            raise HTTPException(
                status_code=400,
                detail=f"Unknown is not valid for numeric column: {column}",
            )

        if not numeric and method in ("Mean", "Median"):
            raise HTTPException(
                status_code=400,
                detail=f"{method} is not valid for text column: {column}",
            )

    # Existing cleaning algorithm
    cleaned, audit = clean_data(
        original,
        trim_spaces=request.trim_spaces,
        remove_duplicates=request.remove_duplicates,
        fill_missing=False,
    )

    # Existing missing value cleaning algorithm
    cleaned, missing_audit = clean_missing_values(
        cleaned,
        request.cleaning_rules,
    )

    audit = pd.concat(
        [audit, missing_audit],
        ignore_index=True,
    )

    before_summary, _ = analyze_data(original)

    after_summary, after_report = analyze_data(
        cleaned
    )

    before_score = calculate_quality_score(
        original
    )

    after_score = calculate_quality_score(
        cleaned
    )

    # Save cleaned results
    dataset["cleaned"] = cleaned
    dataset["audit"] = audit

    comparison = [
        {
            "metric": "Total Records",
            "before": before_summary["total_rows"],
            "after": after_summary["total_rows"],
        },
        {
            "metric": "Missing Cells",
            "before": before_summary["missing_cells"],
            "after": after_summary["missing_cells"],
        },
        {
            "metric": "Duplicate Rows",
            "before": before_summary["duplicate_rows"],
            "after": after_summary["duplicate_rows"],
        },
    ]

    return {
        "before_score": before_score,
        "after_score": after_score,
        "comparison": comparison,
        "cleaned_preview": records(
            cleaned.head(10)
        ),
        "audit_count": len(audit),
        "audit": records(audit.head(100)),
        "quality_report": records(after_report),
    }


# -----------------------------------------
# REPORTS PAGE - CSV DOWNLOADS
# -----------------------------------------

@app.get("/api/download/{dataset_id}/{report_type}")
def download_report(
    dataset_id: str,
    report_type: str,
):

    dataset = get_dataset(dataset_id)

    cleaned = dataset["cleaned"]
    audit = dataset["audit"]

    if cleaned is None:
        raise HTTPException(
            status_code=400,
            detail="Run cleaning before downloading results.",
        )

    if report_type == "cleaned":

        output = cleaned.to_csv(index=False)
        filename = "cleaned_dataset.csv"

    elif report_type == "quality":

        _, quality_report = analyze_data(
            cleaned
        )

        output = quality_report.to_csv(
            index=False
        )

        filename = "quality_report.csv"

    elif report_type == "audit":

        output = audit.to_csv(index=False)
        filename = "audit_log.csv"

    else:
        raise HTTPException(
            status_code=400,
            detail="Unknown report type.",
        )

    return StreamingResponse(
        iter([output.encode("utf-8-sig")]),
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )

# -----------------------------------------
# DATASET PREVIEW PAGINATION
# -----------------------------------------

@app.get("/api/dataset/{dataset_id}/rows")
def get_dataset_rows(
    dataset_id: str,
    page: int = 1,
    page_size: int = 10,
):
    if dataset_id not in datasets:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found. Please upload the CSV again."
        )

    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be at least 1."
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=400,
            detail="Page size must be between 1 and 100."
        )

    df = datasets[dataset_id]["original"]

    total_rows = len(df)
    total_pages = max(
        1,
        (total_rows + page_size - 1) // page_size
    )

    if page > total_pages:
        raise HTTPException(
            status_code=400,
            detail="Page exceeds the available pages."
        )

    start = (page - 1) * page_size
    end = start + page_size

    page_df = df.iloc[start:end]

    return {
        "page": page,
        "page_size": page_size,
        "total_rows": total_rows,
        "total_pages": total_pages,
        "rows": records(page_df),
    }
