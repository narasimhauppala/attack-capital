

**Attack Capital Assignment 1 – Advanced Answering Machine Detection (AMD)**

**Objective:**  
 Build a multi-strategy Answering Machine Detection (AMD) system that can decide whether an outbound call is answered by a human or a voicemail machine within 3 seconds and with at least 90 percent accuracy.  
 The app should let a user choose a detection strategy, place a call through Twilio, display real-time status and AMD decisions, store call logs, and compare latency and accuracy across strategies.

**Tech Stack:**  
 Frontend / Backend: Next.js 14 (App Router \+ TypeScript)  
 Database: PostgreSQL with Prisma  
 Authentication: Better Auth (roles admin / editor / viewer)  
 Telephony: Twilio Programmable Voice API and Media Streams  
 Optional SIP strategy: Jambonz  
 Optional ML strategy: FastAPI \+ Hugging Face wav2vec-vm-finetune  
 UI: Tailwind CSS \+ React Query  
 Validation: Zod  
 Documentation: README \+ Mermaid ERD \+ 3-to-5 minute Loom demo

**Architecture Overview:**  
 Frontend Dialer → /api/dial (Twilio call) → Twilio Voice API → AMD events → /api/amd/callback → PostgreSQL (logs and analytics).  
 Optional audio stream → Hugging Face / Jambonz service → callback → database update → dashboard.

**AMD Strategies:**

1. Twilio Native AMD (baseline): uses Twilio machineDetection option. Callbacks return statuses like human, machine\_start, machine\_end\_beep. Implements /api/dial for outbound and /api/amd/callback for webhook storage.

2. Twilio \+ Jambonz SIP (intermediate): Twilio SIP trunk to Jambonz. Jambonz sends events amd\_human\_detected or amd\_machine\_detected. Parameters thresholdWordCount \= 5 and decisionTimeoutMs \= 10000 for faster decisions.

3. Hugging Face (advanced ML): Audio from Twilio Media Streams is sent to a FastAPI service hosting wav2vec-vm-finetune. /predict returns label and confidence. Low-confidence results retry up to two times.

**Database Schema (Prisma):**  
 User (id, name, email, role)  
 CallLog (id, toNumber, strategy, status, amdResult, latencyMs, createdAt)  
 AmdEvent (id, callId, decision, confidence, payload, createdAt)

**API Routes:**  
 POST /api/dial – start call.  
 POST /api/amd/callback – receive Twilio AMD webhook.  
 POST /api/amd-events – optional Jambonz events.  
 POST /api/hf/predict – optional ML audio prediction.

**Frontend Pages:**  
 /dial – phone input \+ strategy dropdown \+ live status panel.  
 /history – table of calls with filters and CSV export.

**Environment Variables:**  
 TWILIO\_ACCOUNT\_SID=  
 TWILIO\_AUTH\_TOKEN=  
 TWILIO\_CALLER\_ID=  
 DATABASE\_URL=  
 BETTER\_AUTH\_SECRET=

**Testing Plan:**  
 Use your own number for human tests and voicemail numbers for machine tests (Costco, Nike, PayPal). Silence for 3 seconds should default to human. Low confidence below 0.7 retries. Run five calls per strategy and record accuracy and latency.

**Comparison Table Example:**  
 Twilio Native – 90 percent accuracy, 2100 ms average latency, low setup.  
 Jambonz SIP – 93 percent accuracy, 1800 ms latency, medium setup.  
 Hugging Face – 95 percent accuracy, 2200 ms latency, higher setup.

**Local Setup Commands:**  
 git clone your repo  
 npm install  
 npx prisma migrate dev  
 npm run dev  
 (Optional ML service) pip install fastapi uvicorn torch transformers and run uvicorn app:app \--reload

**Ten-Hour Execution Plan:**  
 0–1 hour – scaffold Next.js \+ Tailwind \+ Prisma \+ Auth.  
 1–3 hours – DB schema and Twilio outbound flow.  
 3–5 hours – dialer UI and call logs.  
 5–7 hours – implement one extra strategy (Jambonz or Hugging Face).  
 7–8 hours – run tests with sample numbers.  
 8–9 hours – write README and comparison table.  
 9–10 hours – record Loom demo and push public GitHub repo.

**Deliverables:**  
 Public GitHub repository with code.  
 Working demo covering Twilio Native AMD and at least one other strategy.  
 Complete README and integration table.  
 3-to-5 minute video walkthrough.  
 Recorded AMD test results.

**Success Metrics:**  
 Decision latency below 3 seconds on average.  
 Accuracy 90 percent or higher.  
 Clean, modular, documented code.  
 Clear setup instructions and working demo.  
 All required tests executed and logged.

**Implementation Tips:**  
 Use a factory pattern for AMD strategies: createDetector(strategy).detect(callPayload).  
 Validate inputs with Zod and handle webhook security.  
 Record timestamps for latency calculation.  
 Log all decisions in the database.  
 Add small charts for accuracy and latency trends if time permits.  
 Keep the Twilio Native strategy fully functional before adding others.

**End of assignment notes.**

