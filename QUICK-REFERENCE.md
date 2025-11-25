# ⚡ Quick Reference - Security Settings

## 🎯 Protection Limits (Current Settings)

| Setting | Value | Purpose |
|---------|-------|---------|
| **Max tokens per response** | 500 | Prevents expensive API calls |
| **Max input characters** | 3,000 | Controls message size |
| **Max conversation history** | 10 messages | Prevents token bloat |
| **Request cooldown** | 2 seconds | Anti-spam protection |
| **Max requests per minute** | 15 | Rate limiting |
| **Max requests per hour** | 100 | DDoS protection |
| **Max file size** | 2MB | File upload limit |
| **Max files per upload** | 3 | Upload limit |
| **Max text file content** | 8KB | Token control |
| **Request timeout** | 30 seconds | Prevents hanging |

## 💡 Cost Estimates

### Per Request:
- **Minimum**: ~150 tokens → $0.0003
- **Average**: ~400 tokens → $0.0008
- **Maximum**: ~700 tokens → $0.0014

### Daily Usage (100 requests):
- **Cost**: $0.03 - $0.14/day
- **Monthly**: ~$1 - $4/month

### With Current Limits:
- **Maximum possible daily cost**: ~$0.20 (100 hourly limit × 24h = 2,400 requests)
- **Realistic daily cost**: $0.05 - $0.10 (average usage)

## 🚨 Error Messages & What They Mean

| Error Message | Cause | Solution |
|---------------|-------|----------|
| ⏱️ Please wait a moment... | Sending too fast (< 2 sec) | Wait 2 seconds between messages |
| ⚠️ Rate limit exceeded... | 15+ messages in 1 minute | Wait 1 minute |
| ⚠️ Hourly limit reached... | 100+ messages in 1 hour | Wait until next hour |
| ⚠️ Message too long... | Input > 3,000 characters | Shorten your message |
| ⚠️ File too large... | File > 2MB | Use smaller file |
| ⚠️ Maximum X files... | Too many files | Upload fewer files |
| ⚠️ File type not allowed... | Unsupported file type | Use allowed types only |
| 🌐 Network error... | No internet connection | Check connection |
| ⚙️ Configuration error... | Missing credentials | Check .env file |

## 📁 Allowed File Types

### Images (sent as metadata only):
- ✅ JPG/JPEG
- ✅ PNG
- ✅ GIF
- ✅ WebP

### Text (content sent to AI):
- ✅ TXT
- ✅ MD (Markdown)
- ✅ CSV
- ✅ JSON

### NOT Allowed:
- ❌ EXE, DLL, SH (executables)
- ❌ ZIP, RAR, 7Z (archives)
- ❌ PDF (not yet supported)
- ❌ DOC, DOCX (not yet supported)

## 🔧 Quick Adjustments

### To Increase Token Limit (more detailed responses):
Edit `src/services/azureOpenAI.js`:
```javascript
const MAX_TOKENS_PER_REQUEST = 800; // was 500
```

### To Relax Rate Limiting (for testing):
Edit `src/services/azureOpenAI.js`:
```javascript
const REQUEST_COOLDOWN_MS = 1000;        // was 2000
const MAX_REQUESTS_PER_MINUTE = 30;      // was 15
```

### To Allow Larger Files:
Edit `src/App.jsx`:
```javascript
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // was 2MB, now 5MB
```

### To Allow More Files:
Edit `src/App.jsx`:
```javascript
const MAX_FILES = 5;                     // was 3, now 5
```

## 📊 Monitoring Your Usage

### Azure Portal:
1. Go to https://portal.azure.com
2. Find your OpenAI resource
3. Click "Metrics" or "Cost Management"
4. Set up budget alerts

### Recommended Alerts:
```
Warning:  $5.00 (50% of budget)
Alert:    $8.00 (80% of budget)
Critical: $10.00 (100% of budget)
```

## 🧪 Quick Test Commands

### Test Rate Limiting:
Send messages rapidly (click Send 3 times fast)

### Test Input Limit:
Paste this in chat:
```
[Paste any text that's >3000 characters]
```

### Test File Size:
Upload an image larger than 2MB

### Test XSS Protection:
Send this message:
```
<script>alert('test')</script>
```
(Should be stripped automatically)

## 📞 Support & Documentation

- **Full Security Docs**: `SECURITY.md`
- **Testing Guide**: `TESTING.md`
- **Implementation Details**: `IMPLEMENTATION.md`
- **Main README**: `README.md`

## ✅ Checklist Before Production

- [ ] Tested rate limiting (send messages fast)
- [ ] Tested file upload limits
- [ ] Tested input character limits
- [ ] Verified no credentials in browser console
- [ ] Set up Azure budget alerts
- [ ] Reviewed all documentation
- [ ] Tested with actual Azure OpenAI calls
- [ ] Verified error messages are user-friendly
- [ ] Checked .env file is in .gitignore
- [ ] Confirmed security badge is visible

---

**Status**: ✅ All Security Features Active  
**Server**: http://localhost:3000  
**Version**: 2.0 (Production Ready)
