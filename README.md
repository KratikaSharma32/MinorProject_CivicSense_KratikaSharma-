# CivicSense.City Smart Civic Complaint System

A fully-featured, production-grade smart city complaint management platform with AI detection, real-time notifications, analytics, role-based access, Docker support, CI/CD pipelines, and full test coverage.

---

## ⚡ Quick Start (Local Development)

### Prerequisites
| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x LTS |
| npm | 9.x |
| MongoDB | 6.x (local) or Atlas URI |

### 1. Clone & Install
```bash
git clone <your-repo-url> civicpulse
cd civicpulse

# Install all dependencies at once
npm run install:all
# OR with make: make install
```

### 2. Configure Environment
```bash
# The server/.env is pre-configured for local dev.
# Only change JWT_SECRET for security:
nano server/.env
```

### 3. Seed Demo Data (Recommended)
```bash
npm run seed
# OR: make seed
```

### 4. Start Development
```bash
npm run dev
# OR: make dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health Check | http://localhost:5000/api/health |

---

## 🐳 Docker (Recommended for Production)

### Development with Docker
```bash
docker compose up -d
# Frontend: http://localhost:3000
# API: http://localhost:5000
```

### Production with Docker
```bash
# 1. Create .env.production
cp server/.env.example server/.env.production
# Edit with real values, strong JWT_SECRET, Atlas URI

# 2. Add SSL certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem

# 3. Start production stack
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔐 Demo Accounts

After seeding:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@demo.com | demo123 | Full admin dashboard + analytics |
| Citizen | citizen@demo.com | demo123 | Submit & track complaints |
| Officer | officer@demo.com | demo123 | Manage assigned complaints |

Public dashboard is accessible at `/public` **without login**.

---

## 📁 Project Structure

```
civicpulse/
├── .github/
│   └── workflows/
│       ├── ci.yml              ← Test + lint + Docker build on every push
│       └── deploy.yml          ← Build, push, SSH deploy on main/tags
├── nginx/
│   ├── nginx.prod.conf         ← Reverse proxy + SSL + rate limiting
│   └── ssl/                    ← Place cert.pem + key.pem here
├── server/
│   ├── config/
│   │   ├── database.js         ← MongoDB connection with pooling
│   │   └── logger.js           ← Winston daily-rotating logs
│   ├── middleware/
│   │   ├── auth.js             ← JWT protect + authorize(roles)
│   │   └── upload.js           ← Multer with UUID filenames + validation
│   ├── models/
│   │   ├── User.js             ← Bcrypt, role enum, notifications array
│   │   └── Complaint.js        ← Full indexes, virtual resolutionTime
│   ├── routes/
│   │   ├── auth.js             ← Register, login, me, profile, change-password
│   │   ├── complaints.js       ← Submit, list, detail, upvote, feedback
│   │   ├── admin.js            ← CRUD, assign, respond, stats, user mgmt
│   │   ├── analytics.js        ← Monthly, category, resolution, officer perf
│   │   ├── public.js           ← Public board, map data, stats
│   │   └── notifications.js    ← Read, mark-read
│   ├── tests/
│   │   ├── setup.js            ← Jest + MongoDB test setup
│   │   ├── auth.test.js        ← Auth route tests
│   │   ├── complaints.test.js  ← Complaint CRUD tests
│   │   └── aiDetection.test.js ← Unit tests for AI utils
│   ├── utils/
│   │   ├── aiDetection.js      ← Category detection + Jaccard similarity
│   │   └── notifications.js    ← Socket.io + DB notification sender
│   ├── uploads/                ← Uploaded images (gitignored)
│   ├── logs/                   ← Rotating log files (gitignored)
│   ├── Dockerfile              ← Multi-stage production build
│   ├── .env                    ← Local dev environment
│   ├── .env.example            ← Template (committed to git)
│   ├── index.js                ← Express app + Socket.io + security middleware
│   ├── seed.js                 ← Database seeder with demo data
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chatbot/
│   │   │   │   └── Chatbot.js        ← FAQ chatbot with quick actions
│   │   │   ├── shared/
│   │   │   │   ├── Sidebar.js        ← Role-aware navigation
│   │   │   │   └── Topbar.js         ← Notification bell + dropdown
│   │   │   └── ui/
│   │   │       ├── ErrorBoundary.js  ← React error boundary
│   │   │       └── Skeleton.js       ← Loading skeleton components
│   │   ├── context/
│   │   │   ├── AuthContext.js        ← JWT auth state + methods
│   │   │   └── SocketContext.js      ← Socket.io real-time events
│   │   ├── hooks/
│   │   │   └── useApi.js             ← useFetch, usePaginatedFetch, useDebounce
│   │   ├── pages/
│   │   │   ├── LoginPage.js          ← Tabbed login + register
│   │   │   ├── CitizenDashboard.js   ← Stats + recent complaints
│   │   │   ├── SubmitComplaint.js    ← AI detection + GPS + drag-drop images
│   │   │   ├── MyComplaints.js       ← Filterable paginated list
│   │   │   ├── ComplaintDetail.js    ← Timeline + responses + star feedback
│   │   │   ├── AdminDashboard.js     ← Full table + manage modal
│   │   │   ├── AnalyticsDashboard.js ← 4 Recharts (line, bar, pie, horizontal)
│   │   │   ├── PublicDashboard.js    ← Public board + charts (no auth)
│   │   │   └── NotFound.js           ← 404 page
│   │   ├── styles/
│   │   │   └── global.css            ← Full design system (CSS variables)
│   │   ├── utils/
│   │   │   └── api.js                ← Axios instance with interceptors
│   │   ├── App.js                    ← Router + providers + ErrorBoundary
│   │   └── index.js
│   ├── Dockerfile                    ← Multi-stage React build + nginx
│   ├── nginx.conf                    ← Client nginx config
│   └── package.json
├── docker-compose.yml                ← Development stack
├── docker-compose.prod.yml           ← Production stack (replicas, auth)
├── Makefile                          ← Common commands
├── .gitignore
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login + get JWT |
| GET | `/api/auth/me` | Bearer | Current user |
| PUT | `/api/auth/profile` | Bearer | Update profile |
| PUT | `/api/auth/change-password` | Bearer | Change password |
| GET | `/api/auth/notifications` | Bearer | Get notifications |
| PUT | `/api/auth/notifications/read` | Bearer | Mark all read |

### Complaints (Citizen)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/complaints` | Bearer | Submit complaint (multipart/form-data) |
| GET | `/api/complaints/my` | Bearer | My complaints (paginated + filtered) |
| GET | `/api/complaints/:id` | Bearer | Complaint detail |
| POST | `/api/complaints/:id/upvote` | Bearer | Toggle upvote |
| POST | `/api/complaints/:id/feedback` | Bearer | Rate resolved complaint |
| POST | `/api/complaints/detect-category` | Bearer | AI category detection |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/complaints` | Admin/Officer | All complaints (filtered, paginated) |
| GET | `/api/admin/complaints/:id` | Admin/Officer | Complaint detail |
| PUT | `/api/admin/complaints/:id/status` | Admin/Officer | Update status |
| PUT | `/api/admin/complaints/:id/assign` | Admin/Officer | Assign officer |
| POST | `/api/admin/complaints/:id/respond` | Admin/Officer | Add public response |
| GET | `/api/admin/stats` | Admin/Officer | Dashboard statistics |
| GET | `/api/admin/officers` | Admin/Officer | List officers |
| GET | `/api/admin/users` | Admin only | All users |
| PUT | `/api/admin/users/:id/toggle` | Admin only | Activate/deactivate user |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/monthly` | Admin/Officer | 12-month trend |
| GET | `/api/analytics/category` | Admin/Officer | By category |
| GET | `/api/analytics/resolution-time` | Admin/Officer | Avg resolution |
| GET | `/api/analytics/priority` | Admin/Officer | Priority distribution |
| GET | `/api/analytics/area` | Admin/Officer | By area |
| GET | `/api/analytics/officer-performance` | Admin/Officer | Officer stats |

### Public (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/complaints` | Public complaint board |
| GET | `/api/public/map-data` | Geo coordinates for heatmap |
| GET | `/api/public/stats` | Public statistics |

---

## 🧪 Running Tests

```bash
# All tests with coverage
make test
# OR
cd server && npm test

# Watch mode
cd server && npm run test:watch

# View coverage HTML report
open server/coverage/lcov-report/index.html
```

**Test suites:**
- `auth.test.js` — Register, login, token validation (9 tests)
- `complaints.test.js` — Submit, list, detail, upvote, feedback, admin actions (12 tests)
- `aiDetection.test.js` — Category detection, priority detection, Jaccard similarity (10 tests)

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcryptjs with salt rounds 12 |
| JWT authentication | 7-day expiry, HTTP-only cookie support |
| Rate limiting | 300 req/15min global, 20 req/15min auth |
| NoSQL injection prevention | express-mongo-sanitize |
| XSS prevention | xss-clean middleware |
| HTTP parameter pollution | hpp middleware |
| Security headers | helmet (CSP, HSTS, etc.) |
| CORS | Whitelist-based origin checking |
| File upload validation | MIME type + extension + size limit |
| Input validation | express-validator on all POST/PUT routes |
| Graceful error handling | Never exposes stack traces in production |

---

## 🌐 Production Deployment Checklist

```bash
# 1. Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Update server/.env (or environment variables):
#    - JWT_SECRET (64+ chars random hex)
#    - MONGODB_URI (Atlas connection string)
#    - CLIENT_URL (your domain)
#    - NODE_ENV=production

# 3. Add SSL certificates to nginx/ssl/
cp /path/to/cert.pem nginx/ssl/cert.pem
cp /path/to/key.pem nginx/ssl/key.pem

# 4. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 5. Verify health
curl https://yourdomain.com/api/health
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.x |
| Routing | React Router | v6 |
| Charts | Recharts | 2.x |
| HTTP client | Axios | 1.x |
| Backend | Node.js + Express | 18.x + 4.x |
| Database | MongoDB + Mongoose | 7.x + 7.x |
| Authentication | JWT + bcryptjs | — |
| Real-time | Socket.io | 4.x |
| File upload | Multer | 1.x |
| Security | Helmet, rate-limit, mongo-sanitize, xss-clean | — |
| Logging | Winston + daily-rotate-file | 3.x |
| Validation | express-validator | 7.x |
| Testing | Jest + Supertest | 29.x + 6.x |
| Container | Docker + Docker Compose | — |
| Reverse proxy | Nginx | 1.25 |
| CI/CD | GitHub Actions | — |

---

## 🚨 Troubleshooting

**MongoDB not connecting?**
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"
# Or use Docker:
docker run -d -p 27017:27017 --name mongo mongo:7.0
```

**Port already in use?**
```bash
# Change port in server/.env
PORT=5001
# For client, set in terminal before npm start:
PORT=3001 npm start
```

**Images not loading after deployment?**
- Ensure `server/uploads/` is on a persistent volume (configured in docker-compose)
- Check Nginx `/uploads/` alias points to the volume

**JWT token expired?**
- Tokens expire in 7 days by default
- Change `JWT_EXPIRE` in `.env` (e.g. `30d`)

---

## 📄 License

MIT © CivicPulse 2024
