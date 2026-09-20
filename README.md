# 🎓 The Prime Classes — Student Report Dashboard

<div align="center">

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1.0-646C99?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E=18.0.0-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express&logoColor=white&style=for-the-badge)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.13.1-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![SQLite](https://img.shields.io/badge/SQLite-5.1.7-003B57?logo=sqlite&logoColor=white&style=for-the-badge)](https://www.sqlite.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4.7-FF6384?logo=chartdotjs&logoColor=white&style=for-the-badge)](https://www.chartjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#-license)

**A high-performance full-stack educational analytics platform and institutional report card generator engineered for *The Prime Classes* (RIMC | RMS | SAINIK SCHOOL | FOUNDATION).**

[Features](#-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Environment Variables](#-environment-variables) • [Project Structure](#-project-structure) • [API Reference](#-api-reference) • [Deployment](#-deployment)

---

</div>

## 📌 Overview

The **Student Report Dashboard** is a modern, responsive, mobile-first full-stack web application designed to replace slow, legacy Google Apps Script workflows. It delivers sub-second student record searches across hundreds of thousands of records, comprehensive interactive academic analytics, automated background synchronization with Google Sheets, and institutional-grade PDF report card generation for faculty and administrators.

---

## 🚀 Features

- **🔐 Faculty Authentication**: Secure, instant login using active Employee IDs validated against the central Employee Master Database.
- **⚡ Lightning-Fast Search**: Sub-second search across tens of thousands of student records by name or unique student ID with debounced indexing.
- **📊 Interactive Academic Analytics**:
  - **Key Performance Indicators (KPIs)**: Instant display of aggregate marks, percentage, overall batch rank, and test attendance rates.
  - **Visual Subject Breakdown**: Polar/bar/radar visualizations comparing student performance against subject benchmarks.
  - **Chronological Progress Tracking**: Interactive trend lines mapping test-by-test academic trajectory powered by Chart.js.
- **📑 Institutional PDF Report Cards**:
  - High-resolution, printable PDF generation supported both client-side and server-side via `jspdf` and `jspdf-autotable`.
  - Official institutional branding with **The Prime Classes** emblem, address, student credentials, categorized marks tables, and authorized signatory blocks.
- **🔄 High-Performance Dual-Sync Engine**:
  - **Dual-Database Resilience**: Primary connection to PostgreSQL (Supabase / Render Postgres) with automatic local SQLite3 fallback for zero downtime.
  - **High-Throughput Ingestion**: Chunked multi-row batch inserts (`1,000` rows/query) synchronizing 257,000+ rows across 3 Google Spreadsheets in ~70 seconds.
  - **Automated Cron Sync**: Periodic 15-minute background synchronization maintaining data freshness.
- **📝 Faculty Complaint Outbox**:
  - Direct logging of student behavioral or academic concerns with bidirectional synchronization back to the Teacher App Google Sheet.
- **📱 Mobile-First Responsive Design**:
  - Built with custom design system tokens: TPC Purple (`#6b21a8`) and Victory Green (`#16a34a`).
  - Adaptive glassmorphic UI cards, zero text clipping on compact viewports, and touch-optimized hit areas (≥ 44px).

---

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Clients["Faculty Clients"]
        Mobile["📱 Mobile Browser"]
        Desktop["💻 Desktop Browser"]
    end

    subgraph Frontend["React 18 + Vite SPA"]
        TopNav["TopNavbar (Sync State & User Info)"]
        AuthView["LoginView (Employee ID)"]
        Search["StudentSearch (Debounced Query)"]
        Report["ReportView (KPIs & Grades)"]
        Charts["AnalyticsCharts (Chart.js)"]
        Complaints["ComplaintsModal (Outbox)"]
    end

    subgraph Backend["Express.js Server (Node.js ESM)"]
        APIRouter["REST API Endpoints"]
        PDFGen["PDF Report Generator (jsPDF)"]
        SyncWorker["Sync Engine (15-min Cron / Manual)"]
        SheetsConnector["Google Sheets Connector (JWT Auth)"]
    end

    subgraph Storage["Dual Database Architecture"]
        PG[("PostgreSQL\n(Supabase / Render)")]
        SQLITE[("SQLite3\n(Local Failover)")]
    end

    subgraph External["Google Workspace"]
        EmpSheet["Employee Master Sheet"]
        AcadSheet["Academic Marks Sheet"]
        TeachSheet["Teacher App Sheet"]
    end

    Mobile --> Frontend
    Desktop --> Frontend
    Frontend --> APIRouter
    APIRouter --> Storage
    APIRouter --> PDFGen
    SyncWorker --> SheetsConnector
    SheetsConnector --> External
    SyncWorker --> PG
    SyncWorker -. Fallback .-> SQLITE
    PG -. Primary Failover .-> SQLITE
```

---

## 🛠️ Tech Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) | Component-based UI library with modern hooks |
| **Build Tool** | [Vite 6](https://vitejs.dev/) | Next-generation frontend bundler & dev server |
| **Data Visualization** | [Chart.js 4](https://www.chartjs.org/) & [React-Chartjs-2](https://react-chartjs-2.js.org/) | Interactive academic progress charts and subject radars |
| **Icons & Design** | [Lucide React](https://lucide.dev/) | Clean, consistent icons |
| **Styling** | Modern CSS3 | Custom CSS variables, glassmorphic themes, responsive layout |
| **Backend Runtime** | [Node.js](https://nodejs.org/) (ESM) | v18+ asynchronous JavaScript runtime |
| **Web Framework** | [Express 4](https://expressjs.com/) | RESTful API server routing and middleware |
| **Primary Database** | [PostgreSQL (`pg`)](https://node-postgres.com/) | Relational database (Supabase / Render Postgres) |
| **Fallback Database**| [SQLite3](https://github.com/TryGhost/node-sqlite3) | Self-contained, serverless local database for failover |
| **External Integration** | [googleapis (v4)](https://github.com/googleapis/google-api-nodejs-client) | Google Sheets API v4 client with Service Account JWT |
| **PDF Engine** | [jsPDF](https://github.com/parallax/jsPDF) & [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) | Client and server-side institutional PDF generation |
| **Deployment** | [Render](https://render.com/) | Cloud web service deployment via `render.yaml` |

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL Database**: Supabase, Render PostgreSQL, or any cloud/local Postgres instance *(optional: SQLite3 will automatically activate as fallback if no Postgres URL is provided)*
- **Google Cloud Service Account**: With Google Sheets API enabled and `Editor` permissions granted on the institutional spreadsheets

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Happybhai329/prime-student-report.git
cd prime-student-report
```

### 2. Install dependencies

```bash
npm install
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
# Application Environment & Port
NODE_ENV=production
PORT=10000

# Database Configuration (PostgreSQL / Supabase / Render Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Google Cloud Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Google Spreadsheet IDs
EMPLOYEE_DB_ID=1AxdiOpaij8Lnx0TV5iMhgVlADfN0LeXzwOdmbzmrlGA
ACADEMIC_DB_ID=1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs
TEACHER_APP_DB_ID=1IR48k48Koil2lHv_coP8yBmLVUcGBOy_9xgdd9t6YR8
```

> [!IMPORTANT]
> Ensure the Service Account Email is shared as an **Editor** or **Viewer** on each of the three Google Sheets referenced by ID.

---

## 🏃 Running the Application

### Development Mode

Run the backend server and frontend client concurrently:

```bash
# Terminal 1: Launch Backend API Server
npm run dev:server

# Terminal 2: Launch Vite Frontend Dev Server
npm run dev
```

The frontend will run at `http://localhost:5173` and proxy API calls to the server at `http://localhost:10000`.

### Production Build & Launch

```bash
# 1. Build the production frontend assets
npm run build

# 2. Start the full-stack server
npm start
```

The unified dashboard will be accessible at:
```
http://localhost:10000
```

---

## 📂 Project Structure

```
prime-student-report/
├── .env.example                  # Environment variables template
├── .gitignore                    # Git exclusions
├── index.html                    # Vite HTML entry template
├── package.json                  # Project manifest, dependencies & scripts
├── render.yaml                   # Render cloud infrastructure blueprint
├── vite.config.js                # Vite build and proxy configuration
├── public/
│   └── tpc-logo.jpg              # Institutional branding emblem
├── server/
│   ├── assets/
│   │   └── tpc-logo.jpg          # Logo asset for server-side PDF generation
│   ├── db.js                     # Dual PostgreSQL & SQLite database client
│   ├── googleSheets.js           # Google Sheets API v4 connector with JWT auth
│   ├── index.js                  # Express API server, endpoints & static serve
│   ├── pdfGenerator.js           # Server-side jsPDF report card compiler
│   └── syncEngine.js             # Chunked batch sync worker & scheduler
└── src/
    ├── App.jsx                   # Application router and global session state
    ├── main.jsx                  # React DOM root entry point
    ├── components/
    │   ├── AnalyticsCharts.jsx   # Radar, bar, and line progression charts
    │   ├── ComplaintsModal.jsx   # Faculty complaint entry modal & sync
    │   ├── LoginView.jsx         # Faculty Employee ID login interface
    │   ├── ReportView.jsx        # Detailed report card & marks breakdown
    │   ├── StudentSearch.jsx     # Debounced student search input & list
    │   └── TopNavbar.jsx         # Branding header, sync status & actions
    └── styles/
        └── main.css              # TPC design system, variables & responsive rules
```

---

## 🔌 API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/login` | Authenticate faculty member by Employee ID | No |
| `GET` | `/api/students/search?q={query}` | Search students by name or registration number | Yes |
| `GET` | `/api/students/:id/report` | Fetch student details, test results, and rank analytics | Yes |
| `GET` | `/api/students/:id/pdf` | Generate and download official PDF report card | Yes |
| `POST` | `/api/complaints` | File student feedback/complaint (syncs to Google Sheet) | Yes |
| `POST` | `/api/sync` | Trigger an on-demand database sync from Google Sheets | Admin |
| `GET` | `/api/sync/status` | Retrieve status and timestamp of the latest sync | Yes |

---

## 🚀 Deployment

### Deploy to Render

This repository includes a [`render.yaml`](render.yaml) blueprint configuration for deployment on [Render](https://render.com/):

1. Fork or push this repository to GitHub.
2. Log in to the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint** and connect this repository.
4. Supply your secret environment variables:
   - `DATABASE_URL` (or provision a managed Render PostgreSQL database)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `EMPLOYEE_DB_ID`, `ACADEMIC_DB_ID`, `TEACHER_APP_DB_ID`
5. Render will run `npm install && npm run build` and start the server using `npm start`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Proprietary — Internal institutional use only for **The Prime Classes**. All rights reserved.

---

## 👤 Author

**Happybhai329**
- GitHub: [@Happybhai329](https://github.com/Happybhai329)
