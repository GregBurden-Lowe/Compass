# File Upload Debugging Guide

## Files That Control File Uploads

### Frontend Files

#### 1. **`frontend/src/pages/CreateComplaintWizard.tsx`**
   - **Lines ~140-200**: File upload input and state management for complaint creation
   - **Key variables**: `channelFile` (state)
   - **Key function**: `submit()` - handles file upload after complaint creation
   - **File input**: Lines ~280-290 (file input button)
   - **Upload logic**: Lines ~150-180 (FormData creation and API call)

#### 2. **`frontend/src/pages/ComplaintDetail.tsx`**
   - **Lines ~195-240**: File upload for adding communications
   - **Key variables**: `files` (state, FileList)
   - **Key function**: `addCommunication()` - handles file upload when adding communication
   - **File input**: Lines ~710-718 (file input button with `multiple` attribute)
   - **Upload logic**: Lines ~195-240 (FormData creation and API call)

#### 3. **`frontend/src/api/client.ts`**
   - Axios configuration and interceptors
   - Base URL configuration
   - Request/response interceptors (handles 401, adds auth tokens)

### Backend Files

#### 4. **`backend/app/api/complaints.py`**
   - **Lines 618-691**: `add_communication()` endpoint
   - **Key logic**:
     - Lines 638-646: Manual form data parsing for files
     - Lines 648-666: File saving to disk
     - Lines 667-677: Creating communication with attachments
     - Lines 685-691: Reloading communication with attachments
   - **Endpoint**: `POST /api/complaints/{complaint_id}/communications`

#### 5. **`backend/app/services/complaints.py`**
   - **Lines 227-267**: `add_communication_with_attachments()` function
   - Creates Communication and Attachment records in database
   - Links attachments to communication

#### 6. **`backend/app/main.py`**
   - **Line 120**: StaticFiles mount for serving attachments
   - `app.mount("/attachments", StaticFiles(directory="storage/attachments"), name="attachments")`

#### 7. **`backend/app/models/attachment.py`**
   - Attachment database model
   - `url` property that generates `/attachments/{filename}`

#### 8. **`backend/start.sh`**
   - **Line 4**: Creates `storage/attachments` directory on startup

## Debugging Checklist

### Frontend Issues

1. **Check browser console for errors**
   - Open DevTools (F12) → Console tab
   - Look for:
     - Network errors (404, 500, 422)
     - JavaScript errors
     - CORS errors

2. **Check Network tab**
   - Open DevTools → Network tab
   - Filter by "XHR" or "Fetch"
   - Try uploading a file
   - Check the request to `/api/complaints/{id}/communications`:
     - **Request Headers**: Should have `Content-Type: multipart/form-data` (with boundary)
     - **Request Payload**: Should show FormData with `files` field
     - **Response**: Check status code and error message

3. **Verify file input state**
   - In `ComplaintDetail.tsx`, check if `files` state is being set
   - Add `console.log(files)` in `addCommunication()` function

4. **Check FormData construction**
   - In `addCommunication()`, verify:
     - `form.append('files', file)` for each file
     - All required fields are appended (channel, direction, summary, etc.)

### Backend Issues

1. **Check backend logs**
   ```bash
   docker compose logs backend --tail 100
   ```
   Look for:
   - Validation errors
   - File system errors (permissions, disk space)
   - Database errors

2. **Verify file storage path**
   - Check if `storage/attachments` directory exists in container:
     ```bash
     docker compose exec backend ls -la /app/storage/attachments
     ```
   - Check volume mount:
     ```bash
     docker compose exec backend mount | grep attachments
     ```

3. **Check file permissions**
   ```bash
   docker compose exec backend ls -la /app/storage/
   ```
   Should be writable by the container user

4. **Test file upload directly**
   ```bash
   # Get auth token first
   TOKEN="your-jwt-token"
   
   # Test upload
   curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -F "channel=email" \
     -F "direction=inbound" \
     -F "summary=Test upload" \
     -F "occurred_at=2024-01-01T12:00:00" \
     -F "is_final_response=false" \
     -F "files=@/path/to/test.pdf" \
     http://localhost:8000/api/complaints/{complaint_id}/communications
   ```

5. **Check database**
   ```bash
   docker compose exec backend python -c "
   from app.db.session import SessionLocal
   from app.models.attachment import Attachment
   db = SessionLocal()
   attachments = db.query(Attachment).all()
   for a in attachments:
       print(f'{a.id}: {a.file_name} -> {a.storage_path}')
   "
   ```

## Common Issues

### Issue: Files not appearing after upload
- **Check**: Backend logs for errors during file save
- **Check**: Database has attachment records
- **Check**: Files exist in `storage/attachments` directory
- **Check**: Frontend is calling `load()` after upload

### Issue: 422 Validation Error
- **Check**: Backend logs for validation error details
- **Check**: FormData fields match backend expectations
- **Check**: File field name is `files` (plural)

### Issue: 500 Internal Server Error
- **Check**: Backend logs for full stack trace
- **Check**: Disk space: `docker compose exec backend df -h`
- **Check**: File permissions on storage directory

### Issue: Files not persisting after container restart
- **Check**: Volume mount is configured in `docker-compose.yml`
- **Check**: Volume exists: `docker volume ls | grep attachments`

## Key Code Locations

### Frontend - CreateComplaintWizard.tsx
- File input: ~Line 280-290
- Upload logic: ~Line 150-180

### Frontend - ComplaintDetail.tsx  
- File input: ~Line 710-718
- Upload function: ~Line 195-240
- FormData creation: ~Line 200-210

### Backend - complaints.py
- Endpoint definition: Line 618
- Form parsing: Lines 638-646
- File saving: Lines 652-666
- Communication creation: Lines 667-677

