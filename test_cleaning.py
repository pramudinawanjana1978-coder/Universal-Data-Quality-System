
import pandas as pd

from main import clean_data

# Create a small test dataset
test_data = pd.DataFrame({
    "CustomerID": [1, 2, 3],
    "Name": [
        "  Nimal  ",
        "  Kamal",
        "Sunil  "
    ],
    "City": [
        "  Colombo ",
        "Kandy  ",
        "  Galle"
    ]
})

print("BEFORE CLEANING")
print(test_data.to_string(index=False))

# Apply our cleaning function
cleaned_data, audit_log = clean_data(test_data)

print("\nAFTER CLEANING")
print(cleaned_data.to_string(index=False))

print("\nAUDIT LOG")
print(audit_log.to_string(index=False))

print("\nTotal Changes:", len(audit_log))

# Check that cleaning worked
assert cleaned_data["Name"].tolist() == [
    "Nimal", "Kamal", "Sunil"
]

assert cleaned_data["City"].tolist() == [
    "Colombo", "Kandy", "Galle"
]

# Check original data is unchanged
assert test_data.loc[0, "Name"] == "  Nimal  "

assert len(audit_log) == 6

print("\nALL TESTS PASSED!")
