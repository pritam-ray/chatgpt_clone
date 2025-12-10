# Quick Start Guide - Authentication Setup

This guide will walk you through setting up the authentication system in 5 minutes.

## Prerequisites Checklist

Before starting, make sure you have:
- ✅ MySQL 8.0+ installed and running
- ✅ Node.js 16+ installed
- ✅ Azure OpenAI API credentials
- ✅ A terminal/command prompt open

## Step 1: Database Setup (2 minutes)

### 1.1 Create the Database

Open a terminal and run:

```bash
# Windows (PowerShell)
mysql -u root -p < database_setup.sql

# Enter your MySQL root password when prompted
```

Expected output:
```
Database 'chatbot' created successfully
Tables created: conversations, messages, attachments, azure_sessions
```

### 1.2 Add Authentication Tables

```bash
mysql -u root -p < database_auth_migration.sql

# Enter your MySQL root password when prompted
```

Expected output:
```
Tables created: users, refresh_tokens
Conversations table updated with user_id column
```

### 1.3 Verify Database Setup

```bash
mysql -u root -p -e "USE chatbot; SHOW TABLES;"
```

You should see:
```
+--------------------+
| Tables_in_chatbot  |
+--------------------+
| attachments        |
| azure_sessions     |
| conversations      |
| messages           |
| refresh_tokens     |
| users              |
+--------------------+
```

## Step 2: Backend Configuration (1 minute)

### 2.1 Navigate to Server Directory

```bash
cd server
```

### 2.2 Install Dependencies

```bash
npm install
```

This installs:
- Express (server framework)
- MySQL2 (database driver)
- bcryptjs (password hashing)
- jsonwebtoken (JWT tokens)
- cookie-parser (cookie handling)
- cors (cross-origin requests)

### 2.3 Configure Environment Variables

**Windows PowerShell:**
```powershell
# Copy example file
Copy-Item .env.example .env

# Generate secure JWT secrets
$secret1 = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
$secret2 = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host "JWT_SECRET=$secret1"
Write-Host "JWT_REFRESH_SECRET=$secret2"
```

**Then edit `server/.env` file:**
```env
PORT=4000

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=chatbot

# JWT Secrets (paste the generated secrets from above)
JWT_SECRET=paste_generated_secret_1_here
JWT_REFRESH_SECRET=paste_generated_secret_2_here
```

### 2.4 Start the Server

```bash
npm start
```

Expected output:
```
Server running on http://localhost:4000
Database connected successfully
```

**✅ Keep this terminal open and running!**

## Step 3: Frontend Configuration (1 minute)

### 3.1 Open a New Terminal

Navigate to the project root directory:

```bash
cd ..  # Go back to project root from server/
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Configure Azure OpenAI

**Windows PowerShell:**
```powershell
# Copy example file
Copy-Item .env.example .env
```

**Edit `.env` file in the root directory:**
```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=your-api-key-here
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
VITE_AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

### 3.4 Start the Frontend

```bash
npm run dev
```

Expected output:
```
VITE v5.4.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Step 4: Test Authentication (1 minute)

### 4.1 Open the Application

1. Open your browser
2. Navigate to: `http://localhost:5173`
3. You should see the **Login Page**

### 4.2 Create Your First Account

1. Click **"Sign up"** at the bottom of the login page
2. Fill in the signup form:
   - **Email**: your-email@example.com
   - **Username**: your-username (at least 2 characters)
   - **Password**: your-password (at least 6 characters)
   - **Confirm Password**: (same as password)
3. Click **"Sign Up"**

**✅ Success!** You'll be automatically logged in and see the chat interface.

### 4.3 Test the Features

Try these features to verify everything works:

1. **Start a chat**: Type "Hello!" and send
2. **Create new conversation**: Click the "+" button
3. **View profile**: Click your username in the top-right corner
4. **Logout**: Click your username → Logout
5. **Login again**: Use your email and password

## Step 5: Automated Testing (Optional)

Run the automated test suite to verify all authentication endpoints:

### 5.1 Open a Third Terminal

```bash
# In project root directory
node test-auth.js
```

This will test:
- ✅ User signup
- ✅ User login
- ✅ Get user profile
- ✅ Create conversation (protected endpoint)
- ✅ Refresh token
- ✅ Update profile
- ✅ Logout
- ✅ Token revocation

Expected output:
```
========================================
🚀 Authentication System Test Suite
========================================

🧪 Test 1: Signup
✅ Signup successful

🧪 Test 2: Login
✅ Login successful

... (more tests)

========================================
📊 Test Results Summary
========================================
Tests Passed: 8/8 (100%)
✅ All tests passed! Authentication system is working correctly.
```

## Troubleshooting

### Problem: "Cannot connect to MySQL"

**Solution:**
1. Check if MySQL is running:
   ```bash
   # Windows (PowerShell - run as Administrator)
   Get-Service MySQL*
   ```
2. Start MySQL if it's stopped:
   ```bash
   Start-Service MySQL80  # Or your MySQL service name
   ```

### Problem: "JWT_SECRET is not defined"

**Solution:**
1. Make sure you created `server/.env` file
2. Check that JWT_SECRET and JWT_REFRESH_SECRET are set
3. Restart the server after updating .env

### Problem: "Failed to fetch conversations"

**Solution:**
1. Check that server is running on port 4000
2. Check browser console for errors (F12)
3. Verify database migration was successful:
   ```bash
   mysql -u root -p -e "USE chatbot; DESCRIBE users;"
   ```

### Problem: Login page not showing

**Solution:**
1. Clear browser localStorage:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Delete all items
   - Refresh the page

### Problem: "Access token expired"

**Solution:**
This is normal! The system uses short-lived tokens (15 minutes).
- The app automatically refreshes tokens
- Just continue using the app normally
- If you see login page, your session expired (7 days)

## What's Next?

### Development
- Read [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for detailed API docs
- Read [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for architecture details
- Customize the UI in `src/components/LoginPage.tsx` and `SignupPage.tsx`

### Production Deployment
Before deploying to production:
1. **Generate strong secrets**: Use `openssl rand -hex 64` for JWT secrets
2. **Use HTTPS**: Never send tokens over HTTP in production
3. **Enable CORS properly**: Update CORS settings in `server/server.js`
4. **Set secure cookies**: Use httpOnly, secure, sameSite flags
5. **Add rate limiting**: Prevent brute force attacks
6. **Enable logging**: Monitor authentication events
7. **Backup database**: Regular backups of user data

### Additional Features
Consider adding:
- Email verification
- Password reset functionality
- OAuth (Google, GitHub, etc.)
- Two-factor authentication
- User profile avatars
- Account deletion

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md)
3. Check browser console (F12) for errors
4. Check server terminal for errors
5. Verify database tables exist and have correct schema

## Quick Reference

### Important Files
- `server/.env` - Backend configuration (database, JWT secrets)
- `.env` - Frontend configuration (Azure OpenAI)
- `database_auth_migration.sql` - Authentication tables
- `server/middleware/auth.js` - JWT middleware
- `server/routes/auth.js` - Authentication endpoints
- `src/contexts/AuthContext.tsx` - Frontend auth state
- `src/components/LoginPage.tsx` - Login UI
- `src/components/SignupPage.tsx` - Signup UI

### Common Commands
```bash
# Start server
cd server && npm start

# Start frontend
npm run dev

# Run tests
node test-auth.js

# Check database
mysql -u root -p -e "USE chatbot; SHOW TABLES;"

# View server logs
cd server && npm start  # Watch for errors here
```

### API Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile
- `POST /api/auth/change-password` - Change password

---

**🎉 Congratulations! Your authentication system is now fully set up and ready to use!**
