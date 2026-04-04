# Stage 1: Build Frontend (Vite)
FROM node:20-alpine AS build-stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Build-time env vars (can be passed via --build-arg in local or Railway)
ARG VITE_API_BASE_URL=""
ARG VITE_FACTORY_ADDRESS="0x760a12501f98E1b4Fbd4b821C55c0432C17C3C8c"
ARG VITE_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/Qq97YUiLlpEOjydTQA3QE"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FACTORY_ADDRESS=$VITE_FACTORY_ADDRESS
ENV VITE_RPC_URL=$VITE_RPC_URL
RUN npm run build

# Stage 2: Production (Python 3.11)
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for psycopg and other C extensions
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for caching
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy necessary project directories to mirror local structure
COPY backend/ ./backend/
COPY contracts/ ./contracts/

# Copy built frontend dist into backend/static for unified serving
COPY --from=build-stage /app/frontend/dist ./backend/static

# Set working directory to backend for runtime
WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1

# Use Railway's dynamic PORT variable, fallback to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
