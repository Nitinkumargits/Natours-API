# =========================
# BUILD STAGE
# =========================
FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build frontend assets
RUN npm run build:js


# =========================
# PRODUCTION STAGE
# =========================
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./


# Copy backend code
COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY models ./models
COPY routes ./routes
COPY utils ./utils

# Copy views (PUG templates)
COPY views ./views

# Copy static assets and built frontend
COPY public ./public
COPY --from=builder /app/public/dist ./public/dist
COPY --from=builder /app/public/js ./public/js

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]