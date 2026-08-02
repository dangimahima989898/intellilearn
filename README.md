---
title: IntelliLearn
emoji: 🎓
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# IntelliLearn 🎓

AI-Powered Smart Learning Management & Adaptive Assessment System

## MCA 4th Semester Project
- **Student:** Mahima Dangi (Enrollment: 217543591)
- **Guide:** Dr. Avinash Panwar, Dept. of MCA
- **University:** Mohanlal Sukhadia University, Udaipur (Rajasthan)
- **Academic Year:** 2024–2026

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Python 3.11 + FastAPI
- **Database:** PostgreSQL 15
- **AI:** OpenAI GPT-4o + Groq (Llama 3) + Google Gemini
- **Notifications:** Firebase Cloud Messaging
- **Deployment:** Railway (backend) + Vercel (frontend)

## Quick Start
### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Docs
http://localhost:8000/docs
