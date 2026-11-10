# OweMate

OweMate is an AI-powered WhatsApp debt management assistant for individuals and small businesses. This repository contains a React frontend and a Go API starter; debt workflows, AI, authentication, and WhatsApp integration are not implemented yet.

## Prerequisites

- Node.js 20.19+ or 22.12+, with npm
- Go 1.25 or newer
- MongoDB running locally or available through MongoDB Atlas

## Frontend

```cmd
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Vite serves the frontend at `http://localhost:5173`. The frontend example environment file contains `VITE_API_URL`; it is reserved for future API integration.

## Backend

```powershell
Set-Location .\backend
go mod download
$env:MONGODB_URI = "mongodb://localhost:27017"
$env:MONGODB_DATABASE = "owemate"
$env:DEVELOPMENT_OWNER_ID = "local-development-owner"
$env:PORT = "8080"
go run ./cmd/server
```

The API listens at `http://localhost:8080`. `GET /health` reports whether the API process is running; `GET /ready` reports MongoDB connectivity. The server can start while MongoDB is unavailable, but readiness will return `503` until it can connect. `PORT` defaults to `8080`; `MONGODB_DATABASE` defaults to `owemate`.

### Debt API

- `POST /api/v1/debts` creates a debt.
- `GET /api/v1/debts` and `GET /api/v1/debts/` list debts. Optional query parameters: `direction`, `status`, `page`, and `limit` (maximum 100).
- `GET /api/v1/debts/:id` retrieves one debt.
- `PATCH /api/v1/debts/:id` updates supported descriptive fields, direction, original amount, due date, or notes. Repayment and outstanding amounts are server-calculated and cannot be patched.
- `DELETE /api/v1/debts/:id` deletes one debt.

Example create request (amounts are JSON naira values with at most two decimal places; the backend stores integer kobo):

```json
{
  "person_name": "Chinedu Okafor",
  "direction": "owed_to_me",
  "description": "Stock purchase",
  "original_amount": 12500.5,
  "due_date": "2026-11-15",
  "notes": "Pay by bank transfer"
}
```

Without authentication, all debt requests use the single `DEVELOPMENT_OWNER_ID` configured in the server environment. Request bodies cannot select an owner. This is a local development isolation strategy only and must be replaced with the authenticated user identity from middleware before production deployment.

## Environment configuration

`frontend/.env.example` and `backend/.env.example` contain example configuration only. Vite loads frontend `.env` files automatically. The Go server reads `MONGODB_URI`, `MONGODB_DATABASE`, `DEVELOPMENT_OWNER_ID`, and `PORT` from the process environment; `MONGODB_URI` and `DEVELOPMENT_OWNER_ID` are required, while database and port default to `owemate` and `8080`. The backend example file documents the values but is not loaded automatically. In PowerShell, set them with `$env:NAME = "value"` in the same terminal before running the server.

Never commit real credentials or API keys. No OpenAI or WhatsApp credentials are needed for this starter.
