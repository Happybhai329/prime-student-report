# The Prime Classes — Student Report Dashboard

> **A High-Performance Full-Stack Educational Web Application & Institutional Report Card Generator**  
> *The Prime Classes — RIMC | RMS | SAINIK SCHOOL | FOUNDATION*

---

## 📌 Overview

The **Student Report Dashboard** is a modern, responsive, mobile-first web application engineered to replace legacy Google Apps Script workflows. It delivers sub-second student record searches, comprehensive academic analytics, real-time Google Sheets synchronization, and institutional-quality PDF report card generation for faculty and administrators at **The Prime Classes**.

---

## ✨ Features

- **🔐 Faculty Authentication**: Secure, instant login using active Employee IDs validated against the Employee Master Database.
- **⚡ Lightning-Fast Search**: Sub-second search across tens of thousands of student records by name or student ID.
- **📊 Interactive Academic Analytics**:
  - Key Performance Indicators: Total marks, percentage, overall batch rank, tests attended.
  - Visual charts for subject-wise performance breakdown and chronological test progression using Chart.js.
- **📄 Institutional PDF Report Cards**:
  - High-resolution, printable PDF generation (both client-side and server-side).
  - Official institutional branding with "The Prime Classes" logo, address, contact details, grading tables, and authorized signature blocks.
- **🔄 High-Performance Sync Engine**:
  - Dual-database architecture: PostgreSQL (Supabase / Render Postgres) with automatic local SQLite3 fallback.
  - Chunked multi-row batch inserts (`1,000` rows/query) enabling sync of 257,000+ records across 3 Google Spreadsheets in ~70 seconds.
  - Automated 15-minute background synchronization.
- **📝 Faculty Complaint Outbox**:
  - Direct logging of student academic or behavioral issues with automatic two-way sync back to the Teacher App Google Sheet.
- **📱 Mobile-First Responsive Design**:
  - Modern institutional theme featuring TPC purple (`#6b21a8`) and victory green (`#16a34a`).
  - Zero text overlap on mobile screens, touch-friendly hit targets (≥ 44px), and adaptive glassmorphism containers.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Chart.js, React-ChartJS-2, Lucide React, Modern CSS3 |
| **Backend** | Node.js (ESM), Express.js, Google APIs (`googleapis` v4) |
| **Database** | PostgreSQL (`pg`), SQLite3 (local fallback) |
| **Document Engine** | jsPDF, jsPDF-AutoTable |
| **Deployment** | Render (Web Service / Blueprint), Docker-ready |

---

## 📁 Project Structure

```
student-report-full-stack/
├── public/
│   └── tpc-logo.jpg              # Institutional branding logo
├── server/
│   ├── assets/
│   │   └── tpc-logo.jpg          # Logo asset for server-side PDF generation
│   ├── db.js                     # Dual PostgreSQL / SQLite database manager
│   ├── googleSheets.js           # Google Sheets API v4 connector with JWT auth
│   ├── index.js                  # Express server & REST API routes
│   ├── pdfGenerator.js           # Server-side PDF report card generator
│   └── syncEngine.js             # High-speed chunked database sync engine
├── src/
│   ├── components/
│   │   ├── AnalyticsCharts.jsx   # Subject breakdown & trend charts
│   │   ├── ComplaintsModal.jsx   # Complaint submission modal
│   │   ├── LoginView.jsx         # Faculty login screen
│   │   ├── ReportView.jsx        # Complete student report card view
│   │   ├── StudentSearch.jsx     # Search bar and student card list
│   │   └── TopNavbar.jsx         # Header with branding & sync status
│   ├── styles/
│   │   └── main.css              # Institutional design system & responsive rules
│   ├── App.jsx                   # Root application state & routing
│   └── main.jsx                  # React DOM entry point
├── .env.example                  # Environment variables template
├── package.json                  # Dependencies and scripts
├── render.yaml                   # Render deployment blueprint
└── vite.config.js                # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- A PostgreSQL database (e.g. Supabase, Render Postgres) or local SQLite

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Happybhai329/prime-student-report.git
   cd prime-student-report
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   ```env
   NODE_ENV=production
   PORT=10000

   # Database (PostgreSQL / Supabase)
   DATABASE_URL=postgresql://user:password@host:5432/dbname

   # Google Service Account Credentials
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Spreadsheet IDs
   EMPLOYEE_DB_ID=1AxdiOpaij8Lnx0TV5iMhgVlADfN0LeXzwOdmbzmrlGA
   ACADEMIC_DB_ID=1DK4OpEdEDh2z_Ng9vIHbci41yBLSQ2m4ZXI7sqA7mJs
   TEACHER_APP_DB_ID=1IR48k48Koil2lHv_coP8yBmLYUcGBOy_9xgdd9t6YR8
   ```

4. **Build the frontend**:
   ```bash
   npm run build
   ```

5. **Start the application**:
   ```bash
   npm start
   ```
   The dashboard will be live at `http://localhost:10000`.

---

## 🌐 Deploy to Render

This project includes a [`render.yaml`](render.yaml) blueprint for one-click deployment:

1. Connect your repository in [Render Dashboard](https://dashboard.render.com).
2. Create a **New +** &rarr; **Blueprint** or **Web Service**.
3. Set your environment variables (`DATABASE_URL`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`).
4. Render will run `npm install && npm run build` and launch via `npm start`.

---

## 📄 License

Proprietary — Internal Use Only for **The Prime Classes**. All rights reserved.
