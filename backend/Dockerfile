FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3050

COPY package*.json ./
RUN npm ci --only=production && apk del --purge python3 make g++ gcc 2>/dev/null || true

COPY --from=builder /app/dist ./dist

# Mount points for persistent data and docker socket
VOLUME ["/app/data"]

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3050/api/health || exit 1

CMD ["node", "dist/index.js"]
