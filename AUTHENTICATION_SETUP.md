# Authentication Setup Guide

This guide covers the authentication system implemented in the ChatGPT Clone application.

## Overview

The application now includes a complete JWT-based authentication system with:
- User registration and login
- Secure password hashing with bcrypt
- Access tokens (15-minute expiry) and refresh tokens (7-day expiry)
- Protected API endpoints
- User-specific data isolation
- Session management with automatic token refresh

## Database Setup

### 1. Run the Authentication Migration

Execute the SQL migration to create authentication tables:

```bash
mysql -u root -p < database_auth_migration.sql
```

Or manually run the SQL commands from `database_auth_migration.sql` in your MySQL client.

### Database Schema

**New Tables:**
- `users` - Stores user accounts (id, email, username, password_hash, created_at, last_login_at, is_active)
- `refresh_tokens` - Manages refresh tokens (id, user_id, token, expires_at, revoked, created_at)

**Modified Tables:**
- `conversations` - Added `user_id` foreign key to associate conversations with users

## Backend Setup

### 1. Install Dependencies

The following packages have been installed:
```bash
cd server
npm install bcryptjs jsonwebtoken cookie-parser
```

### 2. Configure Environment Variables

Copy the example file and set your secrets:
```bash
cd server
cp .env.example .env
```

Edit `server/.env` and update these critical values:
```env
# Generate secure random secrets for production!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
```

**IMPORTANT:** Use strong, random secrets in production. Generate them using:
```bash
# Windows PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))

# Or Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Server Structure

**New Files:**
- `server/middleware/auth.js` - JWT authentication middleware
- `server/routes/auth.js` - Authentication API endpoints

**Modified Files:**
- `server/server.js` - Added auth routes and protected all endpoints

## Frontend Setup

### 1. New Components

- `src/contexts/AuthContext.tsx` - Global authentication state management
- `src/components/LoginPage.tsx` - Login interface
- `src/components/SignupPage.tsx` - User registration interface

### 2. Modified Files

- `src/main.tsx` - Wrapped app with AuthProvider
- `src/App.tsx` - Added authentication checks and user menu
- `src/services/api.ts` - Added JWT token headers to all API requests

## API Endpoints

### Authentication Endpoints

**POST /api/auth/signup**
- Register a new user
- Body: `{ email, username, password }`
- Returns: `{ message, user: { id, email, username }, accessToken, refreshToken }`

**POST /api/auth/login**
- Login with email and password
- Body: `{ email, password }`
- Returns: `{ message, user: { id, email, username }, accessToken, refreshToken }`

**POST /api/auth/logout**
- Logout and revoke refresh token
- Headers: `Authorization: Bearer <access_token>`
- Body: `{ refreshToken }`
- Returns: `{ message }`

**POST /api/auth/refresh**
- Get new access token using refresh token
- Body: `{ refreshToken }`
- Returns: `{ accessToken, refreshToken }`

**GET /api/auth/me**
- Get current user profile
- Headers: `Authorization: Bearer <access_token>`
- Returns: `{ user: { id, email, username, created_at, last_login_at } }`

**PATCH /api/auth/me**
- Update user profile (username and/or email)
- Headers: `Authorization: Bearer <access_token>`
- Body: `{ username?, email? }`
- Returns: `{ message, user }`

**POST /api/auth/change-password**
- Change user password
- Headers: `Authorization: Bearer <access_token>`
- Body: `{ currentPassword, newPassword }`
- Returns: `{ message }`

### Protected Endpoints

All conversation and message endpoints now require authentication:
- `GET /api/conversations` - List user's conversations
- `GET /api/conversations/:id` - Get specific conversation
- `POST /api/conversations` - Create new conversation
- `PATCH /api/conversations/:id/title` - Update conversation title
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Add message
- `POST /api/azure-sessions` - Save Azure session
- `GET /api/conversations/:id/session` - Get Azure session

All endpoints automatically filter data by the authenticated user's ID.

## Security Features

### Password Security
- Passwords hashed using bcrypt with 10 salt rounds
- Minimum password length: 6 characters (enforced on frontend)
- Password confirmation required during signup

### Token Security
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Refresh tokens can be revoked (on logout)
- Tokens stored in localStorage (access) and database (refresh)

### API Security
- All protected endpoints verify JWT tokens
- User-specific data isolation (conversations filtered by user_id)
- CORS configured with credentials support
- SQL injection protection (parameterized queries)

### Validation
- Email format validation
- Username length validation (minimum 2 characters)
- Password strength requirements
- Unique email constraint in database

## Usage Flow

### 1. First-Time User (Signup)

1. User opens the application
2. Clicks "Sign up" on the login page
3. Enters email, username, password (and confirms password)
4. System creates account with hashed password
5. Returns access token and refresh token
6. User is automatically logged in

### 2. Returning User (Login)

1. User opens the application
2. Enters email and password on login page
3. System verifies credentials
4. Returns access token and refresh token
5. User gains access to their conversations

### 3. Using Protected Features

1. Frontend automatically includes JWT token in all API requests
2. Backend verifies token on each request
3. If token is expired, frontend can request a new one using refresh token
4. User sees only their own conversations and messages

### 4. Logout

1. User clicks logout button in user menu
2. Frontend calls logout endpoint
3. Backend revokes refresh token in database
4. Frontend clears tokens from localStorage
5. User is redirected to login page

## Development Testing

### 1. Start the Server

```bash
cd server
npm start
```

Server runs on `http://localhost:4000`

### 2. Start the Frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

### 3. Test the Flow

1. Open `http://localhost:5173`
2. You should see the login page
3. Click "Sign up" and create a new account
4. After signup, you'll be automatically logged in
5. Create some conversations and messages
6. Logout and login again to verify persistence
7. Open browser DevTools > Network tab to see JWT tokens in requests

## Token Refresh Implementation

The `AuthContext` automatically handles token refresh:
- On app load, checks for stored access token
- If token exists, calls `/api/auth/me` to verify and get user info
- If token is expired, uses refresh token to get a new access token
- If refresh token is also expired, redirects to login

To implement automatic retry on 401 errors (optional enhancement):

```typescript
// In api.ts, add retry logic for 401 responses
if (response.status === 401) {
  // Try to refresh token
  const refreshed = await refreshAccessToken();
  if (refreshed) {
    // Retry the original request with new token
    return fetch(url, { ...options, headers: getAuthHeaders() });
  }
  // If refresh fails, logout
  logout();
}
```

## Common Issues

### Issue: "JWT_SECRET is not defined"
**Solution:** Make sure you copied `.env.example` to `.env` in the `server` directory and set the JWT secrets.

### Issue: "Failed to fetch conversations" after login
**Solution:** Check that:
1. MySQL database is running
2. Migration script has been executed
3. Server is running on port 4000
4. JWT_SECRET and JWT_REFRESH_SECRET are set in server/.env

### Issue: User can't see their old conversations after implementing auth
**Solution:** This is expected. Old conversations don't have a user_id. You can either:
1. Manually assign them in the database: `UPDATE conversations SET user_id = 1 WHERE user_id IS NULL;`
2. Create new conversations after authentication

### Issue: Tokens not being sent with requests
**Solution:** Verify that:
1. `getAuthHeaders()` is called in every API function
2. Tokens are being stored in localStorage after login
3. CORS is configured with `credentials: 'include'` if using cookies

## Production Considerations

### Security Enhancements for Production

1. **Use HTTPS:** Always use HTTPS in production to encrypt token transmission
2. **Secure Token Storage:** Consider using httpOnly cookies instead of localStorage for refresh tokens
3. **Rate Limiting:** Add rate limiting to authentication endpoints to prevent brute force attacks
4. **Password Strength:** Enforce stronger password requirements (uppercase, lowercase, numbers, symbols)
5. **Email Verification:** Add email verification before allowing login
6. **Two-Factor Authentication:** Implement 2FA for additional security
7. **Session Monitoring:** Log authentication events and monitor for suspicious activity
8. **Token Rotation:** Implement refresh token rotation (issue new refresh token on each refresh)
9. **Helmet.js:** Use Helmet.js to set security headers
10. **Environment Variables:** Never commit .env files; use environment variable management systems

### Database Considerations

1. **Indexing:** Ensure indexes on `users.email` and `refresh_tokens.user_id`
2. **Cleanup:** Schedule job to delete expired refresh tokens
3. **Backups:** Regular database backups including user data
4. **Connection Pooling:** Configure MySQL connection pool for better performance

### Monitoring

1. **Failed Login Attempts:** Track and alert on excessive failed logins
2. **Token Usage:** Monitor token refresh rates and expiration patterns
3. **Active Users:** Track active sessions and user activity
4. **API Errors:** Monitor authentication endpoint error rates

## Future Enhancements

Potential features to add:

1. **Email Verification:** Verify email addresses before account activation
2. **Password Reset:** "Forgot password" flow with email-based reset
3. **OAuth Integration:** Add Google, GitHub, Microsoft login options
4. **User Profiles:** Extended user profiles with avatars, preferences
5. **Multi-Factor Authentication:** SMS or TOTP-based 2FA
6. **Account Management:** Self-service account deletion, data export
7. **Admin Dashboard:** User management, analytics, moderation tools
8. **Role-Based Access Control:** Different user roles with varying permissions

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [bcrypt Security](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns)
