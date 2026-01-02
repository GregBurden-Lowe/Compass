# Certbot Migration: Standalone → Webroot

## 1. Update nginx and docker-compose

```bash
cd ~/Compass
git pull
mkdir -p certbot/www
docker compose up -d --build nginx
```

## 2. Re-issue certificate using webroot

```bash
sudo certbot certonly --webroot \
  --webroot-path=/root/Compass/certbot/www \
  -d compass.lpgapps.work \
  --deploy-hook /root/Compass/certbot/deploy-hook.sh
```

## 3. Update renewal configuration

```bash
sudo sed -i 's/authenticator = standalone/authenticator = webroot/' /etc/letsencrypt/renewal/compass.lpgapps.work.conf
sudo sed -i '/^webroot_path/d' /etc/letsencrypt/renewal/compass.lpgapps.work.conf
sudo sed -i '/^\[renewalparams\]/a webroot_path = /root/Compass/certbot/www' /etc/letsencrypt/renewal/compass.lpgapps.work.conf
```

## 4. Verify renewal config

```bash
sudo cat /etc/letsencrypt/renewal/compass.lpgapps.work.conf | grep -A 2 authenticator
```

Should show:
```
authenticator = webroot
webroot_path = /root/Compass/certbot/www
```

## 5. Test ACME challenge accessibility

```bash
echo "test" > /root/Compass/certbot/www/.well-known/acme-challenge/test
curl http://compass.lpgapps.work/.well-known/acme-challenge/test
```

Should return "test". Clean up:
```bash
rm /root/Compass/certbot/www/.well-known/acme-challenge/test
```

## 6. Dry-run renewal

```bash
sudo certbot renew --dry-run --deploy-hook /root/Compass/certbot/deploy-hook.sh
```

## 7. Update crontab (if needed)

```bash
sudo crontab -e
```

Ensure the deploy hook is included:
```
0 0 * * * certbot renew --quiet --deploy-hook /root/Compass/certbot/deploy-hook.sh
```

