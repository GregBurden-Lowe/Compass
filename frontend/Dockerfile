# Build stage (Debian-based Node to avoid musl issues)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies (include dev deps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files (excluding dist via .dockerignore)
COPY . .
# Copy dist separately if it exists (pre-built from git)
# This will fail silently if dist doesn't exist, which is fine
COPY dist* ./dist/ 2>/dev/null || true
# If dist/ already exists (from git), skip build; otherwise build
RUN if [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then \
      echo "Using pre-built dist from git, skipping build"; \
    else \
      echo "Building frontend..."; \
      NODE_OPTIONS="--max-old-space-size=1024" npm run build; \
    fi

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# If you have a custom nginx config, copy it here:
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]