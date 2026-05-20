# BookLeaf Author Support & Operations Portal

Hey there!

Welcome to the BookLeaf portal – the place where authors can manage their books, check royalties, and get help from our friendly support team. This repo contains the full source code for the web app (frontend) and the API server (backend).

---

## What Does This Project Do?
- Author Dashboard – See your published books, royalties, and ticket history.
- Support tickets – Raise a query (book‑specific or general) and track its status.
- Admin Dashboard – Ops team can view, prioritize, and reply to tickets in real‑time.
- AI‑powered assistant – Generates draft replies to speed up support.
- Live sync – Thanks to WebSockets, updates appear instantly for both authors and staff.

All of this runs on a sleek, modern UI with glass‑morphism, subtle animations, and a dark theme.

---

## Quick Start (Run Locally)
1. Clone the repo
   ```bash
   git clone <repo‑url>
   cd Bookleaf
   ```
2. Install dependencies
   ```bash
   # Backend (Node/Express)
   cd backend
   npm install

   # Frontend (React + Vite)
   cd ../frontend
   npm install
   ```
3. Configure environment
   - Create a `.env` file in `backend/` with your MongoDB connection string:
     ```
     MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.tgnzaxk.mongodb.net/bookleaf
     JWT_SECRET=your‑secret‑key
     ```
   - The frontend reads the API URL from `vite.config.ts` (default `http://localhost:5000`).
4. Run the apps
   ```bash
   # Terminal 1 – Backend
   cd backend
   npm run dev   # starts on http://localhost:5000

   # Terminal 2 – Frontend
   cd ../frontend
   npm run dev   # starts on http://localhost:3000
   ```
5. Open your browser at **http://localhost:3000** and you’ll see the login page. Use the demo accounts:
   - Author: `priya.sharma@email.com` / `password123`
   - Admin: `admin@bookleafpub.com` / `admin123`

---

## Project Structure
```
Bookleaf/
├─ backend/        # Express server, Mongoose models, auth & sockets
├─ frontend/       # React + Vite UI
│   ├─ src/        # Components, pages, context providers
│   └─ public/     # Static assets (favicon, index.html)
├─ .gitignore
└─ README.md
```

---

## Key Features (in plain words)
- Login – Simple email/password (no OTP needed).
- My Books – Table with title, ISBN, genre, status, royalties.
- Submit Ticket – Choose a book (or “General”), write a subject & description, attach files (optional).
- My Tickets – See all your tickets with status badges.
- Admin Queue – Filter by status/priority/category, search, assign tickets, update status.
- AI Draft – Click a button to let Gemini suggest a reply, then edit or send.
- Real‑time Chat – Live chat view inside each ticket.

---

## Tech Stack
- Frontend: React, Vite, custom vanilla stylesheet, Lucide icons, Socket.io client.
- Backend: Node.js, Express, Mongoose (MongoDB Atlas), JWT auth, Socket.io server.
- AI: Gemini (fallback to local heuristics).

---

## Deploy (optional)
- Build the frontend: `npm run build` (inside `frontend`).
- Deploy the backend to any Node host (Heroku, Render, Railway, etc.).
- Set the same `MONGODB_URI` and `JWT_SECRET` in the host’s environment variables.

---

## Need Help?
- Open an issue on the repo.
- Ping the admin account (`admin@bookleafpub.com`).
- Check the FAQ section in the UI (bottom of the dashboard).

Enjoy building and using the portal!
