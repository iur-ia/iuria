# iuria LexFutura - DocSmart 3.0
# Multi-stage build: Node.js frontend + Python scraping backend

# ==================== Stage 1: Build Frontend ====================
FROM node:20-slim AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# ==================== Stage 2: Production ====================
FROM node:20-slim

# Install Python 3.11+ and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    # Playwright dependencies
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libatspi2.0-0 libgtk-3-0 \
    # PDF/OCR processing
    tesseract-ocr tesseract-ocr-por poppler-utils \
    # SSL/TLS for MNI certificates
    openssl ca-certificates \
    # Build tools
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node.js production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install Python dependencies
COPY requirements.txt ./
RUN python3 -m pip install --break-system-packages --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN npx playwright install chromium --with-deps 2>/dev/null || true
RUN python3 -m playwright install chromium 2>/dev/null || true

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy application code
COPY server ./server
COPY shared ./shared
COPY scraper ./scraper
COPY client ./client
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js ./
COPY components.json drizzle.config.ts ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL=""
ENV TWOCAPTCHA_API_KEY=""
ENV IDENTITY_PROXY_URL=""
ENV IDENTITY_PROXY_CERT_ID=""
ENV IDENTITY_PROXY_API_KEY=""
ENV BRIGHTDATA_USERNAME=""
ENV BRIGHTDATA_PASSWORD=""
ENV OXYLABS_USERNAME=""
ENV OXYLABS_PASSWORD=""

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/api/auth/me || exit 1

EXPOSE 5000

# Start server
CMD ["npx", "tsx", "server/index.ts"]
