# Security Headers Implementation

## Overview

Security headers have been implemented at the edge (main reverse proxy) in `nginx/default.conf` to ensure they are **always** present in responses to clients, including error responses (4xx/5xx).

## Headers Implemented

### 1. **X-Frame-Options: SAMEORIGIN**
- **Purpose**: Prevents the page from being embedded in frames/iframes from other origins, mitigating clickjacking attacks.
- **Value**: `SAMEORIGIN` allows framing by the same origin (useful for internal tools) but blocks external sites.
- **Location**: Set at server level in both HTTP (redirect) and HTTPS blocks.

### 2. **X-Content-Type-Options: nosniff**
- **Purpose**: Prevents browsers from MIME-sniffing content types, forcing them to respect the declared `Content-Type` header.
- **Value**: `nosniff` blocks browsers from treating text/plain as HTML/JS, reducing XSS risk.
- **Location**: Set at server level in both HTTP and HTTPS blocks.

### 3. **X-XSS-Protection: 1; mode=block**
- **Purpose**: Legacy header that enables browser XSS filters (deprecated but still used by older browsers).
- **Value**: `1; mode=block` enables the filter and blocks the page if XSS is detected.
- **Note**: This header is deprecated in favor of CSP, but kept for backward compatibility. Can be removed once CSP is fully hardened.

### 4. **Referrer-Policy: strict-origin-when-cross-origin**
- **Purpose**: Controls how much referrer information is sent with requests.
- **Value**: `strict-origin-when-cross-origin` sends full URL for same-origin requests, only origin for cross-origin HTTPS→HTTPS, and nothing for HTTPS→HTTP.
- **Location**: Set at server level in both HTTP and HTTPS blocks.

### 5. **Strict-Transport-Security (HSTS): max-age=63072000; includeSubDomains; preload**
- **Purpose**: Forces browsers to use HTTPS for all future requests to this domain for 2 years.
- **Value**: 
  - `max-age=63072000`: 2 years (63,072,000 seconds)
  - `includeSubDomains`: Applies to all subdomains
  - `preload`: Eligible for browser HSTS preload lists
- **Location**: **Only** set in HTTPS server block (HSTS must never be set on HTTP).
- **Warning**: Once set, browsers will enforce HTTPS. Test thoroughly before deploying.

### 6. **Content-Security-Policy (CSP)**
- **Purpose**: Restricts which resources (scripts, styles, images, etc.) can be loaded and executed.
- **Current Policy** (baseline, safe for React/Vite SPA):
  ```
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self';
  img-src 'self' data: https:;
  font-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  connect-src 'self';
  upgrade-insecure-requests;
  ```
- **Breakdown**:
  - `default-src 'self'`: Default fallback - only same-origin resources
  - `base-uri 'self'`: Prevents `<base>` tag injection attacks
  - `object-src 'none'`: Blocks plugins (Flash, Java applets, etc.)
  - `frame-ancestors 'self'`: Prevents embedding in frames (complements X-Frame-Options)
  - `img-src 'self' data: https:`: Allows same-origin images, data URIs, and HTTPS images
  - `font-src 'self' data: https:`: Allows same-origin fonts, data URIs, and HTTPS fonts
  - `style-src 'self' 'unsafe-inline'`: **Temporary** - required for Material-UI inline styles
  - `script-src 'self'`: Vite bundles all scripts, no inline scripts in source
  - `connect-src 'self'`: API calls are same-origin (`/api`)
  - `upgrade-insecure-requests`: Automatically upgrades HTTP requests to HTTPS
- **Location**: Set at server level in HTTPS block only.

## Implementation Details

### Why Set at Reverse Proxy?

1. **Guaranteed Delivery**: Headers set at the edge (reverse proxy) are **always** sent to clients, even on error responses (4xx/5xx) when using `always`.
2. **Single Point of Control**: One configuration file controls all security headers, reducing maintenance overhead.
3. **Upstream Independence**: Headers work regardless of what the upstream containers (frontend/backend) send.

### Why `always` Flag?

Nginx's `add_header` directive only adds headers to successful responses (2xx, 3xx) by default. The `always` flag ensures headers are included on **all** responses, including:
- 4xx errors (404, 403, etc.)
- 5xx errors (502, 503, etc.)
- Redirects (301, 302)

This is critical for security, as attackers can trigger error responses to test for missing headers.

### Frontend Container Headers

The `frontend/nginx.conf` file also sets some headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection). These are now **redundant** but harmless. They provide defense-in-depth if the frontend container is ever accessed directly (unlikely in production). Consider removing them in a future cleanup to reduce duplication.

## Verification Steps

### 1. Test Nginx Configuration Syntax

```bash
# On the server
docker compose exec nginx nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf test is successful
```

### 2. Verify Headers on HTTPS (Production)

```bash
# Test main page
curl -I https://compass.lpgapps.work/

# Test API endpoint
curl -I https://compass.lpgapps.work/api/health

# Test 404 error (verify headers on errors)
curl -I https://compass.lpgapps.work/nonexistent

# Test redirect (HTTP → HTTPS)
curl -I http://compass.lpgapps.work/
```

Expected headers in response:
```
HTTP/2 200
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: https:; font-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; upgrade-insecure-requests;
```

### 3. Verify Headers on HTTP Redirect

```bash
curl -I http://compass.lpgapps.work/
```

Expected:
- Status: `301 Moved Permanently`
- Location: `https://compass.lpgapps.work/`
- Headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy (HSTS and CSP only on HTTPS)

### 4. Browser DevTools Verification

1. Open `https://compass.lpgapps.work/` in Chrome/Firefox
2. Open DevTools → Network tab
3. Reload the page
4. Click on any request (e.g., `index.html`)
5. Check "Response Headers" section
6. Verify all security headers are present

### 5. Online Security Scanner

Use tools like:
- [SecurityHeaders.com](https://securityheaders.com/?q=https://compass.lpgapps.work)
- [Mozilla Observatory](https://observatory.mozilla.org/analyze/compass.lpgapps.work)

These tools will grade your security headers and provide recommendations.

## Deployment Steps

### 1. Test Configuration Locally (if possible)

```bash
# Validate config syntax
docker compose exec nginx nginx -t
```

### 2. Deploy to Production

```bash
# Pull latest changes
git pull origin main

# Restart nginx container (config is mounted as volume)
docker compose restart nginx

# Or rebuild if config changed
docker compose up -d --build nginx

# Verify nginx started successfully
docker compose ps nginx
docker compose logs nginx
```

### 3. Verify After Deployment

```bash
# Wait a few seconds for nginx to restart
sleep 5

# Test headers
curl -I https://compass.lpgapps.work/
curl -I https://compass.lpgapps.work/nonexistent
```

## Next Steps: Hardening CSP

The current CSP uses `'unsafe-inline'` for styles, which is a security risk. To harden:

### 1. Remove `unsafe-inline` from `style-src`

**Current**: `style-src 'self' 'unsafe-inline'`  
**Target**: `style-src 'self'`

**Steps**:
1. Audit Material-UI usage to identify inline styles
2. Extract inline styles to external CSS files or use CSS-in-JS with nonces
3. Update CSP to remove `'unsafe-inline'`
4. Test thoroughly in staging

### 2. Add Nonces/Hashes for Scripts (if needed)

If inline scripts are discovered:
- Use nonces: `script-src 'self' 'nonce-{random}'`
- Or use hashes: `script-src 'self' 'sha256-{hash}'`

### 3. Tighten `connect-src` (if API moves to different domain)

If the API is ever moved to a different domain:
```nginx
connect-src 'self' https://api.example.com;
```

### 4. Consider Removing `X-XSS-Protection`

Once CSP is hardened and stable, remove the deprecated `X-XSS-Protection` header:
```nginx
# Remove this line:
# add_header X-XSS-Protection "1; mode=block" always;
```

## Optional Enhancements

### 1. Permissions-Policy (formerly Feature-Policy)

Control browser features (camera, microphone, geolocation, etc.):

```nginx
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 2. Cookie Security Flags

If the application uses cookies, ensure they are set with:
- `Secure`: Only sent over HTTPS
- `HttpOnly`: Not accessible via JavaScript
- `SameSite=Strict`: Prevents CSRF attacks

**Note**: These are typically set by the backend application, not Nginx. If using Nginx to set cookies, use:

```nginx
proxy_cookie_flags ~ httponly secure samesite=strict;
```

## Troubleshooting

### Headers Not Appearing

1. **Check Nginx Config Syntax**:
   ```bash
   docker compose exec nginx nginx -t
   ```

2. **Check Nginx Logs**:
   ```bash
   docker compose logs nginx
   ```

3. **Verify Config Was Reloaded**:
   ```bash
   docker compose exec nginx nginx -s reload
   ```

4. **Check for Conflicting Headers**:
   - If upstream (frontend/backend) sets headers, they may override reverse proxy headers
   - Solution: Remove headers from upstream or use `proxy_hide_header` in Nginx

### CSP Blocking Resources

1. **Check Browser Console**: CSP violations will appear in the console
2. **Use CSP Report-Only Mode** (temporary):
   ```nginx
   add_header Content-Security-Policy-Report-Only "..." always;
   ```
3. **Add `report-uri`** to collect violation reports:
   ```nginx
   add_header Content-Security-Policy "...; report-uri /api/csp-report;" always;
   ```

### HSTS Preload Considerations

Before submitting to HSTS preload lists:
1. Ensure HTTPS is working correctly
2. Ensure all subdomains support HTTPS
3. Test thoroughly - preload is permanent
4. Submit at: [hstspreload.org](https://hstspreload.org/)

## Assumptions Made

1. **API is Same-Origin**: The CSP `connect-src 'self'` assumes API calls are to `/api` on the same domain. If the API moves to a different domain, update CSP accordingly.

2. **No External CDNs**: The CSP assumes no external CDNs (fonts, scripts, styles). If external resources are added, update CSP directives (e.g., `font-src 'self' https://fonts.googleapis.com`).

3. **Material-UI Inline Styles**: The CSP includes `'unsafe-inline'` for styles because Material-UI injects inline styles. This should be removed after migrating to external styles or using nonces.

4. **No Inline Scripts**: The CSP `script-src 'self'` assumes no inline scripts. If inline scripts are added (e.g., analytics), use nonces or hashes.

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Nginx: add_header Directive](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header)

