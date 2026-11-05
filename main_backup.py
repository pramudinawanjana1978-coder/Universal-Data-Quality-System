
import pandas as pd
from pathlib import Path

# Step 1: Create output folders
Path("output").mkdir(exist_ok=True)

# Step 2: Load original dataset
df = pd.read_csv(
    "data/ecommerce_customers_dirty_10000.csv"
)

print("Total Records:", len(df))

# Step 3: Create validation flags
# Do not change original values

# Missing names
df["MissingName"] = (
    df["Name"].isna() |
    df["Name"].astype("string").str.strip().eq("").fillna(True)
)

# Invalid ages
age_numeric = pd.to_numeric(
    df["Age"], errors="coerce"
)

df["InvalidAge"] = (
    age_numeric.isna() |
    (age_numeric < 0) |
    (age_numeric > 120)
)

# Invalid emails
df["InvalidEmail"] = ~(
    df["Email"]
    .astype("string")
    .str.fullmatch(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
    )
    .fillna(False)
)

# Missing cities
df["MissingCity"] = (
    df["City"].isna() |
    df["City"].astype("string").str.strip().eq("").fillna(True)
)

# Invalid registration dates
dates = pd.to_datetime(
    df["RegistrationDate"],
    errors="coerce",
    format="mixed"
)

df["InvalidDate"] = dates.isna()

# Invalid purchase amounts
# Negative amounts are flagged for review,
# because they might represent refunds.
amount = pd.to_numeric(
    df["PurchaseAmount"], errors="coerce"
)

df["InvalidPurchase"] = (
    amount.isna() | (amount < 0)
)

# Exact duplicate rows
original_columns = [
    "CustomerID", "Name", "Age", "Email",
    "Gender", "City", "RegistrationDate",
    "PurchaseAmount"
]

df["DuplicateRecord"] = df.duplicated(
    subset=original_columns, keep=False
)

# Duplicate customer IDs
df["DuplicateCustomerID"] = df["CustomerID"].duplicated(
    keep=False
) | df["CustomerID"].isna()

# Step 4: Identify records needing review
flags = [
    "MissingName",
    "InvalidAge",
    "InvalidEmail",
    "MissingCity",
    "InvalidDate",
    "InvalidPurchase",
    "DuplicateRecord",
    "DuplicateCustomerID"
]

df["NeedsReview"] = df[flags].any(axis=1)

# Step 5: Separate valid and review records
valid_df = df[~df["NeedsReview"]].copy()
review_df = df[df["NeedsReview"]].copy()

# Step 6: Save files
valid_df.to_csv(
    "output/valid_customers.csv", index=False
)

review_df.to_csv(
    "output/review_customers.csv", index=False
)

# Step 7: Generate validation report
report = pd.DataFrame({
    "Problem": flags,
    "Count": [int(df[col].sum()) for col in flags]
})

report.to_csv(
    "output/validation_report.csv", index=False
)

# Step 8: Display summary
print("\nValidation Completed!")
print("Valid Records:", len(valid_df))
print("Review Records:", len(review_df))
print("\nValidation Report:")
print(report)

# Step 9: Calculate data quality percentages

total = len(df)

quality_report = pd.DataFrame({
    "Problem": flags,
    "Count": [int(df[col].sum()) for col in flags]
})

quality_report["Percentage"] = (
    quality_report["Count"] / total * 100
).round(2)

# Overall validation pass rate
pass_rate = len(valid_df) / total * 100
review_rate = len(review_df) / total * 100

print("\nDATA QUALITY SUMMARY")
print("------------------------")
print(f"Validation Pass Rate: {pass_rate:.2f}%")
print(f"Needs Review Rate: {review_rate:.2f}%")

print("\nIssue Percentages:")
print(quality_report)

# Save report
quality_report.to_csv(
    "output/data_quality_summary.csv",
    index=False
)

print("\nData Quality Report Saved!")

# Step 10: Safe Automated Cleaning

clean_df = df.copy()

audit_logs = []

# Clean text columns safely
text_columns = ["Name", "City"]

for column in text_columns:

    for index in clean_df.index:

        old_value = clean_df.at[index, column]

        # Skip missing values
        if pd.isna(old_value):
            continue

        # Remove leading and trailing spaces
        new_value = str(old_value).strip()

        # Record changes
        if str(old_value) != new_value:

            audit_logs.append({
                "CustomerID": clean_df.at[index, "CustomerID"],
                "Column": column,
                "OldValue": old_value,
                "NewValue": new_value,
                "Action": "Removed extra spaces"
            })

            clean_df.at[index, column] = new_value

# Save safely standardized data
clean_df.to_csv(
    "output/standardized_customers.csv",
    index=False
)

# Save audit log
audit_df = pd.DataFrame(
    audit_logs,
    columns=[
        "CustomerID", "Column",
        "OldValue", "NewValue", "Action"
    ]
)

audit_df.to_csv(
    "output/audit_log.csv",
    index=False
)

print("\nSAFE CLEANING COMPLETED!")
print("Total Changes:", len(audit_df))
print("Audit Log Saved!")

# Step 11: Compare missing values before and after

print("\nBEFORE VS AFTER CLEANING")
print("-------------------------")

original_missing = df[
    original_columns
].isna().sum().sum()

cleaned_missing = clean_df[
    original_columns
].isna().sum().sum()

print("Missing Before:", original_missing)
print("Missing After:", cleaned_missing)

print("\nRecords Before:", len(df))
print("Records After:", len(clean_df))

# Step 12: Missing Value Analysis

print("\nMISSING VALUE ANALYSIS")
print("-------------------------")

missing_report = pd.DataFrame({
    "Column": original_columns,
    "MissingCount": [
        int(df[col].isna().sum())
        for col in original_columns
    ]
})

missing_report["MissingPercentage"] = (
    missing_report["MissingCount"] / len(df) * 100
).round(2)

print(missing_report)

missing_report.to_csv(
    "output/missing_value_report.csv",
    index=False
)

print("\nMissing Value Report Saved!")

# Step 13: Analyze invalid ages

print("\nINVALID AGE ANALYSIS")
print("-------------------------")

# Select records with invalid ages
invalid_age_df = df[df["InvalidAge"]].copy()

# Count different invalid values
age_issues = (
    invalid_age_df["Age"]
    .fillna("<MISSING>")
    .astype(str)
    .value_counts()
)

print(age_issues)

# Save invalid age records
invalid_age_df.to_csv(
    "output/invalid_age_records.csv",
    index=False
)

print("\nInvalid Age Records Saved!")

# Step 14: Safe Age Cleaning

age_df = df[original_columns].copy()

# Preserve original age
age_df["OriginalAge"] = age_df["Age"]

# Convert valid numeric ages
age_df["CleanAge"] = pd.to_numeric(
    age_df["Age"], errors="coerce"
)

# Identify invalid age values
invalid_age = (
    age_df["CleanAge"].isna() |
    (age_df["CleanAge"] < 0) |
    (age_df["CleanAge"] > 120)
)

# Set invalid cleaned ages to missing
age_df.loc[invalid_age, "CleanAge"] = float("nan")

# Create age status
age_df["AgeStatus"] = "Valid"
age_df.loc[invalid_age, "AgeStatus"] = "Needs Review"

# Save results
age_df.to_csv(
    "output/age_cleaning_results.csv",
    index=False
)

print("\nAGE CLEANING SUMMARY")
print("-------------------------")
print("Valid Ages:", (~invalid_age).sum())
print("Ages Needing Review:", invalid_age.sum())
print("Age Cleaning Results Saved!")

# Step 15: Validate Email, Date and Purchase Amount

final_df = age_df.copy()

# 1. Email validation
email_valid = (
    final_df["Email"]
    .astype("string")
    .str.fullmatch(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
    )
    .fillna(False)
)

final_df["EmailStatus"] = "Valid"
final_df.loc[~email_valid, "EmailStatus"] = "Needs Review"

# 2. Registration date validation
parsed_dates = pd.to_datetime(
    final_df["RegistrationDate"],
    errors="coerce",
    format="mixed"
)

final_df["CleanDate"] = parsed_dates

final_df["DateStatus"] = "Valid"
final_df.loc[
    parsed_dates.isna(), "DateStatus"
] = "Needs Review"

# 3. Purchase amount validation
amount = pd.to_numeric(
    final_df["PurchaseAmount"],
    errors="coerce"
)

final_df["CleanPurchaseAmount"] = amount

# Negative values may be refunds
purchase_issue = amount.isna() | (amount < 0)

final_df["PurchaseStatus"] = "Valid"
final_df.loc[
    purchase_issue, "PurchaseStatus"
] = "Needs Review"

# 4. Save results
final_df.to_csv(
    "output/validated_customer_data.csv",
    index=False
)

# 5. Display summary
print("\nFINAL COLUMN VALIDATION")
print("-------------------------")
print("Invalid Emails:", (~email_valid).sum())
print("Invalid Dates:", parsed_dates.isna().sum())
print("Purchases Needing Review:", purchase_issue.sum())

print("\nValidated Customer Data Saved!")
