# Domain Setup Guide for compass.lpgapps.work

This guide will help you configure your domain `compass.lpgapps.work` to point to your DigitalOcean droplet and set up SSL/TLS certificates.

## Prerequisites

- Domain `lpgapps.work` is registered and you have access to DNS settings
- DigitalOcean droplet IP address
- SSH access to your droplet

## Step 1: DNS Configuration

1. Log into your domain registrar or DNS provider (where `lpgapps.work` is managed)
2. Add an **A record** for the subdomain:
   - **Type**: A
   - **Name**: `compass` (or `compass.lpgapps.work` depending on your provider)
   - **Value**: Your DigitalOcean droplet IP address (e.g., `178.62.211.191`)
   - **TTL**: 3600 (or default)

3. Wait for DNS propagation (can take a few minutes to 48 hours, usually 5-15 minutes)

4. Verify DNS is working:
   ```bash
   dig compass.lpgapps.work
   # or
   nslookup compass.lpgapps.work
   ```

## Step 2: Update Environment Variables

On your droplet, update your `.env` file to include the new domain in CORS origins:

```bash
cd ~/Compass
nano .env
```

Add or update:
```bash
CORS_ORIGINS=https://compass.lpgapps.work,http://compass.lpgapps.work
```

## Step 3: Update Nginx Configuration

The nginx config has been updated to use `compass.lpgapps.work`. Pull the latest changes:

```bash
cd ~/Compass
git pull
docker compose up -d --build nginx
```

## Step 4: Set Up SSL/TLS with Let's Encrypt

### Option A: Using Certbot (Recommended)

1. Install certbot on your droplet:
   ```bash
   sudo apt update
   sudo apt install certbot
   ```

2. Stop nginx temporarily to allow certbot to use port 80:
   ```bash
   docker compose stop nginx
   ```

3. Request SSL certificate:
   ```bash
   sudo certbot certonly --standalone -d compass.lpgapps.work
   ```

4. Follow the prompts:
   - Enter your email address
   - Agree to terms of service
   - Choose whether to share email with EFF (optional)

5. Certificates will be saved to `/etc/letsencrypt/live/compass.lpgapps.work/`

6. Update `docker-compose.yml` to mount certificates:
   ```bash
   cd ~/Compass
   nano docker-compose.yml
   ```

   Uncomment the SSL volume mounts in the nginx service:
   ```yaml
   volumes:
     - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
     - /etc/letsencrypt:/etc/letsencrypt:ro
     - /var/www/certbot:/var/www/certbot:ro
   ```

   And uncomment port 443:
   ```yaml
   ports:
     - "80:80"
     - "443:443"
   ```

7. Update `nginx/default.conf`:
   - Uncomment the HTTPS server block
   - Uncomment the HTTP to HTTPS redirect in the HTTP server block

8. Restart nginx:
   ```bash
   docker compose up -d nginx
   ```

### Option B: Using Certbot Docker Container (Alternative)

If you prefer not to install certbot directly, you can use it via Docker:

1. Stop nginx temporarily:
   ```bash
   docker compose stop nginx
   ```

2. Run certbot in Docker:
   ```bash
   docker run -it --rm \
     -v /etc/letsencrypt:/etc/letsencrypt \
     -v /var/lib/letsencrypt:/var/lib/letsencrypt \
     -p 80:80 \
     certbot/certbot certonly --standalone -d compass.lpgapps.work
   ```

3. Follow the prompts and certificates will be saved to `/etc/letsencrypt/live/compass.lpgapps.work/`

4. Continue with Step 5 below to update docker-compose.yml

## Step 5: Auto-Renewal Setup

Set up automatic certificate renewal:

1. Test renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

2. Add to crontab (certificates auto-renew 30 days before expiry):
   ```bash
   sudo crontab -e
   ```

   Add this line:
   ```
   0 0 * * * certbot renew --quiet --deploy-hook "cd /root/Compass && docker compose restart nginx"
   ```

## Step 6: Verify Everything Works

1. Check HTTP redirects to HTTPS:
   ```bash
   curl -I http://compass.lpgapps.work
   ```

2. Check HTTPS works:
   ```bash
   curl -I https://compass.lpgapps.work
   ```

3. Visit in browser: `https://compass.lpgapps.work`

## Troubleshooting

### DNS not resolving
- Wait longer for propagation
- Check DNS records are correct
- Use `dig` or `nslookup` to verify

### SSL certificate errors
- Ensure port 443 is open in DigitalOcean firewall
- Check nginx logs: `docker compose logs nginx`
- Verify certificate paths in docker-compose.yml

### 502 Bad Gateway
- Check backend is running: `docker compose ps`
- Check backend logs: `docker compose logs backend`
- Verify CORS_ORIGINS includes your domain

### Can't access after DNS change
- Clear browser cache
- Try incognito/private mode
- Check firewall allows ports 80 and 443

## Notes

- The HTTP server block currently allows access for Let's Encrypt challenges
- After SSL is set up, uncomment the redirect to force HTTPS
- Certificates expire every 90 days but auto-renewal handles this
- Keep your `.env` file secure and never commit it to git

