# Deploy Frontend - Local Build Instructions

This guide shows how to build the frontend locally and deploy it to your DigitalOcean server to avoid slow Docker builds.

## Quick Steps

### 1. Build Locally (Fast - ~3 seconds)

```bash
cd frontend
npm run build
```

This creates `frontend/dist/` with matching HTML and asset files.

### 2. Copy dist to Server

**Option A: Using SCP (Recommended)**

```bash
# From your local machine
cd /Users/greg/Compass/Compass
scp -r frontend/dist root@your-server-ip:~/Compass/frontend/
```

**Option B: Using rsync (Better for updates)**

```bash
# From your local machine
cd /Users/greg/Compass/Compass
rsync -avz --delete frontend/dist/ root@your-server-ip:~/Compass/frontend/dist/
```

**Option C: Using Git (if you temporarily allow dist)**

```bash
# Locally - temporarily allow dist
git add -f frontend/dist/
git commit -m "Add pre-built frontend dist"
git push origin main

# On server
git pull origin main
# Then remove dist from git again
git rm -r --cached frontend/dist/
git commit -m "Remove dist from git"
git push origin main
```

### 3. Rebuild Docker Container

On your DigitalOcean server:

```bash
cd ~/Compass
docker compose build frontend
docker compose up -d frontend
```

The Dockerfile will detect the pre-built `dist` folder and use it instead of building.

## Verify

Check that the assets match:

```bash
# On server, check dist contents
ls -la frontend/dist/assets/

# Check the HTML references
grep -o 'src="/assets/[^"]*"' frontend/dist/index.html
```

## Troubleshooting

### If you get 404 errors:

1. **Ensure dist is complete:**
   ```bash
   # On server
   ls -la frontend/dist/
   ls -la frontend/dist/assets/
   ```

2. **Check HTML references match files:**
   ```bash
   # On server
   cat frontend/dist/index.html | grep assets
   ls frontend/dist/assets/
   ```

3. **Rebuild locally and recopy:**
   ```bash
   # Locally
   cd frontend
   rm -rf dist
   npm run build
   
   # Copy again
   scp -r dist root@your-server-ip:~/Compass/frontend/
   ```

### If Docker still tries to build:

The Dockerfile checks for:
- `dist/` directory exists
- `dist/index.html` exists
- `dist/assets/` directory exists and is not empty

If any of these are missing, it will build. Make sure you copied the entire `dist` folder.

## Automated Script

Create a local script `deploy-frontend.sh`:

```bash
#!/bin/bash
set -e

echo "Building frontend locally..."
cd frontend
npm run build
cd ..

echo "Copying dist to server..."
read -p "Enter server IP: " SERVER_IP
scp -r frontend/dist root@${SERVER_IP}:~/Compass/frontend/

echo "Rebuilding on server..."
ssh root@${SERVER_IP} "cd ~/Compass && docker compose build frontend && docker compose up -d frontend"

echo "Done!"
```

Make it executable:
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

