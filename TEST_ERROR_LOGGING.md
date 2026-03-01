# Testing Error Logging with Context

This guide shows how to test the error logging system that captures service method calls and request context.

## Test Endpoint

A test endpoint has been added at:
```
GET /api/entries/test-error
```

This endpoint intentionally tries to find a non-existent entry, which will trigger a `NotFoundError` and demonstrate the full error logging with context.

## Prerequisites

1. **Start the API server:**
   ```bash
   cd apps/api
   pnpm dev
   ```
   The server should be running on `http://localhost:3000`

2. **Get an authentication session:**
   You need to be authenticated to access the endpoint. You can either:
   - Log in through the web app at `http://localhost:5173` and copy the session cookie
   - Or use Better Auth's session endpoint

## Testing with curl

### Option 1: Using an existing session cookie

If you're logged in via the web app, you can copy the session cookie from your browser's developer tools.

```bash
# Replace YOUR_SESSION_COOKIE with your actual session cookie value
curl -X GET http://localhost:3000/api/entries/test-error \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_COOKIE" \
  -v
```

### Option 2: Using a test user session

First, you'll need to authenticate. The exact method depends on your Better Auth setup, but typically:

```bash
# 1. Sign in (adjust endpoint based on your auth setup)
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"yourpassword"}' \
  -c cookies.txt

# 2. Use the saved cookie to test the error endpoint
curl -X GET http://localhost:3000/api/entries/test-error \
  -b cookies.txt \
  -v
```

## Expected Response

The API will return:
```json
{
  "error": "Entry not found"
}
```

With HTTP status `404`.

## Expected Server Log Output

In your server console, you should see detailed error logging like this:

```
[ERROR] NotFoundError: Entry not found

Request: {
  method: 'GET',
  path: '/test-error',
  params: {},
  query: {},
  userId: 'user_abc123'
}

Service Call: entriesService.findById({"id":"00000000-0000-0000-0000-000000000000","userId":"user_abc123"})

Stack: NotFoundError: Entry not found
    at Object.findById (/path/to/entries.service.ts:23:19)
    at /path/to/entries.routes.ts:45:42
    ...
```

## Key Features Demonstrated

1. **HTTP Request Context**: Method, path, params, query, and userId
2. **Service Call Context**: Service name, method name, and arguments in executable format
3. **Stack Trace**: Full error stack for debugging
4. **Clean API Response**: Error context is logged but not exposed in the API response

## Testing Other Error Types

You can also test other endpoints to see different error types:

```bash
# Test NotFoundError with a non-existent entry ID
curl -X GET http://localhost:3000/api/entries/non-existent-id \
  -b cookies.txt

# Test ForbiddenError by trying to update a deleted entry
# (First create an entry, then soft delete it, then try to update)

# Test ValidationError by sending invalid data
curl -X POST http://localhost:3000/api/entries \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"invalid":"data"}'
```

## Notes

- The error context is **only logged** on the server - it's never exposed in API responses
- The service call format is **executable** - you can copy-paste it to reproduce the error
- All service methods now use object parameters for better debugging context
