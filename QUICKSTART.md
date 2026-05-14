# Phase 1 Quick Start

## Backend

```bash
cd backend

# 1. Copy env and fill in your keys
cp .env.example .env

# 2. Start services (DB + Redis + API + Worker)
docker-compose up -d

# 3. Run DB migrations
docker-compose exec api alembic upgrade head

# 4. API is live at http://localhost:8000
# 5. Swagger docs at http://localhost:8000/docs
```

**Run tests:**
```bash
docker-compose exec api pytest tests/ -v
```

---

## Mobile

```bash
cd mobile

# 1. Install dependencies
npm install

# 2. Copy env and set API URL
cp .env.example .env
# Set EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:8000/api/v1
# (use your machine's LAN IP so Android device/emulator can reach backend)

# 3. Start Expo dev server
npx expo start

# 4. Press 'a' to open Android emulator
#    Or scan QR code with Expo Go app on your Android device
```

---

## What's Working in Phase 1

| Feature | Status |
|---------|--------|
| Register / Login (email) | Ready |
| Google OAuth | Ready (needs GOOGLE_CLIENT_ID) |
| JWT auth + refresh | Ready |
| Resume PDF upload → S3 | Ready |
| AI resume parsing (Claude) | Ready |
| ATS scoring | Ready |
| Resume list / detail | Ready |
| Onboarding flow (3 steps) | Ready |
| Home dashboard | Ready |
| Tab navigation | Ready |

---

## Keys You Need

| Key | Where to get |
|-----|-------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `AWS_*` keys + S3 bucket | AWS Console |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 |
| `SECRET_KEY` | Generate: `openssl rand -hex 32` |

---

## Phase 2 Next Steps

Once Phase 1 is running, move to Phase 2:
- ATS score breakdown UI
- Resume section editing
- AI improvement suggestions per section
- Multiple resume support
