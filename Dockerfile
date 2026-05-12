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

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
