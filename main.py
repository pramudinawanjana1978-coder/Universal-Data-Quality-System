
import pandas as pd
from pathlib import Path

# Project settings
INPUT_FOLDER = Path("input_files")
OUTPUT_DIR = Path("output")

INPUT_FOLDER.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

COLUMNS = [
    "CustomerID",
    "Name",
    "Age",
    "Email",
    "Gender",
    "City",
    "RegistrationDate",
    "PurchaseAmount"
]

FLAGS = [
    "MissingName",
    "InvalidAge",
    "InvalidEmail",
    "MissingCity",
    "InvalidDate",
    "InvalidPurchase",
    "DuplicateRecord",
    "DuplicateCustomerID"
]


# Function 1: Load dataset
def load_data(file_path):
    df = pd.read_csv(file_path)

    missing_columns = [
        col for col in COLUMNS
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    print("Dataset Loaded:", len(df), "records")
    return df


# Function 2: Validate dataset
def validate_data(df):
    result = df[COLUMNS].copy()

    age = pd.to_numeric(
        result["Age"],
        errors="coerce"
    )

    amount = pd.to_numeric(
        result["PurchaseAmount"],
        errors="coerce"
    )

    dates = pd.to_datetime(
        result["RegistrationDate"],
        errors="coerce",
        format="mixed"
    )

    # Check missing names
    result["MissingName"] = (
        result["Name"].isna()
        | result["Name"].astype("string")
        .str.strip().eq("").fillna(True)
    )

    # Check invalid ages
    result["InvalidAge"] = (
        age.isna()
        | (age < 0)
        | (age > 120)
    )

    # Check email format
    valid_email = (
        result["Email"]
        .astype("string")
        .str.fullmatch(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
        )
        .fillna(False)
    )

    result["InvalidEmail"] = ~valid_email

    # Check missing cities
    result["MissingCity"] = (
        result["City"].isna()
        | result["City"].astype("string")
        .str.strip().eq("").fillna(True)
    )

    # Check invalid dates
    result["InvalidDate"] = dates.isna()

    # Check invalid purchase amounts
    # Negative amounts are flagged for review,
    # because they may represent refunds.
    result["InvalidPurchase"] = (
        amount.isna()
        | (amount < 0)
    )

    # Check duplicate records
    result["DuplicateRecord"] = (
        result.duplicated(
            subset=COLUMNS,
            keep=False
        )
    )

    # Check duplicate customer IDs
    result["DuplicateCustomerID"] = (
        result["CustomerID"].duplicated(keep=False)
        | result["CustomerID"].isna()
    )

    result["NeedsReview"] = result[FLAGS].any(axis=1)

    return result


# Function 3: Safe cleaning
def clean_data(df):
    cleaned = df.copy()
    logs = []

    for column in ["Name", "City"]:

        for index in cleaned.index:

            old_value = cleaned.at[index, column]

            if pd.isna(old_value):
                continue

            new_value = str(old_value).strip()

            if str(old_value) != new_value:

                logs.append({
                    "RowIndex": index,
                    "CustomerID": cleaned.at[
                        index, "CustomerID"
                    ],
                    "Column": column,
                    "OldValue": old_value,
                    "NewValue": new_value,
                    "Action": "Trim whitespace"
                })

                cleaned.at[index, column] = new_value

    audit = pd.DataFrame(
        logs,
        columns=[
            "RowIndex",
            "CustomerID",
            "Column",
            "OldValue",
            "NewValue",
            "Action"
        ]
    )

    return cleaned, audit


# Function 4: Generate quality report
def generate_report(df):

    report = pd.DataFrame({
        "Problem": FLAGS,
        "Count": [
            int(df[col].sum())
            for col in FLAGS
        ]
    })

    total = len(df)

    if total > 0:
        report["Percentage"] = (
            report["Count"] / total * 100
        ).round(2)
    else:
        report["Percentage"] = 0.0

    return report


# Function 5: Save results
def save_results(df, cleaned, report, audit, folder):

    folder.mkdir(parents=True, exist_ok=True)

    # Save valid records
    df[~df["NeedsReview"]].to_csv(
        folder / "valid_customers.csv",
        index=False
    )

    # Save records requiring review
    df[df["NeedsReview"]].to_csv(
        folder / "review_customers.csv",
        index=False
    )

    # Save all validated records
    df.to_csv(
        folder / "validated_customers.csv",
        index=False
    )

    # Save cleaned data without validation flags
    cleaned.to_csv(
        folder / "cleaned_customers.csv",
        index=False
    )

    # Save quality report
    report.to_csv(
        folder / "quality_report.csv",
        index=False
    )

    # Save audit log
    audit.to_csv(
        folder / "audit_log.csv",
        index=False
    )


# Function: Compare before and after cleaning
def compare_quality(before, after, output_folder):

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

    comparison.to_csv(
        output_folder / "before_after_comparison.csv",
        index=False
    )

    print("\nBEFORE VS AFTER COMPARISON")
    print("------------------------------")
    print(comparison)

    print("\nComparison Report Saved!")

# Function 6: Process one CSV file
def process_file(file_path):

    print("\n==============================")
    print("Processing:", file_path.name)
    print("==============================")

    # Load original data
    original = load_data(file_path)

    # Validate before cleaning
    before = validate_data(original)

    # Apply safe cleaning
    cleaned, audit = clean_data(original)

    # Validate after cleaning
    after = validate_data(cleaned)

    # Generate quality report
    report = generate_report(after)

    # Calculate quality metrics
    before_rate = (
        (~before["NeedsReview"]).mean() * 100
        if len(before) else 0
    )

    after_rate = (
        (~after["NeedsReview"]).mean() * 100
        if len(after) else 0
    )

    valid_count = int((~after["NeedsReview"]).sum())
    review_count = int(after["NeedsReview"].sum())

    # Create a separate output folder
    file_output = OUTPUT_DIR / file_path.stem
    file_output.mkdir(parents=True, exist_ok=True)

    compare_quality(before, after, file_output)

    # Save results
    save_results(
        after,
        cleaned,
        report,
        audit,
        file_output
    )

    # Display summary
    print("\nDATA QUALITY RESULTS")
    print("------------------------------")
    print("Total Records:", len(original))
    print("Valid Records:", valid_count)
    print("Review Records:", review_count)

    print(f"Before Pass Rate: {before_rate:.2f}%")
    print(f"After Pass Rate: {after_rate:.2f}%")

    print("Changes Made:", len(audit))

    print("\nQuality Report:")
    print(report)

    print("\nOutput Folder:", file_output)
    print("Processing Completed!")


# Main program
def main():

    csv_files = sorted(
        INPUT_FOLDER.glob("*.csv")
    )

    print("CSV Files Found:", len(csv_files))

    if not csv_files:
        print("No CSV files found in input_files folder.")
        return

    for file in csv_files:
        try:
            process_file(file)
        except Exception as error:
            print(f"Error processing {file.name}: {error}")

    print("\nALL FILES PROCESSED!")


if __name__ == "__main__":
    main()
