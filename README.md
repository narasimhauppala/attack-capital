# AMD System

Answering Machine Detection for outbound phone calls using Twilio.

## Quick Setup

**Install dependencies**
```bash
npm install
```

```plaintext
Site live on aws ec2: https://6e5710905521.ngrok-free.app/

```


**Configure environment**

Copy `.env.example` to `.env` and add your Twilio credentials:
```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_CALLER_ID=+1234567890
DATABASE_URL=postgresql://amd_user:amd_password@localhost:5432/amd_database
```

**Start database**
```bash
docker compose up -d postgres
```

**Run migrations**
```bash
npx prisma migrate dev
```

**Start the app**
```bash
npm run dev
```

Open http://localhost:3000

## How to Use

1. Visit the `/dial` page
2. Enter a phone number
3. Select "Twilio Native AMD"
4. Click Dial
5. Answer the phone when it rings
6. Check `/history` to see detection results

## Features

- **Twilio Native AMD** - Production ready, ~90% accuracy, ~7 second response
- **Call History** - View all past calls and detection results
- **Database Logging** - PostgreSQL storage with Prisma ORM

## Tech Stack

- Next.js 14
- PostgreSQL + Prisma
- Twilio Voice API
- Docker

## Project Structure

```
app/
  api/
    dial/          - Initiate calls
    calls/         - Fetch call logs
    amd/callback/  - Twilio webhooks
  dial/            - Dialer interface
  history/         - Call history page
lib/
  amd/             - AMD detection logic
prisma/            - Database schema
ml-service/        - ML model (not functional)
```

## Available Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npx prisma studio        # Browse database
docker compose up -d     # Start all services
docker compose down      # Stop all services
```

## Notes

- Twilio trial accounts can only call verified numbers
- ML-based detection has WebSocket infrastructure issues
- Native Twilio AMD works reliably for production use