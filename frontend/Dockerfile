# Build stage (Debian-based Node to avoid musl issues)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy source files first
COPY . .

# Check if dist exists and is valid (has index.html and assets)
# If yes, use it; otherwise build
RUN if [ -d "dist" ] && [ -f "dist/index.html" ] && [ -d "dist/assets" ] && [ "$(ls -A dist/assets 2>/dev/null)" ]; then \
      echo "Using pre-built dist folder (from local build)"; \
    else \
      echo "Building frontend (dist not found or incomplete)..."; \
      # Install dependencies (include dev deps for build)
      npm ci --prefer-offline --no-audit --progress=false || \
      (echo "npm ci failed, trying npm install..." && npm install --no-audit --progress=false); \
      # Build
      NODE_OPTIONS="--max-old-space-size=1024" npm run build; \
    fi

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]