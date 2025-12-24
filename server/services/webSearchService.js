const { AzureChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Web Search Tool using DuckDuckGo (no API key needed)
 * Searches the web and returns relevant results
 */
class WebSearchService {
  constructor(azureConfig) {
    // Validate configuration
    if (!azureConfig.apiKey || !azureConfig.endpoint || !azureConfig.deploymentName) {
      throw new Error('Missing Azure OpenAI configuration: apiKey, endpoint, and deploymentName are required');
    }
    
    // Extract the instance name from the endpoint URL
    // Endpoint format: https://{instance}.openai.azure.com
    const endpoint = azureConfig.endpoint;
    let instanceName = '';
    
    try {
      const url = new URL(endpoint);
      instanceName = url.hostname.split('.')[0]; // Extract {instance} from {instance}.openai.azure.com
    } catch (error) {
      console.error('[WebSearchService] Invalid endpoint URL:', endpoint);
      throw new Error('Invalid Azure OpenAI endpoint URL');
    }
    
    console.log('[WebSearchService] Initializing with:', {
      endpoint: azureConfig.endpoint,
      deploymentName: azureConfig.deploymentName,
      apiVersion: azureConfig.apiVersion,
    });
    
    this.model = new AzureChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIApiVersion: azureConfig.apiVersion,
      azureOpenAIApiInstanceName: instanceName,
      azureOpenAIApiDeploymentName: azureConfig.deploymentName,
      temperature: 0.7,
      streaming: true,
    });
  }

  /**
   * Perform Wikipedia search and get article content
   */
  async performWikipediaSearch(query) {
    try {
      console.log(`[Wikipedia] Searching for: ${query}`);
      
      // Step 1: Search Wikipedia for relevant articles
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json`;
      
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'ChatGPT-Clone/1.0 (Educational Purpose)'
        },
        timeout: 15000,
      });

      const searchResults = searchResponse.data;
      const titles = searchResults[1] || [];
      const descriptions = searchResults[2] || [];
      const urls = searchResults[3] || [];

      if (titles.length === 0) {
        return 'No relevant Wikipedia articles found for this query. Please try rephrasing your question or provide more specific details.';
      }

      console.log(`[Wikipedia] Found ${titles.length} articles`);

      // Step 2: Fetch detailed content from the top articles
      let combinedContent = `📚 WIKIPEDIA KNOWLEDGE BASE\n${'='.repeat(60)}\n\n`;
      combinedContent += `Search Query: "${query}"\n`;
      combinedContent += `Found ${titles.length} relevant articles\n\n`;
      
      for (let i = 0; i < Math.min(3, titles.length); i++) {
        const title = titles[i];
        
        try {
          // Get full introduction extract (not truncated)
          const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(title)}&format=json`;
          
          const contentResponse = await axios.get(contentUrl, {
            headers: {
              'User-Agent': 'ChatGPT-Clone/1.0 (Educational Purpose)'
            },
            timeout: 15000,
          });

          const pages = contentResponse.data.query.pages;
          const pageId = Object.keys(pages)[0];
          const extract = pages[pageId].extract || descriptions[i] || 'No content available';

          // Better formatting for each article
          combinedContent += `\n${'─'.repeat(60)}\n`;
          combinedContent += `📖 ARTICLE ${i + 1}: ${title}\n`;
          combinedContent += `${'─'.repeat(60)}\n\n`;
          
          // Include more content (up to 2000 characters for better context)
          const contentToShow = extract.length > 2000 ? extract.substring(0, 2000) + '...' : extract;
          combinedContent += `${contentToShow}\n\n`;
          combinedContent += `🔗 Source: ${urls[i]}\n`;
        } catch (error) {
          console.error(`[Wikipedia] Error fetching content for ${title}:`, error.message);
          combinedContent += `\n${'─'.repeat(60)}\n`;
          combinedContent += `📖 ARTICLE ${i + 1}: ${title}\n`;
          combinedContent += `${'─'.repeat(60)}\n\n`;
          combinedContent += `Brief: ${descriptions[i] || 'Content unavailable'}\n\n`;
          combinedContent += `🔗 Source: ${urls[i]}\n`;
        }
      }

      combinedContent += `\n${'='.repeat(60)}\n`;
      combinedContent += `💡 Use the information above to provide a comprehensive, accurate answer.\n`;

      console.log(`[Wikipedia] Compiled content: ${combinedContent.length} characters from ${Math.min(3, titles.length)} articles`);
      return combinedContent;
    } catch (error) {
      console.error('[Wikipedia] Search error:', error.message);
      if (error.code === 'ECONNABORTED') {
        return 'Wikipedia search timed out. Please try again with a more specific query.';
      }
      return `Unable to fetch Wikipedia information at this time. Error: ${error.message}`;
    }
  }

  /**
   * Determine if web search is needed for the query
   */
  async shouldUseWebSearch(userMessage) {
    // Keywords that suggest current information is needed
    const currentInfoKeywords = [
      'latest', 'recent', 'current', 'today', 'now', 'news',
      'weather', 'price', 'stock', 'update', 'happening'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return currentInfoKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Process a query with web search capability
   */
  async processQuery(userMessage, conversationHistory = [], forceSearch = true) {
    try {
      console.log('[WebSearchService] Process query. Force search:', forceSearch);
      // Always search when web search is explicitly enabled
      const needsSearch = forceSearch;
      let searchResults = '';
      
      if (needsSearch) {
        searchResults = await this.performWikipediaSearch(userMessage);
        console.log('[WebSearchService] Wikipedia results obtained:', searchResults.length, 'chars');
      }

      // Build conversation messages
      const messages = [
        new SystemMessage(
          `You are a helpful AI assistant${needsSearch ? ' with access to current web search results' : ''}. ` +
          'Provide clear, accurate, and helpful responses. ' +
          (needsSearch ? 'When using web search results, cite your sources by mentioning the information came from web search.' : '')
        ),
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      });

      // Add current query with search results if available
      if (searchResults) {
        messages.push(new HumanMessage(
          `Question: ${userMessage}\n\n${searchResults}\n\nBased on the Wikipedia information provided above, please give me a comprehensive and well-organized answer to my question. Structure your response with clear paragraphs and include relevant details from the articles.`
        ));
      } else {
        messages.push(new HumanMessage(userMessage));
      }

      const response = await this.model.invoke(messages);

      return {
        success: true,
        response: response.content,
        usedWebSearch: needsSearch && searchResults.length > 0,
      };
    } catch (error) {
      console.error('[WebSearch] Error:', error);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.',
      };
    }
  }

  /**
   * Process a query with streaming support
   */
  async processQueryStream(userMessage, conversationHistory = [], onToken) {
    try {
      // ALWAYS search since this endpoint is only called when web search button is enabled
      const needsSearch = true;
      let searchResults = '';
      
      searchResults = await this.performWikipediaSearch(userMessage);
      console.log('[WebSearchService] Wikipedia search completed. Results length:', searchResults.length);

      // Build conversation messages
      const messages = [
        new SystemMessage(
          `You are a knowledgeable AI assistant with access to Wikipedia information. ` +
          'Your responses should be:\n' +
          '1. Accurate and based on the Wikipedia sources provided\n' +
          '2. Well-structured with clear sections or bullet points when appropriate\n' +
          '3. Comprehensive yet concise\n' +
          '4. Include relevant facts, dates, and context from the Wikipedia articles\n' +
          '5. Cite Wikipedia as your source when presenting information\n\n' +
          'Format your response in a user-friendly way with proper paragraphs and organization.'
        ),
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        }
      });

      // Add current query with search results if available
      if (searchResults) {
        messages.push(new HumanMessage(
          `Question: ${userMessage}\n\n${searchResults}\n\nBased on the Wikipedia information provided above, please give me a comprehensive and well-organized answer to my question. Structure your response with clear paragraphs and include relevant details from the articles.`
        ));
      } else {
        messages.push(new HumanMessage(userMessage));
      }

      const stream = await this.model.stream(messages);

      console.log('[WebSearchService] Stream created, processing chunks...');
      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.content;
        if (content) {
          fullResponse += content;
          if (onToken) {
            onToken(content);
          }
        }
      }

      console.log('[WebSearchService] Stream complete. Response length:', fullResponse.length);
      return {
        success: true,
        response: fullResponse,
        usedWebSearch: needsSearch && searchResults.length > 0,
      };
    } catch (error) {
      console.error('[WebSearchService] Streaming error:', error);
      console.error('[WebSearchService] Error details:', error.message);
      return {
        success: false,
        error: error.message,
        response: 'I apologize, but I encountered an error while processing your request.',
      };
    }
  }
}

module.exports = WebSearchService;
