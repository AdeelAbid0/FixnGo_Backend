# FixnGo — Backend API

FixnGo is an online car-services booking platform. This repository contains the backend REST API that powers the customer, partner (service provider), and superadmin (super admin) mobile/web applications.

This document is intended for the person responsible for deploying and hosting this application on a server.

---

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Language / Runtime | JavaScript (Node.js), ES Modules (`"type": "module"`) |
| Web Framework | Express.js 5 |
| Database | MongoDB (via Mongoose ODM) |
| Authentication | JSON Web Tokens (JWT) — access token + refresh token, stored in HTTP-only cookies |
| Password Hashing | bcrypt |
| Social Login | Google OAuth (`google-auth-library`) |
| File Uploads | Multer (temporary local disk storage) → Cloudinary (permanent image hosting/CDN) |
| Transactional Email | SendGrid (`@sendgrid/mail`) |
| Process Development Tool | Nodemon (development only) |
| Code Formatting | Prettier |

**Node.js version used in development:** `v22.20.0` (npm `10.9.3`)
Recommended minimum for production: **Node.js 18 LTS or higher**.

### Key npm dependencies
```
express, mongoose, jsonwebtoken, bcrypt, cors, cookie-parser, dotenv,
multer, cloudinary, @sendgrid/mail, google-auth-library
```

---

## 2. Project Structure (high level)

```
src/
  index.js           → application entry point (starts server, connects DB)
  app.js              → Express app setup (middleware, routes, CORS, error handler)
  db/                 → MongoDB connection logic
  models/             → Mongoose schemas (User, Partner, Service, Booking, etc.)
  controllers/         → Business logic for each module
  routes/              → API route definitions
  middlewares/         → Auth, role-check, and file-upload (Multer) middleware
  utils/               → Helpers (Cloudinary, mailer, API response/error wrappers)
public/temp/            → Temporary local folder used during file upload before Cloudinary push
```

The API is versioned and exposed under the base path `/api/v1`, e.g.:
```
/api/v1/auth
/api/v1/customers
/api/v1/partners
/api/v1/services
/api/v1/categories
/api/v1/bookings
/api/v1/dashboard
/api/v1/superadmin
```

---

## 3. External Services Required

Before deployment, accounts/credentials must be available for the following services:

1. **MongoDB** — a running MongoDB instance/cluster (e.g. MongoDB Atlas or a self-hosted server).
2. **Cloudinary** — used to store and serve uploaded images (profile pictures, partner service images, etc.).
3. **SendGrid** — used to send transactional emails (OTP/verification emails, etc.).
4. **Google Cloud Console (OAuth Client)** — used for "Sign in with Google" functionality.

---

## 4. Environment Variables

The application is configured entirely through environment variables, loaded via a `.env` file at the project root (using the `dotenv` package). **No `.env` file is committed to the repository** — it must be created manually on the server.

Create a file named `.env` in the project root with the following keys:

```env
# --- Server ---
PORT=8000
CORS_ORIGIN=https://your-frontend-domain.com,https://your-admin-panel-domain.com

# --- Database ---
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/

# --- JWT Auth ---
ACCESS_TOKEN_SECRET=<a-long-random-secret-string>
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=<a-different-long-random-secret-string>
REFRESH_TOKEN_EXPIRY=10d

# --- Cloudinary (image uploads) ---
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# --- SendGrid (emails) ---
SENDGRID_API_KEY=<sendgrid-api-key>
MAIL_FROM=no-reply@your-domain.com

# --- Google OAuth (Google login) ---
GOOGLE_CLIENT_ID=<google-oauth-client-id>

# --- Initial Superadmin account (created automatically on first server start) ---
SUPERADMIN_EMAIL=admin@your-domain.com
SUPERADMIN_PASSWORD=<a-strong-password>
```

**Notes:**
- `CORS_ORIGIN` accepts a comma-separated list of allowed frontend origins. Requests from origins not in this list will be rejected.
- `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` must be strong, random, and kept confidential (do not reuse the same value for both).
- The database name used inside MongoDB is fixed in code as `FIXnGO` — the connection string only needs to point to the cluster/server.
- On first startup, if `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` are set and no user with that email exists yet, a Superadmin account is created automatically.

---

## 5. Server / Filesystem Requirements

- The application writes temporarily uploaded files to `public/temp/` before pushing them to Cloudinary. **This directory must exist and be writable** by the process running the app (create it if it does not already exist after cloning the repository).
- The server must allow outbound HTTPS connections to: MongoDB, Cloudinary, SendGrid, and Google's OAuth verification endpoints.
- Recommended: run the app behind a reverse proxy (e.g. Nginx) that terminates SSL/TLS and forwards traffic to the Node.js process, and enable HTTPS for the public-facing domain (required for secure cookies to work correctly in production).

---

## 6. Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Create the .env file as described in Section 4

# 3. Ensure the temp upload folder exists
mkdir -p public/temp

# 4. Start the server
node src/index.js
```

There is currently no dedicated `npm start` script — the app is started by directly running `src/index.js` with Node.js.

For production, it is strongly recommended to run the app under a process manager such as **PM2** so that it automatically restarts on crashes and on server reboot:

```bash
npm install -g pm2
pm2 start src/index.js --name fixngo-backend
pm2 save
pm2 startup
```

The server listens on the port defined by the `PORT` environment variable (defaults to `8000` if not set).

---

## 7. Health Check

Once running, the API base routes should respond under:
```
http://<server-ip-or-domain>:<PORT>/api/v1/...
```
A simple way to verify the server is up is to hit any public `GET` endpoint (e.g. `/api/v1/services`) and confirm a JSON response is returned rather than a connection error.

---

## 8. Summary Checklist for the Hosting/Server Team

- [ ] Node.js 18+ installed on the server
- [ ] Repository cloned and `npm install` run
- [ ] `public/temp/` directory created and writable
- [ ] `.env` file created with all variables listed in Section 4
- [ ] MongoDB instance reachable from the server
- [ ] Cloudinary, SendGrid, and Google OAuth credentials configured and valid
- [ ] Reverse proxy (Nginx) + SSL certificate configured for the domain
- [ ] Process manager (PM2 or equivalent) set up to keep the app running
- [ ] Firewall allows inbound traffic on the configured port (via reverse proxy) and outbound HTTPS traffic
