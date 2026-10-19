# Multi-stage production Dockerfile for DevFlow CI/CD Platform
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy application sources
COPY . .

# Build Vite frontend bundle
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/devflow.db

# Create persistent data volume directory
RUN mkdir -p /data && chown -R node:node /data

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built frontend assets and server sources
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER node

EXPOSE 3000

# Mount persistent volume for SQLite at /data
VOLUME [ "/data" ]

CMD ["npm", "start"]
