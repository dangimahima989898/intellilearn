# --- Stage 1: Build the React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Empty string = use relative paths (same origin as backend)
ENV VITE_API_URL=""
RUN npm run build

# --- Stage 2: Setup FastAPI Backend & Serve Frontend ---
FROM python:3.11-slim
WORKDIR /app

# System dependencies required by psycopg2-binary and sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ ./

# Copy built React frontend into backend's dist/ folder
COPY --from=frontend-builder /app/frontend/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Railway injects $PORT automatically — default to 8000 locally
EXPOSE 8000

# Use Railway's $PORT env var (falls back to 8000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
