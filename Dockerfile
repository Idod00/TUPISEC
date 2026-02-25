# ── Stage 1: Build Next.js ─────────────────────────────────────────────
# Run the build on the native build platform for speed (cross-compile aware)
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm ci

COPY dashboard/ ./
RUN npm run build

# ── Stage 2: Runtime ───────────────────────────────────────────────────
FROM node:22-alpine AS runner

# System deps: Python 3, Chromium, nmap, postgresql-client — all available in Alpine apk
RUN apk add --no-cache \
    python3 \
    py3-pip \
    chromium \
    nmap \
    ca-certificates \
    postgresql-client

WORKDIR /app

# Python virtualenv + scanner deps
# Use --break-system-packages since Alpine py3-pip is externally managed
COPY requirements.txt ./
RUN python3 -m venv venv \
    && venv/bin/pip install --no-cache-dir -r requirements.txt

# Copy scanner
COPY scanner.py ./

# Copy built Next.js app
COPY --from=builder /app/dashboard/.next        ./dashboard/.next
COPY --from=builder /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=builder /app/dashboard/package.json ./dashboard/package.json
COPY --from=builder /app/dashboard/public       ./dashboard/public

# Persistent data directory (screenshots + backups)
RUN mkdir -p dashboard/data/screenshots dashboard/data/backups

# Non-root user
RUN addgroup -S -g 1001 tupisec \
    && adduser -S -u 1001 -G tupisec tupisec \
    && chown -R tupisec:tupisec /app
USER tupisec

WORKDIR /app/dashboard

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

CMD ["node_modules/.bin/next", "start"]
