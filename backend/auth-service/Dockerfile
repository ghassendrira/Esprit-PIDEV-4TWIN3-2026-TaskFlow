# Use official Node.js runtime as a parent image
FROM node:22-slim AS builder

# Set the working directory
WORKDIR /app

# Install system dependencies (needed for Prisma)
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Build the NestJS application
RUN npm run build

# --- Production Image ---
FROM node:22-slim

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose the application port
EXPOSE 3001

# Set environment variables (should be overridden at runtime)
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/src/main.js"]
