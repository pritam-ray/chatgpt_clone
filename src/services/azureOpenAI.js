import axios from 'axios';

const AZURE_OPENAI_ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const DEPLOYMENT_NAME = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME;
const API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

// ============================================
// SECURITY & COST PROTECTION CONFIGURATION
// ============================================

// Token & Cost Control
const MAX_TOKENS_PER_REQUEST = 500;        // Limit tokens per response (COST CONTROL)
const MAX_INPUT_CHARS = 4000;              // Max characters in user input
const MAX_MESSAGES_HISTORY = 10;           // Limit conversation history (prevents token bloat)

// Rate Limiting (DDoS Protection)
const REQUEST_COOLDOWN_MS = 2000;          // 2 seconds between requests
const MAX_REQUESTS_PER_MINUTE = 15;        // Max 15 requests per minute
const MAX_REQUESTS_PER_HOUR = 100;         // Max 100 requests per hour

// Rate limiting state
let lastRequestTime = 0;
const requestTimestamps = [];
const hourlyRequestTimestamps = [];

/**
 * Sanitize input to prevent injection attacks and data leaks
 */
const sanitizeInput = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove scripts
    .replace(/<[^>]*>/g, '')                       // Remove HTML
    .replace(/javascript:/gi, '')                  // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')                    // Remove event handlers
    .trim()
    .slice(0, MAX_INPUT_CHARS);                    // Enforce length limit
};

/**
 * Limit and sanitize message history to control token usage
 */
const limitMessageHistory = (messages) => {
  if (!Array.isArray(messages)) return [];
  
  // Keep only recent messages
  const recentMessages = messages.slice(-MAX_MESSAGES_HISTORY);
  
  // Sanitize each message
  return recentMessages
    .map(msg => ({
      role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
      content: sanitizeInput(String(msg.content || ''))
    }))
    .filter(msg => msg.content.length > 0);
};

/**
 * Check rate limits to prevent DDoS and abuse
 */
const checkRateLimit = () => {
  const now = Date.now();
  
  // 1. Check cooldown period (prevents rapid-fire requests)
  if (now - lastRequestTime < REQUEST_COOLDOWN_MS) {
    throw new Error('⏱️ Please wait a moment before sending another message.');
  }
  
  // 2. Clean up old timestamps (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  
  // 3. Check per-minute rate limit
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    throw new Error('⚠️ Rate limit exceeded. Please wait a minute before trying again.');
  }
  
  // 4. Clean up hourly timestamps (older than 1 hour)
  const oneHourAgo = now - 3600000;
  while (hourlyRequestTimestamps.length > 0 && hourlyRequestTimestamps[0] < oneHourAgo) {
    hourlyRequestTimestamps.shift();
  }
  
  // 5. Check per-hour rate limit
  if (hourlyRequestTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    throw new Error('⚠️ Hourly limit reached. Please try again later.');
  }
  
  // Update tracking
  requestTimestamps.push(now);
  hourlyRequestTimestamps.push(now);
  lastRequestTime = now;
};

export async function sendMessageToAzureOpenAI(messages) {
  // Apply rate limiting (DDoS protection)
  checkRateLimit();
  
  // Validate credentials (prevent undefined errors and data leaks)
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !DEPLOYMENT_NAME) {
    throw new Error('⚙️ Configuration error. Please contact administrator.');
  }
  
  // Sanitize and limit message history (cost control + security)
  const sanitizedMessages = limitMessageHistory(messages);
  
  if (sanitizedMessages.length === 0) {
    throw new Error('❌ Invalid message content.');
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`;

  try {
    const response = await axios.post(
      url,
      {
        messages: sanitizedMessages,
        max_tokens: MAX_TOKENS_PER_REQUEST,  // STRICT TOKEN LIMIT
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0.3,              // Reduce repetition (saves tokens)
        presence_penalty: 0.3                // Encourage diverse responses
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY
        },
        timeout: 30000  // 30 second timeout (prevents hanging requests)
      }
    );

    // Validate response
    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI service.');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    // Sanitize error messages to prevent credential/data leaks
    if (error.message && (error.message.includes('⏱️') || error.message.includes('⚠️') || error.message.includes('⚙️') || error.message.includes('❌'))) {
      throw error; // Pass through our custom error messages
    }
    
    if (error.response) {
      // Remove sensitive information from error messages
      const errorMsg = error.response.data?.error?.message || 'Service error';
      const sanitizedError = errorMsg
        .replace(/api-key[^\s]*/gi, '[REDACTED]')
        .replace(/Bearer [^\s]*/gi, '[REDACTED]')
        .replace(/https?:\/\/[^\s]*/g, '[REDACTED]')
        .replace(/deployment[^\s]*/gi, '[REDACTED]');
      
      throw new Error(`⚠️ AI service error: ${sanitizedError.substring(0, 200)}`);
    } else if (error.request) {
      throw new Error('🌐 Network error. Please check your connection.');
    } else {
      throw new Error('❌ Request failed. Please try again.');
    }
  }
}
