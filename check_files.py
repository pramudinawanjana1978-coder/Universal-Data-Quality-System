
from pathlib import Path

input_folder = Path("input_files")

csv_files = list(input_folder.glob("*.csv"))

print("CSV Files Found:", len(csv_files))

for file in csv_files:
    print("Processing:", file.name)
