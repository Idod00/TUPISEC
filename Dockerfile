# ── Stage 1: Build Next.js ─────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app/dashboard

# Install dependencies
COPY dashboard/package*.json ./
RUN npm ci

# Copy source and build
COPY dashboard/ ./
RUN npm run build

# ── Stage 2: Runtime ───────────────────────────────────────────────────
FROM node:22-slim AS runner

# System deps: Python 3, pip, Chromium (for screenshots), nmap (for scanner)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    nmap \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python virtualenv + scanner deps
COPY requirements.txt ./
RUN python3 -m venv venv \
    && venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy scanner
COPY scanner.py ./

# Copy built Next.js app
COPY --from=builder /app/dashboard/.next ./dashboard/.next
COPY --from=builder /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=builder /app/dashboard/package.json ./dashboard/package.json
COPY --from=builder /app/dashboard/public ./dashboard/public

# Persistent data directory
RUN mkdir -p dashboard/data/screenshots

# Non-root user for security
RUN useradd -r -u 1001 -m tupisec \
    && chown -R tupisec:tupisec /app
USER tupisec

WORKDIR /app/dashboard

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

CMD ["node_modules/.bin/next", "start"]
