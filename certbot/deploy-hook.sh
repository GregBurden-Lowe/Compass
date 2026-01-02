#!/bin/sh
# Certbot deploy hook to reload nginx in Docker after certificate renewal
docker exec compass-nginx nginx -s reload

