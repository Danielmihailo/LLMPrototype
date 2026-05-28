FROM node:20-slim

# Build tools for argon2 native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./

# Copy all packages (needed for workspace resolution)
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Install all dependencies
RUN npm install

WORKDIR /app/packages/api

ENV API_PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "src/server.ts"]
