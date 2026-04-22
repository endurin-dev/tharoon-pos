# 🥐 Bakery Management System

A fast, keyboard-driven bakery issue & billing web app built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.

## Features

- **Issue Food Items** — Excel-like grid with full keyboard navigation (Enter/Tab/Arrow keys)
- **Category & Item Management** — CRUD for food categories and items with pricing
- **Employee Management** — Register employees with NIC and contact
- **Vehicle Management** — Register vehicles and assign to employees
- **Session Control** — Morning / Full Day sessions per employee per date
- **Auto Calculations** — Total Cost, Total Selling, Balance auto-computed per row and grand total
- **Bill Generation** — Printable receipt modal
- **Daily Summary** — View all sessions for a given date

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (raw SQL via `pg`, no ORM)

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Edit `.env.local`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/bakery_db
```

### 4. Initialize the database
Start the dev server:
```bash
npm run dev
```

Navigate to **⚙️ DB Setup** in the sidebar and click **Initialize Database**.  
This runs the schema SQL and seeds default categories, items, employees, and vehicles.

### 5. Start using the app
Go to **📦 Issue Items** — select a date, employee, and start entering quantities!

## Keyboard Navigation (Issue Grid)

| Key | Action |
|-----|--------|
| `Enter` / `Tab` | Move to next input field (left→right, top→bottom) |
| `↑` / `↓` | Move to same column, previous/next row |
| `←` / `→` | Move to previous/next field in same row |

## Project Structure

```
bakery-mgmt/
├── app/
│   ├── page.tsx              # Main Issue Items page
│   ├── categories/page.tsx   # Category management
│   ├── items/page.tsx        # Item management
│   ├── employees/page.tsx    # Employee management
│   ├── vehicles/page.tsx     # Vehicle management
│   ├── setup/page.tsx        # DB initialization
│   └── api/
│       ├── categories/route.ts
│       ├── items/route.ts
│       ├── employees/route.ts
│       ├── vehicles/route.ts
│       ├── issues/route.ts
│       └── init/route.ts
├── components/
│   ├── IssueGrid.tsx         # Core Excel-like data entry grid
│   ├── BillModal.tsx         # Printable bill modal
│   ├── SummaryModal.tsx      # Daily summary modal
│   └── Sidebar.tsx           # Navigation sidebar
├── lib/
│   ├── db.ts                 # PostgreSQL pool + query helpers
│   ├── schema.sql            # Full DB schema + seed data
│   └── types.ts              # TypeScript interfaces
└── .env.local                # DATABASE_URL configuration
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT/DELETE | `/api/categories` | Category CRUD |
| GET/POST/PUT/DELETE | `/api/items` | Item CRUD |
| GET/POST/PUT/DELETE | `/api/employees` | Employee CRUD |
| GET/POST/PUT/DELETE | `/api/vehicles` | Vehicle CRUD |
| GET/POST/DELETE | `/api/issues` | Issue session CRUD |
| POST | `/api/init` | Run DB schema + seed |
