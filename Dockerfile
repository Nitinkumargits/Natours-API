# =========================
# BUILD STAGE
# =========================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry logic and cache optimization
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --only=production --no-audit --no-fund --prefer-offline --no-optional || \
    (npm cache clean --force && npm ci --only=production --no-audit --no-fund --no-optional)

# Copy source code
COPY . .

# Build frontend assets
RUN npm run build:js


# =========================
# PRODUCTION STAGE
# =========================
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies with retry logic
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --omit=dev --no-audit --no-fund --prefer-offline --no-optional || \
    (npm cache clean --force && npm ci --omit=dev --no-audit --no-fund --no-optional)

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

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

EXPOSE 3000

ENV NODE_ENV=production

CMD ["dumb-init", "--", "node", "server.js"]