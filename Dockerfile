# =========================
# BUILD STAGE
# =========================
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build frontend bundle
RUN npm run build:js


# =========================
# PRODUCTION STAGE
# =========================
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./

# Install only production deps
RUN npm install --omit=dev

# Copy backend code
COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY model ./model
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