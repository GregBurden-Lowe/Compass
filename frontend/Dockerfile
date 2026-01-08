# Build stage (Debian-based Node to avoid musl issues)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies (include dev deps for build)
# Use npm cache mount for faster installs (requires BuildKit)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --progress=false

# Copy source files
COPY . .
# Always rebuild to ensure HTML and assets match
RUN echo "Building frontend..."; \
    NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]