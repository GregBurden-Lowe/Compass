# Attachment Upload & Serving - Deep Dive Report

## Findings

### Critical Issues Found

1. **❌ CRITICAL: Missing Nginx Route for `/attachments/`**
   - **Location**: `nginx/default.conf`
   - **Issue**: No location block for `/attachments/` requests
   - **Impact**: Browser requests to `/attachments/*` were routed to the frontend container, which cannot serve backend static files
   - **Evidence**: Nginx config only had `/api/` and `/` location blocks

2. **❌ CRITICAL: Incorrect Frontend URL Construction**
   - **Location**: `frontend/src/pages/ComplaintDetail.tsx` line 63
   - **Issue**: `attachmentBase = apiBase.replace(/\/api$/, '')` 
     - If `apiBase` is `/api`, this becomes `/` (empty string after removing `/api`)
     - Then URL construction: `${attachmentBase}${a.url}` = `//attachments/filename` (double slash)
   - **Impact**: Browser requests malformed URLs, causing 404s
   - **Evidence**: Code was trying to derive attachment base from API base incorrectly

3. **⚠️ MINOR: Storage Path Not Explicitly Absolute**
   - **Location**: `backend/app/api/complaints.py` line 654
   - **Issue**: Used relative path `Path("storage/attachments")` and stored `str(dest)` which could be relative
   - **Impact**: Potential issues if working directory changes
   - **Evidence**: Code used `dest = storage_root / safe_name` without `.resolve()`

4. **⚠️ MINOR: Insufficient Logging**
   - **Location**: `backend/app/api/complaints.py`
   - **Issue**: No logging when files are saved or communications created
   - **Impact**: Difficult to debug upload issues
   - **Evidence**: No logger.info calls in upload flow

### Verified Working Components

✅ **Backend Static File Mount**: `app.mount("/attachments", StaticFiles(directory="storage/attachments"))` - correctly configured

✅ **Docker Volume**: `attachments_data:/app/storage/attachments` - already configured for persistence

✅ **Database Schema**: `Attachment` model has correct fields and `url` property

✅ **Response Schema**: `CommunicationOut` includes `attachments: List[AttachmentOut]` with `url` field

✅ **Relationship Loading**: `_get_complaint()` uses `joinedload(Communication.attachments)` to eager load attachments

✅ **Frontend Rendering**: UI code exists to render attachment links (lines 762-777 in ComplaintDetail.tsx)

## Fixes Implemented

### 1. Added Nginx Route for `/attachments/`

**File**: `nginx/default.conf`

```nginx
# Attachments (static files from backend)
location /attachments/ {
    set $backend_upstream http://backend:8000;
    proxy_pass $backend_upstream/attachments/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Cache attachments for 1 day
    proxy_cache_valid 200 1d;
    add_header Cache-Control "public, max-age=86400";
}
```

**Why**: Routes `/attachments/*` requests to backend's static file mount instead of frontend

### 2. Fixed Frontend URL Construction

**File**: `frontend/src/pages/ComplaintDetail.tsx`

**Before**:
```typescript
const attachmentBase = apiBase.replace(/\/api$/, '')
```

**After**:
```typescript
// Attachment URLs are served from /attachments/ at the root level (via nginx proxy to backend)
// Use absolute path from root, not relative to API base
const attachmentBase = ''
```

**Why**: Attachment URLs are absolute paths from root (`/attachments/filename`), not relative to API base

### 3. Made Storage Path Explicitly Absolute

**File**: `backend/app/api/complaints.py`

**Before**:
```python
dest = storage_root / safe_name
with dest.open("wb") as f:
    f.write(content)
saved_files.append({
    "storage_path": str(dest)
})
```

**After**:
```python
dest = storage_root / safe_name
dest_absolute = dest.resolve()  # Ensure absolute path
with dest_absolute.open("wb") as f:
    f.write(content)
logger.info(f"Saved attachment: {upload.filename} -> {dest_absolute} ({len(content)} bytes)")
saved_files.append({
    "storage_path": str(dest_absolute)
})
```

**Why**: Ensures storage_path is always absolute, preventing issues if working directory changes

### 4. Added Logging

**File**: `backend/app/api/complaints.py`

Added logging at key points:
- When file is saved: `logger.info(f"Saved attachment: {upload.filename} -> {dest_absolute} ({len(content)} bytes)")`
- When communication is created: `logger.info(f"Created communication {comm.id} with {len(saved_files)} attachment(s)")`
- When returning response: `logger.info(f"Returning communication {comm_with_attachments.id} with {len(comm_with_attachments.attachments)} attachment(s)")`

**Why**: Enables debugging of upload flow

### 5. Added Debug Endpoint

**File**: `backend/app/api/complaints.py`

Added `GET /api/complaints/{complaint_id}/attachments/debug` endpoint that returns:
- Total attachment count
- For each attachment:
  - File name, storage path, URL
  - Whether file exists on disk
  - File size in bytes
  - Communication ID

**Why**: Allows verification that attachments are saved and accessible

### 6. Improved Attachment URL Property Documentation

**File**: `backend/app/models/attachment.py`

Added comment clarifying URL generation:
```python
@property
def url(self) -> str:
    # Expose a path served by StaticFiles mount at /attachments
    # Extract filename from storage_path (handles both relative and absolute paths)
    filename = os.path.basename(self.storage_path)
    # Ensure URL is absolute from root (nginx will proxy /attachments/ to backend)
    return f"/attachments/{filename}"
```

## Testing Instructions

### On Your Droplet

1. **Pull latest changes and rebuild**:
   ```bash
   cd ~/Compass
   git pull
   docker compose down
   docker compose up -d --build
   ```

2. **Wait for services to start** (check logs):
   ```bash
   docker compose logs backend --tail 50
   docker compose logs nginx --tail 20
   ```

3. **Test file upload**:
   - Log into the app
   - Create a complaint or add a communication with a file attachment
   - Check backend logs for: `"Saved attachment: ..."` and `"Created communication ... with X attachment(s)"`

4. **Verify attachment in database**:
   ```bash
   docker compose exec backend python -c "
   from app.db.session import SessionLocal
   from app.models.attachment import Attachment
   db = SessionLocal()
   atts = db.query(Attachment).order_by(Attachment.uploaded_at.desc()).limit(5).all()
   for a in atts:
       print(f'{a.id}: {a.file_name} -> {a.storage_path} (URL: {a.url})')
   "
   ```

5. **Verify file exists on disk**:
   ```bash
   docker compose exec backend ls -lh /app/storage/attachments/ | tail -10
   ```

6. **Test attachment URL via nginx**:
   ```bash
   # Get an attachment URL from the debug endpoint or database
   # Then test:
   curl -I https://compass.lpgapps.work/attachments/1736179200.123-test.pdf
   # Should return 200 OK (or 404 if file doesn't exist)
   ```

7. **Use debug endpoint** (requires auth token):
   ```bash
   # Get token from browser localStorage or login
   TOKEN="your-jwt-token"
   COMPLAINT_ID="your-complaint-id"
   curl -H "Authorization: Bearer $TOKEN" \
     https://compass.lpgapps.work/api/complaints/$COMPLAINT_ID/attachments/debug
   ```

### Expected Results

- ✅ Files upload without errors
- ✅ Backend logs show file saves
- ✅ Database has Attachment records
- ✅ Files exist in `/app/storage/attachments/`
- ✅ Attachment URLs resolve (curl returns 200)
- ✅ Frontend displays attachment links
- ✅ Clicking attachment link downloads file

## Architecture Summary

### Attachment Flow

1. **Upload**: Frontend → `POST /api/complaints/{id}/communications` (multipart/form-data)
2. **Save**: Backend saves file to `/app/storage/attachments/{timestamp}-{filename}`
3. **Database**: Backend creates `Attachment` row with `storage_path` (absolute path)
4. **Response**: Backend returns `CommunicationOut` with `attachments` array
5. **URL Generation**: `Attachment.url` property returns `/attachments/{filename}`
6. **Frontend**: Renders link as `/attachments/{filename}` (absolute path)
7. **Serving**: Browser requests `/attachments/{filename}` → Nginx → Backend StaticFiles mount

### Key Paths

- **Storage**: `/app/storage/attachments/` (inside backend container, mounted as Docker volume)
- **Backend Mount**: FastAPI serves at `/attachments/` (root level, not under `/api`)
- **Nginx Route**: `/attachments/` → proxies to `http://backend:8000/attachments/`
- **Frontend URL**: `/attachments/{filename}` (absolute from root)

### Persistence

- Docker volume `compass_attachments_data` mounted at `/app/storage/attachments`
- Files persist across container restarts
- Volume location: `/var/lib/docker/volumes/compass_attachments_data/_data`

## Production Safety

✅ **Persistence**: Docker volume ensures files survive container restarts  
✅ **No Hardcoded Paths**: Uses relative paths resolved to absolute  
✅ **Correct URL Generation**: Absolute paths work behind nginx  
✅ **Error Handling**: Logging and debug endpoint for troubleshooting  
✅ **CORS**: Static files are public (no auth required, which is appropriate for attachments)

## Next Steps (Optional Improvements)

1. **Add authentication to attachment downloads** (if needed):
   - Create authenticated download endpoint: `GET /api/attachments/{attachment_id}/download`
   - Verify user has access to the complaint
   - Stream file with proper headers

2. **Add file cleanup**:
   - Background job to remove orphaned files (attachments without DB records)
   - Orphaned files can occur if DB transaction fails after file save

3. **Add file size limits in nginx**:
   ```nginx
   client_max_body_size 10M;  # Match MAX_UPLOAD_SIZE_MB
   ```

4. **Add attachment preview** (for images/PDFs):
   - Serve thumbnails or inline previews
   - Use `/attachments/{id}/preview` endpoint

