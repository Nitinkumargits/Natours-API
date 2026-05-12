# =========================
# BUILD STAGE
# =========================
FROM node:16-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build frontend assets
RUN npm run build:js


# =========================
# PRODUCTION STAGE
# =========================
FROM node:16-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --no-audit --no-fund

# Copy backend code
COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY modelss ./modelss
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

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

CMD ["dumb-init", "--", "node", "server.js"]