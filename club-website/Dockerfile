FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install Chromium and fonts for headless PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-thai

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads && chown -R node:node /usr/src/app

# The application does not need root privileges at runtime.
USER node

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
