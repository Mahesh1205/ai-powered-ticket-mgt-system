# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY db/ ./db/
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy built output, dependencies, package.json, and db directory from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/db ./db

EXPOSE 3000

CMD ["node", "dist/index.js"]
