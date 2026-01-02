# Build stage (Debian-based Node to avoid musl issues)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies (include dev deps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
# Increase Node memory limit for build on low-resource servers
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# If you have a custom nginx config, copy it here:
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]