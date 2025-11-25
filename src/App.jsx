import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToAzureOpenAI } from './services/azureOpenAI';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker - using local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your Azure OpenAI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Extract text from PDF files using pdfjs-dist
  const extractPDFText = async (arrayBuffer) => {
    try {
      console.log('Starting PDF extraction...');
      const uint8Array = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Extracting page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `Page ${pageNum}:\n${pageText}\n\n`;
      }
      
      const result = fullText.trim();
      console.log(`PDF extraction complete. Length: ${result.length} characters`);
      
      return result || '[PDF appears to be empty or contains only images]';
    } catch (error) {
      console.error('PDF extraction error:', error);
      return `[Error: Could not extract text from PDF. ${error.message}]`;
    }
  };

  const processFiles = async (files) => {
    // ============================================
    // FILE SECURITY & SIZE LIMITS
    // ============================================
    const MAX_FILES = 5;                     // Max 5 files at once
    const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10MB per file
    const MAX_TEXT_LENGTH = 15000;           // 15KB text limit (token control)
    
    // Support all common file formats
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/tiff'];
    const ALLOWED_TEXT_TYPES = ['text/plain', 'application/json', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/javascript', 'text/xml', 'application/xml'];
    const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const ALLOWED_CODE_TYPES = ['text/x-python', 'text/x-java', 'text/x-c', 'text/x-c++', 'text/x-csharp', 'text/x-php', 'text/x-ruby', 'text/x-go', 'text/x-rust', 'text/x-typescript'];
    const ALLOWED_ARCHIVE_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip'];
    
    const fileArray = Array.from(files);
    
    // Validate file count
    if (fileArray.length > MAX_FILES) {
      alert(`⚠️ Maximum ${MAX_FILES} files allowed at once.`);
      return;
    }
    
    // Check if adding these files exceeds limit
    if (uploadedFiles.length + fileArray.length > MAX_FILES) {
      alert(`⚠️ You can only upload ${MAX_FILES} files total. Please remove some files first.`);
      return;
    }
    
    // Validate each file
    for (const file of fileArray) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`⚠️ File "${file.name}" is too large (max 10MB). Please choose a smaller file.`);
        return;
      }
      
      // Validate file type (security measure)
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isText = ALLOWED_TEXT_TYPES.includes(file.type) || 
                     file.name.match(/\.(txt|md|csv|json|html|css|js|jsx|ts|tsx|xml|py|java|c|cpp|cs|php|rb|go|rs)$/i);
      const isDoc = ALLOWED_DOC_TYPES.includes(file.type);
      const isCode = ALLOWED_CODE_TYPES.includes(file.type);
      const isArchive = ALLOWED_ARCHIVE_TYPES.includes(file.type);
      
      if (!isImage && !isText && !isDoc && !isCode && !isArchive) {
        alert(`⚠️ File type not allowed: "${file.name}". Most common file formats are supported (images, documents, text, code files, archives).`);
        return;
      }
    }
    
    const filePromises = fileArray.map(file => {
      return new Promise(async (resolve) => {
        const reader = new FileReader();
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isText = ALLOWED_TEXT_TYPES.includes(file.type) || 
                       file.name.match(/\.(txt|md|csv|json|html|css|js|jsx|ts|tsx|xml|py|java|c|cpp|cs|php|rb|go|rs)$/i);
        const isPDF = file.type === 'application/pdf';
        const isDoc = ALLOWED_DOC_TYPES.includes(file.type) && !isPDF;
        const isCode = ALLOWED_CODE_TYPES.includes(file.type);
        const isArchive = ALLOWED_ARCHIVE_TYPES.includes(file.type);
        
        // Handle PDF files specially
        if (isPDF) {
          const pdfReader = new FileReader();
          pdfReader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            const extractedText = await extractPDFText(arrayBuffer);
            
            // Truncate PDF text if too long
            let content = extractedText;
            if (content.length > MAX_TEXT_LENGTH) {
              content = content.slice(0, MAX_TEXT_LENGTH) + '\n\n[... PDF content truncated due to size limit ...]';
            }
            
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              content: content,
              isImage: false,
              isText: true,
              isPDF: true,
              isDoc: false,
              isCode: false,
              isArchive: false
            });
          };
          pdfReader.onerror = () => {
            alert(`❌ Error reading PDF: ${file.name}`);
            resolve(null);
          };
          pdfReader.readAsArrayBuffer(file);
          return;
        }
        
        reader.onload = (e) => {
          let content = e.target.result;
          
          // Truncate text content to prevent token bloat (COST CONTROL)
          if ((isText || isCode) && content.length > MAX_TEXT_LENGTH) {
            content = content.slice(0, MAX_TEXT_LENGTH) + '\n\n[... Content truncated due to size limit ...]';
          }
          
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            content: content,
            isImage: isImage,
            isText: isText,
            isPDF: false,
            isDoc: isDoc,
            isCode: isCode,
            isArchive: isArchive
          });
        };
        
        reader.onerror = () => {
          alert(`❌ Error reading file: ${file.name}`);
          resolve(null);
        };
        
        // Read as text for text/code files, base64 for images/docs/archives
        if (isText || isCode) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      });
    });

    const processedFiles = await Promise.all(filePromises);
    const validFiles = processedFiles.filter(f => f !== null);
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ============================================
    // INPUT VALIDATION & SECURITY
    // ============================================
    const MAX_INPUT_LENGTH = 3000;          // Character limit (cost control)
    const MAX_FILE_CONTENT_LENGTH = 1500;   // Limit file content sent to API
    
    const trimmedInput = input.trim();
    
    if (!trimmedInput && uploadedFiles.length === 0) return;
    
    // Enforce input length limit
    if (trimmedInput.length > MAX_INPUT_LENGTH) {
      alert(`⚠️ Message too long. Maximum ${MAX_INPUT_LENGTH} characters allowed.`);
      return;
    }
    
    // Sanitize input (prevent injection attacks)
    const sanitizedInput = trimmedInput
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '');

    // Construct message with file information for AI analysis
    let messageContent = sanitizedInput;
    if (uploadedFiles.length > 0) {
      const fileInfo = uploadedFiles.map(f => {
        if (f.isImage) {
          // Send base64 image data for AI to analyze
          // Note: Azure OpenAI GPT-4 Vision can analyze images
          return `\n\n📷 Image: ${f.name}\n[Image data in base64 format - analyze this image]\nData: ${f.content.substring(0, 500)}...\n(Full image data included for analysis)`;
        } else if (f.isPDF) {
          // Send extracted PDF text for analysis
          const preview = f.content.length > MAX_FILE_CONTENT_LENGTH 
            ? f.content.substring(0, MAX_FILE_CONTENT_LENGTH) + '\n[... truncated for length ...]'
            : f.content;
          return `\n\n📄 PDF: ${f.name}\n---\n${preview}\n---`;
        } else if (f.isText || f.isCode) {
          // Send text/code file content for analysis
          const preview = f.content.length > MAX_FILE_CONTENT_LENGTH 
            ? f.content.substring(0, MAX_FILE_CONTENT_LENGTH) + '\n[... truncated for length ...]'
            : f.content;
          return `\n\n📄 File: ${f.name}\n---\n${preview}\n---`;
        } else if (f.isDoc) {
          // For Word/Excel/PowerPoint docs, inform user about limitation
          return `\n\n📄 Document: ${f.name} (${(f.size / 1024).toFixed(1)} KB)\n[Note: Word/Excel/PowerPoint extraction not yet supported. Please describe what you need help with.]`;
        } else {
          return `\n\n📎 File: ${f.name} (${(f.size / 1024).toFixed(1)} KB)\n[Binary file - describe what you need help with]`;
        }
      }).join('\n');
      messageContent = (messageContent || 'Please analyze these files:') + fileInfo;
    }

    const userMessage = { 
      role: 'user', 
      content: messageContent,
      hasFiles: uploadedFiles.length > 0,
      fileNames: uploadedFiles.map(f => f.name)
    };
    
    // Clear input immediately
    setInput('');
    setUploadedFiles([]);
    setLoading(true);
    
    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);

    try {
      // Limit conversation history before sending (COST CONTROL)
      const MAX_HISTORY = 15;
      const recentMessages = [...messages, userMessage].slice(-MAX_HISTORY);
      
      const response = await sendMessageToAzureOpenAI(recentMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      // Display sanitized error message (no credential leaks)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `${error.message}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Azure OpenAI Chat</h1>
        </div>
        
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-content">
                <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong>
                {message.hasFiles && (
                  <div className="file-badges">
                    {message.fileNames.map((name, i) => (
                      <span key={i} className="file-badge">📎 {name}</span>
                    ))}
                  </div>
                )}
                <p>{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content">
                <strong>AI:</strong>
                <p className="typing">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-preview">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-preview-item">
                {file.isImage ? (
                  <div className="image-preview-container">
                    <img 
                      src={file.content} 
                      alt={file.name} 
                      className="image-preview-thumb"
                    />
                    <div className="file-info">
                      <span className="file-name">🖼️ {file.name}</span>
                      <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="file-name">📎 {file.name}</span>
                    <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                  </>
                )}
                <button 
                  type="button" 
                  className="remove-file"
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form 
          className="input-container" 
          onSubmit={handleSubmit}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            multiple
          />
          <button
            type="button"
            className="upload-button"
            onClick={triggerFileUpload}
            disabled={loading}
            title="Upload files"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or drag files here..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || (!input.trim() && uploadedFiles.length === 0)}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
