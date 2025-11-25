# Azure OpenAI Chatbot 🤖

A **secure, cost-optimized** React chatbot with Azure OpenAI integration, file uploads, and comprehensive protection.

## 🔒 Security & Cost Protection

✅ **DDoS Protection** - Rate limiting (15/min, 100/hour)  
✅ **Token Limits** - Max 500 tokens per response (cost control)  
✅ **Input Sanitization** - XSS and injection prevention  
✅ **No Data Leaks** - Credential redaction in error messages  
✅ **File Security** - Size validation (2MB) & type whitelist  

📖 **[Full Security Documentation →](SECURITY.md)**

## 🔑 Required Credentials

To run this chatbot, you need the following Azure OpenAI credentials:

### 1. **Azure OpenAI Resource Endpoint**
   - **What it is:** The URL of your Azure OpenAI resource
   - **Format:** `https://YOUR-RESOURCE-NAME.openai.azure.com`
   - **Where to find it:**
     1. Go to [Azure Portal](https://portal.azure.com)
     2. Navigate to your Azure OpenAI resource
     3. Click on "Keys and Endpoint" in the left menu
     4. Copy the "Endpoint" value

### 2. **Azure OpenAI API Key**
   - **What it is:** Authentication key to access your Azure OpenAI resource
   - **Format:** A long string of characters (e.g., `abc123def456...`)
   - **Where to find it:**
     1. In the same "Keys and Endpoint" section
     2. Copy either "KEY 1" or "KEY 2"
     3. ⚠️ **Keep this secret!** Never commit it to version control

### 3. **Deployment Name**
   - **What it is:** The name you assigned to your model deployment
   - **Format:** Any name you chose (e.g., `gpt-4`, `my-gpt-35-turbo`)
   - **Where to find it:**
     1. In Azure Portal, go to your Azure OpenAI resource
     2. Click on "Model deployments" or go to Azure OpenAI Studio
     3. You'll see a list of your deployments with their names
     4. Use the exact deployment name (case-sensitive)

### 4. **API Version**
   - **What it is:** The version of the Azure OpenAI API to use
   - **Recommended:** `2024-08-01-preview` (or latest from [Azure docs](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference))
   - **Format:** `YYYY-MM-DD-preview` or `YYYY-MM-DD`

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Configure Environment Variables
1. Copy the `.env.example` file to create your `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Open `.env` and replace the placeholder values with your actual credentials:
   ```env
   VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   VITE_AZURE_OPENAI_API_KEY=your-actual-api-key-here
   VITE_AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
   VITE_AZURE_OPENAI_API_VERSION=2024-08-01-preview
   ```

### Step 3: Run the Application
```powershell
npm run dev
```

The chatbot will open at `http://localhost:3000`

---

## 📁 Project Structure
```
├── src/
│   ├── App.jsx              # Main chatbot component
│   ├── App.css              # Chatbot styling
│   ├── main.jsx             # React entry point
│   ├── index.css            # Global styles
│   └── services/
│       └── azureOpenAI.js   # Azure OpenAI API integration
├── .env                     # Your credentials (DO NOT COMMIT)
├── .env.example             # Template for credentials
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
└── index.html               # HTML template
```

---

## 🔒 Security Best Practices

1. **Never commit `.env`** - It's already in `.gitignore`
2. **Use environment variables** - Never hardcode credentials in your code
3. **Rotate keys regularly** - In Azure Portal, regenerate keys periodically
4. **Use Key Vault** - For production, consider Azure Key Vault
5. **Restrict API access** - Configure network security in Azure Portal

---

## 🛠️ Troubleshooting

### "Azure OpenAI credentials are not configured"
- Make sure you created `.env` file (not just `.env.example`)
- Verify all environment variables start with `VITE_`
- Restart the dev server after changing `.env`

### "401 Unauthorized" or "403 Forbidden"
- Check your API key is correct
- Verify your key hasn't expired
- Ensure your Azure subscription is active

### "404 Not Found" or "Deployment not found"
- Verify your deployment name is exactly correct (case-sensitive)
- Check the deployment exists in Azure OpenAI Studio
- Confirm the API version is correct

### "Network error"
- Check your internet connection
- Verify the endpoint URL is correct
- Ensure no firewall is blocking the connection

---

## 📚 Additional Resources

- [Azure OpenAI Service Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure OpenAI REST API Reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference)
- [Create an Azure OpenAI Resource](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource)

---

## 🎨 Features

- ✅ Simple and clean UI
- ✅ Real-time chat with Azure OpenAI
- ✅ **File upload support** (drag & drop or click to upload)
- ✅ Multiple file attachments
- ✅ **Image upload with preview** (JPG, PNG, GIF, WebP, etc.)
- ✅ Supports all file types (text, code, documents, images, PDFs, etc.)
- ✅ Visual image thumbnails in upload preview
- ✅ Message history
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design

---

## 📝 License

MIT
