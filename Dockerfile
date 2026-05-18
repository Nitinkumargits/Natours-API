# ── Stage 1: build the production JS bundle ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public ./public
RUN npm run build:js

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY app.js ./
COPY controllers ./controllers
COPY models ./models
COPY routes ./routes
COPY utils ./utils
COPY views ./views

COPY public ./public
COPY --from=builder /app/public/dist ./public/dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
