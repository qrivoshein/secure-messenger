# 🔒 File Security Implementation

## Problem
Previously, uploaded files were accessible to **anyone** with the direct URL:
```
❌ http://example.com/uploads/12345-image.jpg  (no authentication required)
```

This is a critical security vulnerability for a secure messenger - any leaked URL would expose private files.

## Solution
Implemented **authenticated file access** with permission checking:

### Architecture
1. **Removed direct access**: Deleted `express.static` middleware for `/uploads`
2. **Added protected endpoint**: `/api/file/:filename` with authentication
3. **Permission check**: Verify user has access to file before serving

### How it Works

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/file/image.jpg
       │ Authorization: Bearer <token>
       ▼
┌─────────────┐
│   Auth MW   │ ──> Verify token
└──────┬──────┘
       │ token valid ✓
       ▼
┌─────────────┐
│ File Service│ ──> Check DB: Does user have
└──────┬──────┘     messages with this file?
       │
       ├─ YES ──> Stream file to client ✓
       └─ NO  ──> 403 Forbidden ❌
```

### Implementation Details

#### 1. File Service (`src/services/file.service.js`)
```javascript
async checkFileAccess(username, filename) {
    // Query database to check if user has messages with this file
    // Returns true only if user is sender OR recipient
}
```

#### 2. File Controller (`src/controllers/file.controller.js`)
```javascript
async getFile(req, res, next) {
    // 1. Check permission
    // 2. Stream file if authorized
    // 3. Return 403 if not authorized
}
```

#### 3. Protected Route
```javascript
GET /api/file/:filename
- Requires: Authorization header with valid token
- Returns: File stream (200) or 403 Forbidden
```

### Security Features

✅ **Authentication Required**: Must have valid session token
✅ **Authorization Check**: User must be part of chat with this file
✅ **Path Traversal Protection**: Using `path.basename()` to sanitize
✅ **Backward Compatible**: Supports old `/uploads/` URLs in DB
✅ **Streaming**: Efficient file delivery without loading into memory
✅ **Proper MIME Types**: Correct Content-Type headers
✅ **Caching**: `Cache-Control: private, max-age=3600`

### Breaking Changes

#### For Frontend/Client
**OLD** (insecure):
```javascript
<img src="/uploads/12345-image.jpg" />
```

**NEW** (secure):
```javascript
<img src="/api/file/12345-image.jpg" />
// Must include Authorization header in fetch/axios
```

**Example fetch:**
```javascript
const response = await fetch('/api/file/image.jpg', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
```

#### For HTML <img> tags
Since `<img>` can't send custom headers, you need to either:

**Option 1**: Use blob URLs (recommended)
```javascript
async function loadSecureImage(filename, token) {
    const response = await fetch(`/api/file/${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// Usage
const imageUrl = await loadSecureImage('image.jpg', token);
document.getElementById('img').src = imageUrl;
```

**Option 2**: Add token to URL (less secure, but works with <img>)
```javascript
// Would require implementing query param authentication
<img src="/api/file/image.jpg?token=abc123" />
```

### API Response Examples

#### Success (200)
```
GET /api/file/12345-image.jpg
Authorization: Bearer valid_token

Response:
Status: 200 OK
Content-Type: image/jpeg
Content-Length: 54321
Content-Disposition: inline; filename="12345-image.jpg"
Cache-Control: private, max-age=3600

[binary file data]
```

#### Forbidden (403)
```
GET /api/file/12345-image.jpg
Authorization: Bearer other_user_token

Response:
Status: 403 Forbidden
{
  "error": "Access denied to this file"
}
```

#### Unauthorized (401)
```
GET /api/file/12345-image.jpg
(no auth header)

Response:
Status: 401 Unauthorized
{
  "error": "No token provided"
}
```

#### Not Found (404)
```
GET /api/file/nonexistent.jpg
Authorization: Bearer valid_token

Response:
Status: 404 Not Found
{
  "error": "File not found"
}
```

### Database Query
```sql
SELECT m.from_username, m.to_username, m.media_url 
FROM messages m 
WHERE (m.media_url = '/api/file/filename' OR m.media_url = '/uploads/filename')
AND (m.from_username = $1 OR m.to_username = $1)
LIMIT 1
```

### Performance Considerations

✅ **Efficient**: Uses streams instead of loading files into memory
✅ **Database indexed**: Query uses indexed columns (from_username, to_username)
✅ **Caching**: Browser caching enabled (1 hour)
⚠️ **Extra DB query**: Every file access requires database lookup

### Testing

#### Test 1: Authorized Access
```bash
# Login and get token
TOKEN=$(curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass"}' | jq -r .token)

# Access file from your chat
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/file/image.jpg \
  --output test.jpg

# Should return file ✓
```

#### Test 2: Unauthorized Access
```bash
# Try to access someone else's file
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/file/other-users-file.jpg

# Should return 403 Forbidden ✓
```

#### Test 3: No Authentication
```bash
# Try without token
curl http://localhost:3000/api/file/image.jpg

# Should return 401 Unauthorized ✓
```

#### Test 4: Old URL (backwards compatibility)
```bash
# Old /uploads/ URLs still work (if file exists in user's messages)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/file/old-file.jpg

# Should work if user has access ✓
```

### Migration Notes

**Existing files**: No migration needed - files stay in `/uploads/` directory
**Existing URLs in DB**: Both `/uploads/` and `/api/file/` formats supported
**Frontend changes**: Required - must update all file URL references

### Logging

File access is logged for security auditing:
```
[debug] File access granted: user1 -> image.jpg
[warn] Unauthorized file access attempt: user2 -> image.jpg
[error] Error streaming file image.jpg: [error details]
```

### Future Improvements

- [ ] Add temporary signed URLs with expiration
- [ ] Implement file access logging/audit trail
- [ ] Add rate limiting specifically for file downloads
- [ ] Support for range requests (video streaming)
- [ ] Add file virus scanning before serving
- [ ] Implement file deletion when message is deleted
- [ ] Add file storage quota per user

---

**Security Level**: ⬆️ **Significantly Improved**
**Breaking Changes**: ⚠️ **Yes** - Frontend must be updated
**Backward Compatible URLs**: ✅ Yes (in database)
