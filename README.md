
# 📊 DataQuality 360
### Automated Data Quality Analysis & Cleaning Platform

A web-based data quality management application designed to help users identify, analyze, and resolve common data quality issues in CSV datasets.

DataQuality 360 provides interactive data profiling, validation, cleaning, visualizations, and downloadable reports through a modern dashboard.

## 🌐 Live Demo

**[Launch DataQuality 360](https://universal-data-quality-system.vercel.app)**

## 🎯 Project Objectives

- Simplify the data cleaning process.
- Identify missing, invalid, and duplicate records.
- Provide meaningful data quality insights.
- Support configurable data cleaning.
- Generate downloadable quality reports.
- Maintain transparency through cleaning audit logs.

## ✨ Key Features

### 1. CSV Dataset Upload
- Upload CSV files.
- Preview dataset records.
- Explore column information and dataset structure.

### 2. Data Quality Dashboard
- Total records and columns.
- Missing value analysis.
- Duplicate record analysis.
- Interactive data visualizations.

### 3. Data Validation
- Identify potential data quality issues.
- Review validation summaries.
- Explore issues requiring attention.

### 4. Smart Data Cleaning
- Apply supported data cleaning operations.
- Handle missing values.
- Review cleaned data.

### 5. Data Quality Reports
- Data quality summary.
- Cleaned dataset export.
- Quality report download.
- Cleaning audit log download.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| Data Processing | Pandas, NumPy |
| Data Visualization | Recharts |
| API Communication | REST APIs |
| Version Control | Git, GitHub |
| Deployment | Vercel |

## 🏗️ System Architecture

```text
           User
             |
             v
    React + Vite Frontend
             |
             v
       FastAPI REST API
             |
             v
     Python Data Processing
       (Pandas / NumPy)
             |
             v
   Validation & Data Cleaning
             |
             v
   Reports & CSV Downloads
```

## 🔄 Application Workflow

1. Upload a CSV dataset.
2. Preview and analyze the dataset.
3. Identify data quality problems.
4. Apply supported cleaning operations.
5. Review validation results.
6. Download reports and processed data.

## 📸 Application Screenshots

Screenshots will be added here.

Suggested screenshots:
- Dashboard Overview
- Dataset Preview
- Data Validation
- Smart Data Cleaning
- Reports & Downloads

## 💻 Running Locally

### Prerequisites

- Node.js
- Python 3.11+
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/pramudinawanjana1978-coder/Universal-Data-Quality-System.git
cd Universal-Data-Quality-System
```

### 2. Start the Backend

Install the Python dependencies defined in `pyproject.toml`.

```bash
pip install -e .
uvicorn backend.main:app --reload
```

### 3. Start the Frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the application:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

## 📚 Skills Demonstrated

- Data Cleaning and Preprocessing
- Data Quality Validation
- Exploratory Data Analysis
- Python Data Processing
- REST API Integration
- Interactive Data Visualization
- React Frontend Development
- Full-Stack Application Deployment
- Git and GitHub

## 🔮 Future Improvements

- Support Excel file uploads.
- Add more advanced data validation rules.
- Introduce configurable outlier detection.
- Support larger datasets.
- Add downloadable PDF reports.
- Improve data quality trend analysis.

## 👩‍💻 Developer

**Pramudi N.**

BSc (Hons) Computer Science & Technology  
Sabaragamuwa University of Sri Lanka

## 📄 Project Status

Portfolio project — deployed on Vercel, with ongoing testing and improvements.
