# Stage 1: Build the React frontend
FROM node:20-slim AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production runtime
FROM node:20-slim

WORKDIR /app

# Copy server dependency manifests and install production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend dist from builder stage
COPY --from=builder /app/client/dist ./client/dist

# Expose server port
ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/src/index.js"]
