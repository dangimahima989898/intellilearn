# --- Stage 1: Build the React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Set VITE_API_URL to empty so frontend uses relative paths (same domain/port)
ENV VITE_API_URL=""
RUN npm run build

# --- Stage 2: Setup FastAPI Backend & Serve Frontend ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies required by psycopg2-binary and sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY backend/ ./

# Copy built frontend static files from Stage 1 into the backend's directory
COPY --from=frontend-builder /app/frontend/dist ./dist

# Create uploads directory and ensure it's writable
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Hugging Face Spaces require application to listen on port 7860
EXPOSE 7860

# Run uvicorn on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
