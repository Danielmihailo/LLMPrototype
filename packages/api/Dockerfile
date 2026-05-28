FROM node:20-slim

# Build tools for argon2 native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

RUN npm install

# Build shared first, then API
RUN npm run build -w @jarvis/shared
RUN npm run build -w @jarvis/api

# Copy SQL migrations into dist (server reads them at runtime)
RUN cp -r packages/api/src/db/migrations packages/api/dist/db/migrations

WORKDIR /app/packages/api

ENV API_PORT=3001
EXPOSE 3001

CMD ["node", "dist/server.js"]
