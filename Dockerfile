# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build frontend
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -S ecoscan && adduser -S ecoscan -G ecoscan

WORKDIR /app

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/data ./data

# Create data and logs dirs with correct ownership
RUN mkdir -p /app/data /app/logs && chown -R ecoscan:ecoscan /app

USER ecoscan

EXPOSE 3000

# Health check (Docker will restart container if this fails)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health/live || exit 1

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.cjs"]
