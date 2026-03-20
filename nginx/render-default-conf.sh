#!/bin/sh
set -eu

TEMPLATE_PATH="${NGINX_TEMPLATE_PATH:-/etc/nginx/templates/default.conf.template}"
TARGET_PATH="${NGINX_TARGET_PATH:-/etc/nginx/conf.d/default.conf}"

if [ "${NGINX_ENABLE_TLS:-false}" = "true" ]; then
    if [ -z "${NGINX_SSL_CERT_NAME:-}" ]; then
        echo "NGINX_SSL_CERT_NAME must be set when NGINX_ENABLE_TLS=true" >&2
        exit 1
    fi

    envsubst '${NGINX_SERVER_NAME} ${NGINX_SSL_CERT_NAME}' < "${TEMPLATE_PATH}" > "${TARGET_PATH}"
    exit 0
fi

cat > "${TARGET_PATH}" <<EOF
server {
    listen 80;
    server_name ${NGINX_SERVER_NAME:-_};

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location = /health {
        proxy_pass http://backend:8000/health;
        proxy_set_header Host \$host;
    }

    location = /openapi.json {
        proxy_pass http://backend:8000/openapi.json;
        proxy_set_header Host \$host;
    }

    location /docs {
        proxy_pass http://backend:8000/docs;
        proxy_set_header Host \$host;
    }

    location /redoc {
        proxy_pass http://backend:8000/redoc;
        proxy_set_header Host \$host;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /attachments/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
