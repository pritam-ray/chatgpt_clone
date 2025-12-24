# Personalized Chatbot - Complete Documentation

A sophisticated full-stack AI chatbot application powered by Azure OpenAI with advanced features including real-time web search, multimodal support, JWT authentication, and persistent MySQL storage.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)
![Azure OpenAI](https://img.shields.io/badge/Azure%20OpenAI-API-blue)

---

## 📋 Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [Authentication System](#authentication-system)
7. [Web Search Feature](#web-search-feature)
8. [Database Schema](#database-schema)
9. [API Documentation](#api-documentation)
10. [Project Structure](#project-structure)
11. [Usage Guide](#usage-guide)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Functionality
- 🤖 **Azure OpenAI Integration** - Powered by GPT-4 with streaming responses
- 🌐 **Real-Time Web Search** - Search the web and get current information using DuckDuckGo
- 📎 **Multimodal Support** - Handle images, PDFs, documents, and text files
- 💾 **Persistent Storage** - MySQL database for conversations and user data
- 🔐 **JWT Authentication** - Secure user authentication with token refresh
- 🔍 **Advanced Search** - Search across all conversations with highlighted results
- 🎨 **Modern UI** - Beautiful, responsive interface with dark/light themes
- 📱 **Mobile Responsive** - Optimized for all devices and screen sizes

### Advanced Features
- ✨ **Streaming Responses** - Real-time message generation
- 🔄 **Context Management** - Intelligent conversation history handling
- 📊 **Markdown Rendering** - Full GFM support with tables, code blocks, and math (KaTeX)
- 🎯 **Message Actions** - Copy, regenerate, and edit messages
- 👤 **User Profiles** - Manage account settings and preferences
- 📧 **Password Reset** - Email-based password recovery system
- 🔗 **URL Scraping** - Extract and parse content from web pages
- 💬 **Conversation Management** - Create, rename, delete conversations

---

## 🛠️ Technology Stack

### Frontend
- **React 18.3** - Modern UI library with hooks and concurrent features
- **TypeScript 5.5** - Type-safe development
- **Vite 5.4** - Lightning-fast build tool and dev server
- **TailwindCSS 3.4** - Utility-first CSS framework
- **Lucide React** - Beautiful, consistent icon library
- **marked** - Markdown to HTML parser
- **DOMPurify** - XSS sanitizer for HTML
- **KaTeX** - Mathematical equation rendering
- **pdf.js** - Client-side PDF parsing

### Backend
- **Node.js 16+** - JavaScript runtime
- **Express 4** - Web application framework
- **MySQL 8.0** - Relational database
- **JWT (jsonwebtoken)** - Authentication tokens
- **bcrypt** - Password hashing
- **nodemailer** - Email sending
- **axios** - HTTP client
- **cheerio** - HTML parsing for web scraping
- **LangChain** - AI framework integration
- **@langchain/openai** - Azure OpenAI integration

### AI & Search
- **Azure OpenAI** - GPT-4 language model
- **DuckDuckGo** - Web search fallback
- **Bing Search API** - Optional premium web search
- **LangChain Framework** - AI orchestration

---

## 🏗️ Architecture

### System Design

```
┌─────────────────┐
│   React Client  │
│   (Port 5173)   │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         ↓
┌─────────────────┐
│  Express Server │
│   (Port 4000)   │
└────┬───────┬────┘
     │       │
     │       │ LangChain
     ↓       ↓
┌─────────┐ ┌──────────────┐
│  MySQL  │ │ Azure OpenAI │
│Database │ │  + Web Search│
└─────────┘ └──────────────┘
```

### Data Flow

1. **User Input** → React Frontend
2. **API Request** → Express Backend (with JWT auth)
3. **Web Search** (if enabled) → DuckDuckGo/Bing → Content Scraping
4. **AI Processing** → Azure OpenAI via LangChain → Streaming Response
5. **Database Storage** → MySQL (conversations, messages, users)
6. **UI Update** → Real-time message display

### Authentication Flow

```
User Login → JWT Access Token (15min) + Refresh Token (7 days)
           → Stored in localStorage
           → Sent in Authorization header
           → Auto-refresh on expiration
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** v16 or higher
- **MySQL** 8.0 or higher
- **Azure OpenAI** API access
- **Git** for version control

### 1. Clone Repository

```bash
git clone https://github.com/pritam-ray/Personalized-chatbot.git
cd Personalized-chatbot
```

### 2. Database Setup

Open MySQL Workbench or command line and execute:

```bash
mysql -u root -p < DATABASE_SETUP.sql
```

This creates:
- `chatbot` database
- `users` table (authentication)
- `refresh_tokens` table (session management)
- `conversations` table (chat history)
- `messages` table (message storage)
- `attachments` table (file metadata)

**Database Schema:**

```sql
-- Users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- Conversations table
CREATE TABLE conversations (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'New chat',
  user_id INT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  azure_session_id VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at)
);

-- Messages table
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_conversation_timestamp (conversation_id, timestamp)
);
```

### 3. Backend Setup

```bash
cd server
npm install
```

Create `server/.env` file:

```env
# Server Configuration
PORT=4000
FRONTEND_URL=http://localhost:5173

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=chatbot

# JWT Secrets (Generate strong random strings!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2025
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2025

# Email Configuration (for password reset)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Azure OpenAI (for Web Search with LangChain)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=GPT-41
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# Optional: Bing Web Search API
BING_SEARCH_API_KEY=your-bing-api-key
```

**Email Setup (Gmail Example):**
1. Enable 2-Factor Authentication
2. Generate App Password at: https://myaccount.google.com/apppasswords
3. Use app password (not your regular password)

Start server:

```bash
npm start
```

Server runs on `http://localhost:4000`

### 4. Frontend Setup

```bash
# In root directory
npm install
```

Create `.env` file:

```env
# Azure OpenAI Configuration
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=your-api-key
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
VITE_AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Backend API
VITE_API_BASE_URL=http://localhost:4000
```

Start development server:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## ⚙️ Configuration

### Azure OpenAI Setup

1. **Create Azure Resource**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create "Azure OpenAI" resource
   - Note the endpoint URL

2. **Deploy Model**
   - Navigate to Azure OpenAI Studio
   - Deploy GPT-4 or GPT-3.5-turbo model
   - Note the deployment name

3. **Get API Key**
   - Go to resource "Keys and Endpoint"
   - Copy API key and endpoint

### Email Configuration

**Gmail:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

**Outlook:**
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

**Custom SMTP:**
```env
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password
```

### Security Best Practices

**Generate Strong JWT Secrets:**
```bash
# Linux/Mac
openssl rand -base64 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# PowerShell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## 🔐 Authentication System

### Features

- **User Registration** with email verification
- **Secure Login** with JWT tokens
- **Password Hashing** using bcrypt (10 salt rounds)
- **Token Refresh** automatic renewal
- **Password Reset** via email
- **Profile Management** update user info
- **Session Management** track active sessions

### API Endpoints

#### POST `/auth/signup`
Register new user.

**Request:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/auth/login`
Authenticate user.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/auth/refresh`
Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/auth/logout`
Invalidate refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

#### POST `/auth/forgot-password`
Request password reset email.

**Request:**
```json
{
  "email": "admin@example.com"
}
```

#### POST `/auth/reset-password`
Reset password with token.

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

#### GET `/auth/me`
Get current user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

---

## 🌐 Web Search Feature

### Overview

The chatbot can search the web in real-time to provide current information using the globe button (🌐) in the chat input.

### How It Works

1. **User enables web search** → Click globe icon (turns green)
2. **Sends message** → Shows "🔍 Searching the web..."
3. **Scrapes content** → Top 3 web pages are fetched and parsed
4. **AI Analysis** → Azure OpenAI processes search results with user question
5. **Formatted response** → Answer with sources cited

### Search Sources

**Primary:** DuckDuckGo HTML Search
- No API key required
- Reliable and fast
- Full content scraping from top results

**Optional:** Bing Web Search API
- More comprehensive results
- Requires Azure subscription
- Add `BING_SEARCH_API_KEY` to `.env`

### Implementation Details

**File:** `server/services/webSearchService.js`

```javascript
// Web search with content scraping
async performWebSearch(query) {
  // 1. Search DuckDuckGo/Bing
  // 2. Scrape top 3 web pages
  // 3. Extract main content (up to 3000 chars each)
  // 4. Format for AI consumption
}

// Azure OpenAI integration
async processQueryStream(userMessage, conversationHistory, onToken) {
  // 1. Show "Searching..." status
  // 2. Perform web search
  // 3. Build context with search results
  // 4. Stream AI response
}
```

### Status Updates

Users see real-time progress:
- 🔍 Searching the web...
- ✓ Search complete. Analyzing results...
- [AI response with citations]

---

## 📊 Database Schema

### Complete Schema

```sql
-- Users and Authentication
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversations and Messages
CREATE TABLE conversations (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) DEFAULT 'New chat',
  user_id INT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  azure_session_id VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(36) NOT NULL,
  type ENUM('image', 'pdf', 'document') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  file_size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

---

## 📁 Project Structure

```
chatbot/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── ChatInput.tsx        # Message input with file upload
│   │   ├── ChatMessage.tsx      # Message display with markdown
│   │   ├── Sidebar.tsx          # Conversation list sidebar
│   │   ├── SearchModal.tsx      # Search conversations modal
│   │   ├── WelcomePage.tsx      # Initial welcome screen
│   │   ├── LoginPage.tsx        # User login
│   │   ├── SignupPage.tsx       # User registration
│   │   ├── ProfilePage.tsx      # User profile management
│   │   ├── ForgotPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context
│   ├── services/
│   │   ├── api.ts              # API client functions
│   │   ├── azureOpenAI.ts      # Azure OpenAI integration
│   │   └── azureResponseAPI.ts # Response API with sessions
│   ├── types/
│   │   └── chat.ts             # TypeScript type definitions
│   ├── utils/
│   │   ├── markdown.ts         # Markdown parser
│   │   └── pdfExtractor.ts     # PDF text extraction
│   ├── App.tsx                 # Main application
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
│
├── server/                      # Backend server
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── routes/
│   │   └── auth.js             # Authentication routes
│   ├── services/
│   │   ├── emailService.js     # Email sending
│   │   └── webSearchService.js # Web search with LangChain
│   ├── server.js               # Express server
│   ├── package.json
│   └── .env                    # Backend config (create this)
│
├── public/                      # Static assets
├── DATABASE_SETUP.sql           # Complete database initialization
├── package.json                # Frontend dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # TailwindCSS config
├── tsconfig.json               # TypeScript config
├── .env                        # Frontend config (create this)
└── DOCUMENTATION.md            # This file
```

---

## 📖 Usage Guide

### Basic Chat

1. **Start conversation** - Click "New chat" or use welcome suggestions
2. **Type message** - Enter your question in the input field
3. **Send** - Press Enter or click send button
4. **View response** - AI responds in real-time with streaming

### Web Search

1. **Enable search** - Click globe icon (🌐) - it turns green
2. **Ask question** - Type query requiring current information
3. **Wait for search** - See "Searching the web..." status
4. **Get answer** - AI responds with web sources

Example queries:
- "What are the latest developments in AI?"
- "Current weather in New York"
- "Latest news about electric vehicles"

### File Attachments

1. **Click attachment icon** (📎)
2. **Select file** - PDF, image, or document
3. **Wait for processing** - File is analyzed
4. **Ask questions** - AI can reference the file content

Supported formats:
- **Images:** JPG, PNG, GIF, WebP
- **Documents:** PDF, TXT, MD, DOC, DOCX
- **Max size:** 10MB

### Search Conversations

1. **Click search icon** or press Ctrl+K
2. **Type keywords** - Search across all messages
3. **View results** - Click to jump to conversation
4. **Highlighted text** - Search terms are highlighted

### Conversation Management

**Rename:**
- Click "..." menu on conversation → Rename
- Enter new title → Press Enter

**Delete:**
- Click "..." menu → Delete
- Conversation removed instantly

**New chat:**
- Click "+ New chat" button
- Or use Ctrl+N shortcut

### Profile Settings

1. **Click profile icon** in sidebar
2. **Update information:**
   - Username
   - Email
   - First/Last name
3. **Change password:**
   - Enter current password
   - Enter new password
   - Confirm new password

### Password Reset

**If logged out:**
1. Click "Forgot password?"
2. Enter email address
3. Check email for reset link
4. Click link and enter new password

---

## 🚀 Deployment

### Build for Production

```bash
# Frontend
npm run build
# Creates dist/ directory

# Backend
cd server
npm install --production
```

### Environment Variables (Production)

**Frontend (.env):**
```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-prod-resource.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=prod-api-key
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=prod-deployment
VITE_AZURE_OPENAI_API_VERSION=2024-08-01-preview
VITE_API_BASE_URL=https://your-api.example.com
```

**Backend (.env):**
```env
PORT=4000
FRONTEND_URL=https://your-app.example.com
DB_HOST=your-prod-db-host
DB_USER=your-prod-db-user
DB_PASSWORD=strong-prod-password
DB_NAME=chatbot
JWT_SECRET=super-strong-random-secret-64-chars
JWT_REFRESH_SECRET=different-strong-secret-64-chars
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Deploy Backend (Node.js Server)

**Options:**
- **Railway** - Easy Node.js hosting with MySQL
- **Render** - Free tier with managed PostgreSQL/MySQL
- **DigitalOcean App Platform** - Simple deployment
- **AWS EC2** - Full control
- **Heroku** - Easy deployment (paid)

**Railway Example:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Database Migration

**Export from development:**
```bash
mysqldump -u root -p chatbot > chatbot_backup.sql
```

**Import to production:**
```bash
mysql -u prod_user -p prod_database < chatbot_backup.sql
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"
**Solution:**
```bash
# Check MySQL is running
mysql -u root -p

# Verify credentials in server/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chatbot

# Test connection
mysql -u root -p chatbot
```

#### 2. "JWT token expired"
**Solution:**
- Token refreshes automatically
- If persistent, logout and login again
- Check system time is correct

#### 3. "Email not sending"
**Solutions:**
- Verify EMAIL_USER and EMAIL_PASSWORD in `.env`
- For Gmail: Use App Password, not regular password
- Check firewall/antivirus blocking port 587
- Test with different email service

#### 4. "Web search not working"
**Solutions:**
- Check internet connection
- Verify Azure OpenAI credentials for LangChain
- Check server logs for errors
- DuckDuckGo might be temporarily unavailable
- Consider adding Bing API key for fallback

#### 5. "CORS errors"
**Solution:**
```javascript
// In server/server.js
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}));
```

#### 6. "Build fails"
**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### 7. "MySQL 'Access denied'"
**Solution:**
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON chatbot.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

#### 8. "Port already in use"
**Solutions:**
```bash
# Find process using port
lsof -i :4000  # Mac/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env
PORT=5000
```

### Debug Mode

**Enable detailed logging:**

```javascript
// server/server.js
const DEBUG = true;

if (DEBUG) {
  console.log('[DEBUG] Request:', req.method, req.path);
  console.log('[DEBUG] Headers:', req.headers);
  console.log('[DEBUG] Body:', req.body);
}
```

### Performance Optimization

**Frontend:**
```typescript
// Lazy load components
const ProfilePage = lazy(() => import('./components/ProfilePage'));

// Memoize expensive computations
const processedMessages = useMemo(
  () => messages.map(processMessage),
  [messages]
);

// Debounce search
const debouncedSearch = debounce(searchFunction, 300);
```

**Backend:**
```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Add caching headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600');
  next();
});

// Database connection pooling
const pool = mysql.createPool({
  connectionLimit: 10,
  // ... other config
});
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation
4. **Test thoroughly**
5. **Commit with clear message**
   ```bash
   git commit -m "Add amazing feature: description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open Pull Request**

### Code Style

- **TypeScript:** Use strict mode
- **React:** Functional components with hooks
- **Naming:** camelCase for variables, PascalCase for components
- **Comments:** Explain "why", not "what"
- **Formatting:** Run `npm run format` (Prettier)

### Testing

```bash
# Run tests (when available)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📄 License

This project is open source and available under the **MIT License**.

```
MIT License

Copyright (c) 2025 Personalized Chatbot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📧 Support & Contact

- **GitHub Issues:** [Report bugs or request features](https://github.com/pritam-ray/Personalized-chatbot/issues)
- **Email:** support@example.com (Update with your email)
- **Documentation:** This file

---

## 🙏 Acknowledgments

- **Azure OpenAI** - Powerful AI capabilities
- **React Team** - Incredible UI framework
- **Vite** - Blazing fast build tool
- **TailwindCSS** - Beautiful utility-first CSS
- **LangChain** - AI framework integration
- **MySQL** - Reliable database system
- **Node.js Community** - Extensive package ecosystem

---

## 📊 Project Statistics

- **Languages:** TypeScript, JavaScript, SQL, CSS
- **Frontend Lines:** ~5,000+
- **Backend Lines:** ~2,000+
- **Database Tables:** 5
- **API Endpoints:** 20+
- **React Components:** 15+
- **Supported File Types:** 7+

---

## 🗓️ Changelog

### Version 1.0.0 (December 2025)
- ✅ Initial release
- ✅ Azure OpenAI integration
- ✅ JWT authentication
- ✅ Web search with DuckDuckGo
- ✅ Multimodal support
- ✅ MySQL database
- ✅ Responsive design
- ✅ Dark/light themes
- ✅ Password reset
- ✅ Profile management

---

**Built with ❤️ using React, TypeScript, Node.js, and Azure OpenAI**

*Last Updated: December 24, 2025*
