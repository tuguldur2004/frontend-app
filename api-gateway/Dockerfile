FROM node:20-alpine

WORKDIR /usr/src/app/api-gateway

# Install dependencies (lockfile if present, fallback otherwise)
COPY api-gateway/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy the whole frontend-app context into the image
COPY . /usr/src/app

ENV NODE_ENV=production
ENV GATEWAY_PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
