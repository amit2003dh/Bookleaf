# BookLeaf Author Support & Operations Portal

## Overview
This repository contains the full source code for the **BookLeaf** author support portal – a web application that lets authors view their books, check royalties, and raise support tickets. It includes a modern frontend built with React + Vite and a backend API built with Node.js, Express, and MongoDB Atlas. An AI assistant (Gemini) helps staff draft ticket responses.

---

## 📦 Project Structure
```
Bookleaf/
├─ backend/        # Express server, Mongoose models, authentication, WebSocket handling
├─ frontend/       # React + Vite UI, context, pages, components
│   ├─ src/        # Application source code
│   └─ public/     # Static assets (favicon, index.html)
├─ .gitignore
├─ .env.example   # Example backend env file (copy to .env and fill values)
├─ frontend/.env  # Frontend env – defines VITE_BACKEND_URL
└─ README.md
```

---

## 🚀 Local Setup & Run
1. **Clone the repository**
   ```bash
   git clone <repo‑url>
   cd Bookleaf
   ```
2. **Backend**
   ```bash
   cd backend
   cp .env.example .env          # edit with your MongoDB Atlas URI and a JWT secret
   npm install
   npm run dev   # runs on http://localhost:5000
   ```
3. **Frontend**
   ```bash
   cd ../frontend
   npm install
   # The .env created above already sets VITE_BACKEND_URL to http://localhost:5000
   npm run dev   # runs on http://localhost:3000
   ```
4. Open **http://localhost:3000** in your browser. Use the demo credentials:
   - Author: `priya.sharma@email.com` / `password123`
   - Admin : `admin@bookleafpub.com` / `admin123`

---

## 🏗️ Architecture Decisions & Rationale
| Layer | Technology | Why? |
|-------|------------|------|
| **Frontend** | React + Vite | Fast bundling, hot‑module replacement, and a component‑driven UI that matches the premium design system. |
| **Backend** | Node.js + Express | Simple, lightweight HTTP server; easy integration with Socket.io for real‑time updates. |
| **Database** | MongoDB Atlas | Managed, scalable NoSQL store; fits the document‑centric shape of books and tickets. |
| **Realtime** | Socket.io | Enables instant ticket status updates and chat without polling. |
| **AI Assistant** | Gemini (via `@google/generative-ai`) | Provides on‑the‑fly draft replies; fallback to local heuristics when the API key is missing. |
| **Env‑Based Config** | `VITE_BACKEND_URL` in `frontend/.env` & `process.env` in backend | Allows the same codebase to run locally, on staging, or in production without code changes. |

---

## 🤖 AI Integration Details
- **Prompt Strategy** – When an admin opens a ticket, the client sends the ticket text to the backend which builds a concise prompt:
  ```
  "You are a helpful support agent for BookLeaf. Summarize the author's issue and suggest a polite response. Keep it under 150 words."
  ```
  The prompt includes the ticket history to give context.
- **Error Handling** – If the Gemini API call fails (network error, quota exceeded, or missing `GEMINI_API_KEY`), the backend catches the exception and returns a generic template:
  ```
  "Thank you for reaching out. We are looking into your query and will get back shortly."
  ```
- **Cost Management** – Calls are only made when the admin explicitly clicks **"Generate AI Draft"**. We do not pre‑fetch drafts for every ticket, keeping usage low. If the API key is not configured, the system automatically falls back to a rule‑based heuristic, incurring no cost.

---

## 📚 API Documentation
The backend exposes a RESTful JSON API under the `/api` namespace. Below is a brief overview; the full Swagger/OpenAPI spec can be accessed at:

```
GET http://localhost:5000/api-docs
```
(When running locally, open this URL in a browser.)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Email/password login, returns JWT. |
| `/api/books` | GET | List books for the authenticated author. |
| `/api/tickets` | GET | Get tickets belonging to the author. |
| `/api/tickets` | POST | Create a new support ticket. |
| `/api/admin/tickets` | GET | Admin view of all tickets (filterable). |
| `/api/admin/tickets/:id` | PATCH | Update ticket status or add a response. |
| `/api/ai/draft` | POST | Generate an AI draft response for a ticket (admin only). |

---

## ⚠️ Known Limitations & Future Improvements
- **Authentication** – Only simple email/password; adding OTP or OAuth would improve security.
- **File Upload** – UI supports attachment UI, but the backend currently stores files locally; a cloud storage integration (S3) is planned.
- **Mobile Responsiveness** – The design works on most screens, but some components need fine‑tuning for very small devices.
- **AI Accuracy** – The Gemini model may produce generic or occasionally incorrect replies; a reviewer‑in‑the‑loop approach is essential.
- **Testing** – End‑to‑end tests are minimal; expanding the test suite (Jest + Cypress) would increase reliability.
- **Performance** – For very high ticket volume, pagination and query indexing could be optimized.
- **Documentation** – Generating automatic API docs (Swagger) and adding a `CONTRIBUTING.md` would help external contributors.

---

## 🙋‍♀️ Need Help?
- Open an **issue** on the repository.
- Contact the admin account: `admin@bookleafpub.com`.
- Check the **FAQ** section in the UI (bottom of the dashboard).

Enjoy building and using the portal! 🚀
