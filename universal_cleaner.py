
import pandas as pd


def analyze_data(df):
    """Analyze any CSV dataset without changing it."""

    total_rows = len(df)

    missing = df.isna().sum()
    duplicates = int(df.duplicated().sum())

    report = pd.DataFrame({
        "Column": df.columns,
        "Data Type": df.dtypes.astype(str).values,
        "Missing Values": missing.values,
        "Missing %": (
            missing.values / max(total_rows, 1) * 100
        ).round(2),
        "Unique Values": df.nunique(dropna=True).values
    })

    summary = {
        "total_rows": total_rows,
        "total_columns": len(df.columns),
        "missing_cells": int(missing.sum()),
        "duplicate_rows": duplicates
    }

    return summary, report


def clean_data(
    df,
    trim_spaces=True,
    remove_duplicates=False,
    fill_missing=False
):
    """Apply only user-selected cleaning operations."""

    cleaned = df.copy()
    audit = []

    if trim_spaces:
        for col in cleaned.select_dtypes(
            include=["object", "string"]
        ).columns:

            for idx in cleaned.index:
                old = cleaned.at[idx, col]

                if not isinstance(old, str):
                    continue

                new = old.strip()

                if old != new:
                    cleaned.at[idx, col] = new

                    audit.append({
                        "Row": idx,
                        "Column": col,
                        "Old Value": old,
                        "New Value": new,
                        "Action": "Trim whitespace"
                    })

    if remove_duplicates:
        before = len(cleaned)
        cleaned = cleaned.drop_duplicates().copy()

        removed = before - len(cleaned)

        if removed:
            audit.append({
                "Row": "Multiple",
                "Column": "All",
                "Old Value": removed,
                "New Value": 0,
                "Action": "Remove duplicate rows"
            })

    if fill_missing:
        for col in cleaned.select_dtypes(
            include=["object", "string"]
        ).columns:

            missing_mask = cleaned[col].isna()
            missing_indices = cleaned.index[missing_mask]

            for idx in missing_indices:
                cleaned.at[idx, col] = "Unknown"

                audit.append({
                    "Row": idx,
                    "Column": col,
                    "Old Value": "Missing",
                    "New Value": "Unknown",
                    "Action": "Fill missing text"
                })

    audit_df = pd.DataFrame(
        audit,
        columns=[
            "Row", "Column", "Old Value",
            "New Value", "Action"
        ]
    )

    return cleaned, audit_df

def clean_missing_values(df, cleaning_rules):
    """
    Fill missing values using user-selected rules.
    Keep an audit log of every changed cell.
    """

    cleaned = df.copy()
    logs = []

    for column, method in cleaning_rules.items():

        if column not in cleaned.columns:
            continue

        missing_rows = cleaned.index[
            cleaned[column].isna()
        ]

        if len(missing_rows) == 0:
            continue

        if method in ["Mean", "Median"]:
            if not pd.api.types.is_numeric_dtype(
                cleaned[column]
            ):
                continue

            if method == "Mean":
                fill_value = cleaned[column].mean()
            else:
                fill_value = cleaned[column].median()

        elif method == "Mode":
            modes = cleaned[column].mode(dropna=True)

            if modes.empty:
                continue

            fill_value = modes.iloc[0]

        elif method == "Unknown":
            if pd.api.types.is_numeric_dtype(
                cleaned[column]
            ):
                continue

            fill_value = "Unknown"

        else:
            continue

        if pd.isna(fill_value):
            continue

        for idx in missing_rows:
            cleaned.at[idx, column] = fill_value

            logs.append({
                "Row": idx,
                "Column": column,
                "Old Value": "Missing",
                "New Value": fill_value,
                "Action": f"Fill missing using {method}"
            })

    audit = pd.DataFrame(
        logs,
        columns=[
            "Row", "Column", "Old Value",
            "New Value", "Action"
        ]
    )

    return cleaned, audit


def calculate_quality_score(df):
    """Calculate a basic data quality score."""

    total_rows = len(df)
    total_columns = len(df.columns)

    if total_rows == 0 or total_columns == 0:
        return 0.0

    total_cells = total_rows * total_columns
    missing_cells = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    completeness = (
        (total_cells - missing_cells) / total_cells
    ) * 100

    uniqueness = (
        (total_rows - duplicate_rows) / total_rows
    ) * 100

    quality_score = (
        completeness * 0.7 +
        uniqueness * 0.3
    )

    return round(quality_score, 2)

def calculate_quality_score(df):
    """Calculate a basic data quality score."""

    total_rows = len(df)
    total_columns = len(df.columns)

    if total_rows == 0 or total_columns == 0:
        return 0.0

    total_cells = total_rows * total_columns
    missing_cells = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    completeness = (
        (total_cells - missing_cells) / total_cells
    ) * 100

    uniqueness = (
        (total_rows - duplicate_rows) / total_rows
    ) * 100

    quality_score = (
        completeness * 0.7 +
        uniqueness * 0.3
    )

    return round(quality_score, 2)


def recommend_cleaning_methods(df):
    """Suggest missing-value methods with explanations."""

    recommendations = []

    for column in df.columns:
        series = df[column]
        missing_count = int(series.isna().sum())

        if missing_count == 0:
            continue

        missing_percent = (
            missing_count / max(len(df), 1)
        ) * 100

        if missing_count == len(df):
            method = "Keep Missing"
            reason = "All values are missing. No reliable replacement is available."

        elif pd.api.types.is_numeric_dtype(series):

            if column.lower().endswith("id") or column.lower() in [
                "id", "target", "label"
            ]:
                method = "Keep Missing"
                reason = "This may be an identifier or target column. Review it manually."

            elif series.nunique(dropna=True) <= 5:
                method = "Mode"
                reason = "This numeric column has few unique values and may represent categories."

            elif abs(series.skew()) > 1:
                method = "Median"
                reason = "The values are skewed, so the median is less affected by extreme values."

            else:
                method = "Mean"
                reason = "The numeric distribution is not strongly skewed."

        else:
            method = "Mode"
            reason = "This is a text or categorical column. Mode is a possible replacement."

        if missing_percent > 30:
            method = "Keep Missing"
            reason = "More than 30% of values are missing. Manual review is recommended."

        recommendations.append({
            "Column": column,
            "Missing Count": missing_count,
            "Missing %": round(missing_percent, 2),
            "Recommended Method": method,
            "Reason": reason
        })

    return pd.DataFrame(recommendations)


def detect_outliers(df):
    """Detect potential numeric outliers using IQR."""

    results = []

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns

    for column in numeric_columns:

        # Skip likely identifier columns
        if column.lower() == "id" or column.lower().endswith("_id"):
            continue

        series = df[column].dropna()

        if len(series) < 4 or series.nunique() < 4:
            continue

        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1

        if iqr == 0:
            continue

        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = series[
            (series < lower_bound) |
            (series > upper_bound)
        ]

        results.append({
            "Column": column,
            "Outlier Count": len(outliers),
            "Outlier %": round(
                len(outliers) / len(series) * 100, 2
            ),
            "Lower Bound": round(lower_bound, 2),
            "Upper Bound": round(upper_bound, 2)
        })

    return pd.DataFrame(
        results,
        columns=[
            "Column",
            "Outlier Count",
            "Outlier %",
            "Lower Bound",
            "Upper Bound"
        ]
    )

def validate_data_rules(df):
    import pandas as pd
    import re

    issues = []

    for column in df.columns:
        series = df[column]
        column_lower = str(column).lower()

        # 1. Invalid Email Detection
        if "email" in column_lower:
            email_pattern = (
                r"^[A-Za-z0-9._%+-]+@"
                r"[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
            )

            for index, value in series.items():
                if pd.isna(value):
                    continue

                if not re.fullmatch(
                    email_pattern,
                    str(value).strip()
                ):
                    issues.append({
                        "Row": index + 1,
                        "Column": column,
                        "Value": str(value),
                        "Issue": "Invalid Email"
                    })

        # 2. Negative Values
        if pd.api.types.is_numeric_dtype(series):

            for index, value in series.items():
                if pd.isna(value):
                    continue

                if value < 0:
                    issues.append({
                        "Row": index + 1,
                        "Column": column,
                        "Value": value,
                        "Issue": "Negative Value - Review"
                    })

        # 3. Invalid Dates
        if (
            "date" in column_lower
            or column_lower.endswith("_at")
        ):
            for index, value in series.items():
                if pd.isna(value):
                    continue

                parsed = pd.to_datetime(
                    value,
                    errors="coerce"
                )

                if pd.isna(parsed):
                    issues.append({
                        "Row": index + 1,
                        "Column": column,
                        "Value": str(value),
                        "Issue": "Invalid Date"
                    })

        # 4. Duplicate IDs
        if (
            column_lower == "id"
            or column_lower.endswith("_id")
            or column_lower.endswith("id")
        ):
            duplicate_mask = (
                series.notna()
                & series.duplicated(keep=False)
            )

            for index, value in series[
                duplicate_mask
            ].items():
                issues.append({
                    "Row": index + 1,
                    "Column": column,
                    "Value": str(value),
                    "Issue": "Duplicate ID"
                })

    return pd.DataFrame(
        issues,
        columns=[
            "Row",
            "Column",
            "Value",
            "Issue"
        ]
    )
