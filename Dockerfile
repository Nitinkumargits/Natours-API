# =========================
# BUILD STAGE
# =========================
FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps for building)
RUN npm install

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

# Install production dependencies only
RUN npm install --omit=dev

# Copy backend code
COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY models ./models
COPY routes ./routes
COPY utils ./utils

# Copy views (PUG templates)
COPY views ./views

# Copy static assets and built frontend bundle
COPY public ./public
COPY --from=builder /app/public/dist/index.js ./public/js/bundle.js

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]