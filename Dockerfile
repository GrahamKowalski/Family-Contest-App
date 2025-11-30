# Build stage for frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy backend
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./public

# Create directories for data and uploads
RUN mkdir -p /app/data /app/uploads

# Set permissions
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
