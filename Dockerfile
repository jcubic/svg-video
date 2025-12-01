# Use the official Node.js LTS image (includes npm)
FROM node:22-alpine

# Install system dependencies required for Puppeteer/Chrome on Alpine
# (nss, cups, etc. — see Puppeteer troubleshooting docs)
RUN apk add --no-cache \
    ffmpeg \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    chromium \
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer_cache
# Use system Chromium as fallback
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install svg-video globally (this pulls in puppeteer-core)
RUN npm install -g svg-video

# Explicitly install matching Chrome via @puppeteer/browsers
# (Downloads to PUPPETEER_CACHE_DIR; use 'stable' for latest compatible)
RUN npx @puppeteer/browsers install chrome@stable

# Set working directory
WORKDIR /project

# Default command: show help
ENTRYPOINT ["svg-video"]
CMD ["--help"]
