# OweMate

OweMate is an AI-powered WhatsApp debt management assistant for individuals and small businesses. This repository contains a React frontend and a Go API starter; debt workflows, AI, authentication, and WhatsApp integration are not implemented yet.

## Prerequisites

- Node.js 20.19+ or 22.12+, with npm
- Go 1.23 or newer
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

```cmd
cd backend
go mod download
set MONGODB_URI=mongodb://localhost:27017/owemate
set PORT=8080
go run ./cmd/server
```

The API listens at `http://localhost:8080`; verify it with `http://localhost:8080/health`. MongoDB must be reachable at `MONGODB_URI` when the server starts. `PORT` is optional and defaults to `8080`.

## Environment configuration

`frontend/.env.example` and `backend/.env.example` contain placeholder configuration only. Vite loads frontend `.env` files automatically. The Go server reads `MONGODB_URI` and `PORT` from the process environment; its example file documents the values but is not loaded automatically. In Windows CMD, use `set NAME=value` in the same terminal before running the server.

Never commit real credentials or API keys. No OpenAI or WhatsApp credentials are needed for this starter.