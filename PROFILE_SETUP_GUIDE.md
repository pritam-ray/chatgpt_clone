# Profile & Password Reset Setup Guide

## Database Migration

Run the following SQL script to add the new profile fields and password reset tokens table:

```bash
# Using MySQL command line
mysql -u root -p chatbot < database_profile_updates.sql

# Or using MySQL Workbench / phpMyAdmin, execute:
```

```sql
USE chatbot;

-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL COMMENT 'User first name',
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL COMMENT 'User last name';

-- Make username unique
ALTER TABLE users 
ADD UNIQUE INDEX idx_username_unique (username);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL COMMENT 'Expiry timestamp in milliseconds',
  used BOOLEAN DEFAULT FALSE COMMENT 'Whether token has been used',
  created_at BIGINT NOT NULL COMMENT 'Creation timestamp in milliseconds',
  
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  
  CONSTRAINT fk_password_reset_user 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Features Implemented

### 1. Profile Page
- **Access**: Click on your username in the top right corner → "Profile Settings"
- **Features**:
  - View and edit username (must be unique)
  - Add/edit first name and last name
  - Email address (read-only)
  - Change password with current password verification
  - Real-time validation and error handling

### 2. Forgot Password
- **Access**: Click "Forgot password?" on the login page
- **Flow**:
  1. Enter your email address
  2. Receive reset instructions (in development mode, token is shown on screen)
  3. Click reset link or use token on reset page
  4. Set new password
  5. Login with new credentials

### 3. Reset Password
- **Access**: Via email link with token parameter or direct URL
- **URL Format**: `http://localhost:5173?token=YOUR_RESET_TOKEN`
- **Features**:
  - Secure token validation (1-hour expiry)
  - Password confirmation
  - One-time use tokens
  - Auto-redirect to login after success

## API Endpoints

### Profile Management
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/profile` - Update profile (username, firstName, lastName)
- `POST /api/auth/change-password` - Change password (requires current password)

### Password Reset
- `POST /api/auth/forgot-password` - Request password reset (sends email/token)
- `POST /api/auth/reset-password` - Reset password with token

## Security Features

1. **Username Uniqueness**: Database constraint ensures no duplicate usernames
2. **Token Expiry**: Reset tokens expire after 1 hour
3. **One-Time Tokens**: Tokens are marked as used after successful reset
4. **Password Requirements**: Minimum 6 characters
5. **Session Invalidation**: All sessions revoked after password change
6. **Email Enumeration Prevention**: Generic success message for forgot password

## Development Mode

In development, the forgot password endpoint returns the reset token in the response:

```json
{
  "message": "If an account exists, a reset link will be sent",
  "resetToken": "abc123..." // Only in development
}
```

This token is displayed on the success page and can be used to test the reset flow.

## Production Setup

For production:
1. Set `NODE_ENV=production` in your environment
2. Configure an email service (e.g., SendGrid, AWS SES)
3. Update the forgot password endpoint to send actual emails
4. Remove the `resetToken` from the response

## Testing

1. **Profile Update**:
   ```
   Login → Click username → Profile Settings → Edit → Save
   ```

2. **Change Password**:
   ```
   Profile Settings → Change Password → Enter passwords → Update
   ```

3. **Forgot Password**:
   ```
   Login page → Forgot password? → Enter email → Copy token → Use on reset page
   ```

4. **Reset Password**:
   ```
   Use token from forgot password → Enter new password → Confirm → Login
   ```

## Troubleshooting

### Username Already Taken
- Choose a different username
- Usernames are case-sensitive

### Password Reset Token Invalid
- Token may have expired (1 hour limit)
- Token may have already been used
- Request a new reset token

### Profile Update Failed
- Check that username is unique
- Ensure you're authenticated
- Verify network connection

## Notes

- Profile changes take effect immediately
- Password changes force logout on all devices
- First name and last name are optional
- Email cannot be changed (requires separate verification flow)
