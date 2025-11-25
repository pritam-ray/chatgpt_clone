# 🧪 Security Testing Guide

This document helps you verify that all security and cost protection features are working correctly.

## ✅ Test Checklist

### 1. Rate Limiting Tests

#### Test 1.1: Rapid Fire Protection (2-second cooldown)
**Steps:**
1. Send a message
2. Immediately try to send another message
3. **Expected**: Error message "⏱️ Please wait a moment before sending another message."

#### Test 1.2: Per-Minute Rate Limit (15 requests/minute)
**Steps:**
1. Send 15 messages quickly (wait 2 seconds between each)
2. Try to send a 16th message
3. **Expected**: Error message "⚠️ Rate limit exceeded. Please wait a minute before trying again."

#### Test 1.3: Hourly Rate Limit (100 requests/hour)
**Steps:**
1. This requires sending 100 messages in an hour
2. **Expected**: After 100 requests, see "⚠️ Hourly limit reached. Please try again later."

### 2. Input Validation Tests

#### Test 2.1: Character Limit (3,000 characters)
**Steps:**
1. Paste a message longer than 3,000 characters
2. Try to send it
3. **Expected**: Alert "⚠️ Message too long. Maximum 3000 characters allowed."

#### Test 2.2: XSS Attack Prevention
**Steps:**
1. Try sending: `<script>alert('XSS')</script>`
2. **Expected**: Script tags are removed, message is sanitized

#### Test 2.3: HTML Injection
**Steps:**
1. Try sending: `<img src=x onerror=alert('hack')>`
2. **Expected**: HTML tags are stripped

### 3. File Upload Security Tests

#### Test 3.1: File Count Limit (3 files max)
**Steps:**
1. Try to upload 4 files at once
2. **Expected**: Alert "⚠️ Maximum 3 files allowed at once."

#### Test 3.2: File Size Limit (2MB per file)
**Steps:**
1. Try to upload a file larger than 2MB
2. **Expected**: Alert "⚠️ File '[name]' is too large (max 2MB). Please choose a smaller file."

#### Test 3.3: File Type Validation
**Steps:**
1. Try to upload a `.exe` or `.zip` file
2. **Expected**: Alert "⚠️ File type not allowed..."
3. **Allowed types**: JPG, PNG, GIF, WebP, TXT, MD, CSV, JSON

#### Test 3.4: Text File Truncation (8KB limit)
**Steps:**
1. Upload a text file larger than 8KB
2. **Expected**: File content is truncated with message "[... Content truncated due to size limit ...]"

### 4. Token Usage Tests

#### Test 4.1: Response Token Limit (500 tokens max)
**Steps:**
1. Ask: "Write a very long essay about artificial intelligence"
2. **Expected**: Response stops at approximately 500 tokens (~375 words)

#### Test 4.2: Conversation History Limit (10 messages)
**Steps:**
1. Send 20 messages in a conversation
2. **Expected**: Only the last 10 messages are kept in history
3. **Verification**: Check browser console or network tab

#### Test 4.3: API Request History (15 messages sent)
**Steps:**
1. Have a long conversation (20+ messages)
2. Check network request payload
3. **Expected**: Only last 15 messages sent to Azure OpenAI API

### 5. Error Sanitization Tests

#### Test 5.1: Credential Redaction
**Steps:**
1. Temporarily break your `.env` file (invalid API key)
2. Try sending a message
3. **Expected**: Error message does NOT contain your actual API key
4. **Expected**: See `[REDACTED]` instead of sensitive data

#### Test 5.2: Endpoint Hiding
**Steps:**
1. Cause a network error (disable internet briefly)
2. **Expected**: Error shows "🌐 Network error" without revealing endpoint URL

### 6. Request Timeout Test

#### Test 6.1: Hanging Request Protection (30-second timeout)
**Steps:**
1. This is automatic - if Azure takes >30 seconds to respond
2. **Expected**: Request is automatically cancelled
3. **Expected**: Error message displayed

## 🔍 How to Monitor

### Browser Console
Open DevTools (F12) and check:
- **Console tab**: For any JavaScript errors
- **Network tab**: To see API requests and payloads
- **Application tab**: To verify no credentials are stored

### What to Look For:
✅ No API keys visible in network requests (should be in headers only)  
✅ Request payloads are truncated (not sending entire conversation history)  
✅ No sensitive data in console logs  
✅ Rate limit headers in response  

### Rate Limit Tracking
The app tracks rate limits in memory:
```javascript
// In browser console, you can't directly access these
// But you can test by sending messages rapidly
```

## 💰 Cost Estimation Test

### Calculate Your Costs:
1. Send 10 test messages
2. Check Azure Portal > Cost Management
3. **Expected cost**: ~$0.01 - $0.05 for 10 messages

### Token Usage Formula:
```
Average Request = Input (100-200 tokens) + Output (200-500 tokens)
Total = 300-700 tokens per request
Cost = tokens × $0.000002 (approximate, varies by model)
```

## 🐛 Common Issues

### Issue: Rate limit too aggressive
**Solution**: Edit `src/services/azureOpenAI.js`:
```javascript
const REQUEST_COOLDOWN_MS = 1000; // Reduce to 1 second
const MAX_REQUESTS_PER_MINUTE = 30; // Increase to 30
```

### Issue: File upload fails
**Solution**: Check file type and size:
- Max 2MB per file
- Only allowed types: images (JPG, PNG, GIF, WebP) and text (TXT, MD, CSV, JSON)

### Issue: Response cut off
**Solution**: Increase token limit in `src/services/azureOpenAI.js`:
```javascript
const MAX_TOKENS_PER_REQUEST = 800; // Increase if needed
```

## ✅ Success Criteria

Your chatbot is properly secured if:

- [x] Cannot send messages faster than 2 seconds apart
- [x] Cannot exceed 15 messages per minute
- [x] Cannot send input longer than 3,000 characters
- [x] Cannot upload files larger than 2MB
- [x] Cannot upload more than 3 files at once
- [x] Cannot upload disallowed file types
- [x] API responses limited to 500 tokens
- [x] Conversation history automatically trimmed
- [x] Error messages don't reveal credentials
- [x] XSS/HTML injection attempts are blocked
- [x] Security badge visible in header

## 📊 Monitoring Azure Costs

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your OpenAI resource
3. Click "Cost Management" in left sidebar
4. Set up budget alerts (recommended: $10/month)

### Recommended Budget Alerts:
- **Warning at 50%**: $5 spent
- **Alert at 80%**: $8 spent
- **Critical at 100%**: $10 spent

---

**Last Updated**: November 2025  
**Testing Version**: 2.0
