# Backend-image. Bygges med repo-roden som context (se compose.yaml),
# så OpenAPI-kontrakten fra specs/ kan kopieres med.
FROM node:20-alpine

WORKDIR /app

# Installér afhængigheder først, så laget caches, når kun koden ændres
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY specs/001-booking-kpi-bar/contracts/openapi.yaml ./openapi.yaml

ENV OPENAPI_PATH=/app/openapi.yaml \
    NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
