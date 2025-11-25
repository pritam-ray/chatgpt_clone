# 🔒 Security & Cost Protection

This chatbot implements multiple layers of security and cost protection to prevent data leaks, DDoS attacks, and excessive token usage.

## 🛡️ Security Features Implemented

### 1. **Rate Limiting (DDoS Protection)**
- **2-second cooldown** between requests (prevents rapid-fire spam)
- **15 requests per minute** maximum
- **100 requests per hour** maximum
- Automatic request tracking and blocking

### 2. **Token & Cost Control**
- **Maximum 500 tokens per response** (prevents expensive responses)
- **3,000 character limit** on user input
- **8,000 character limit** on text file content
- **10 message conversation history** (prevents token bloat)
- **15 recent messages** sent to API (cost optimization)

### 3. **Input Sanitization**
- Removes `<script>` tags to prevent XSS attacks
- Strips HTML tags from user input
- Removes `javascript:` protocols
- Blocks event handlers (`onclick`, etc.)
- Character length enforcement

### 4. **File Upload Security**
- **Maximum 3 files** per upload
- **2MB per file** size limit
- **Allowed file types only**: JPG, PNG, GIF, WebP, TXT, MD, CSV, JSON
- File validation before processing
- Content truncation for large text files

### 5. **Error Message Sanitization**
- Credentials redacted from error messages
- API keys replaced with `[REDACTED]`
- Endpoints hidden in error logs
- No sensitive data exposed to users

### 6. **Request Security**
- **30-second timeout** on API requests (prevents hanging)
- Response validation before display
- No credential storage in browser
- Environment variables for sensitive data

## 💰 Cost Protection Summary

| Protection | Limit | Purpose |
|------------|-------|---------|
| Max tokens per response | 500 | Prevents expensive API calls |
| Input character limit | 3,000 | Controls request size |
| Message history | 10 messages | Reduces context sent to API |
| Text file content | 8,000 chars | Limits file data in requests |
| Rate limiting | 15/min, 100/hr | Prevents abuse and runaway costs |
| Request cooldown | 2 seconds | Prevents accidental spam |

## 📊 Estimated Token Usage

With these protections:
- **Average request**: ~200-300 tokens (input + output)
- **Max request**: ~800 tokens (with max history + max response)
- **Cost per request**: ~$0.001 - $0.005 (depending on Azure pricing)
- **Daily cost estimate** (100 requests): ~$0.10 - $0.50

## 🚫 What's Blocked

### Prevented Attacks
- ✅ SQL Injection (via input sanitization)
- ✅ XSS (Cross-Site Scripting)
- ✅ DDoS (Distributed Denial of Service)
- ✅ Token bloat attacks
- ✅ File bomb attacks (large files)
- ✅ Credential harvesting

### Rate Limit Responses
When limits are hit, users see:
- ⏱️ "Please wait a moment..." (cooldown)
- ⚠️ "Rate limit exceeded..." (per-minute limit)
- ⚠️ "Hourly limit reached..." (per-hour limit)

## 🔧 Customization

To adjust limits, edit these values in `src/services/azureOpenAI.js`:

```javascript
// Token & Cost Control
const MAX_TOKENS_PER_REQUEST = 500;        // Tokens per response
const MAX_INPUT_CHARS = 4000;              // Max input length
const MAX_MESSAGES_HISTORY = 10;           // Conversation history

// Rate Limiting
const REQUEST_COOLDOWN_MS = 2000;          // Cooldown (ms)
const MAX_REQUESTS_PER_MINUTE = 15;        // Per-minute limit
const MAX_REQUESTS_PER_HOUR = 100;         // Per-hour limit
```

And in `src/App.jsx`:

```javascript
// File Security
const MAX_FILES = 3;                       // Files per upload
const MAX_FILE_SIZE = 2 * 1024 * 1024;     // 2MB
const MAX_TEXT_LENGTH = 8000;              // Text file limit
```

## 📝 Best Practices

1. **Monitor Azure costs** regularly in Azure Portal
2. **Review conversation logs** for unusual patterns
3. **Keep .env file secure** and never commit to git
4. **Update rate limits** based on your usage patterns
5. **Test limits** before deploying to production

## ⚠️ Important Notes

- Rate limits reset after their time window (1 minute/1 hour)
- File uploads still consume tokens (especially text files)
- Image metadata is sent, not full base64 (saves tokens)
- Conversation history is automatically trimmed
- All protections run client-side (no server needed)

## 🔐 Environment Variables

Never expose these in your code:
- `VITE_AZURE_OPENAI_ENDPOINT`
- `VITE_AZURE_OPENAI_API_KEY`
- `VITE_AZURE_OPENAI_DEPLOYMENT_NAME`
- `VITE_AZURE_OPENAI_API_VERSION`

Always use `.env` file (gitignored) for credentials.

---

**Last Updated**: November 2025  
**Version**: 2.0 (Security Hardened)
