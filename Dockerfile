FROM node:20-bullseye-slim

# Install system dependencies required for Electron
RUN apt-get update && apt-get install -y \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    git \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Flag to indicate running inside Docker
ENV IS_DOCKER=true

RUN npm install

COPY . .

# Fix permissions for the node user
RUN chown -R node:node /app

# Run as non-root user to avoid sandbox issues
USER node

# Expose default Vite port if needed, though Electron apps usually don't expose a web port externally by default
EXPOSE 5173

CMD ["npm", "run", "dev"]
