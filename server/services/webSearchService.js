const { ChatOpenAI } = require('@langchain/openai');
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
      instanceName,
      deploymentName: azureConfig.deploymentName,
      apiVersion: azureConfig.apiVersion,
    });
    
    this.model = new ChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIApiVersion: azureConfig.apiVersion,
      azureOpenAIApiInstanceName: instanceName,
      azureOpenAIApiDeploymentName: azureConfig.deploymentName,
      temperature: 0.7,
      streaming: true,
    });
  }

  /**
   * Perform web search using DuckDuckGo HTML search
   */
  async performWebSearch(query) {
    try {
      console.log(`[WebSearch] Searching for: ${query}`);
      
      // Use DuckDuckGo HTML search (no API key required)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Parse DuckDuckGo results
      $('.result').each((i, element) => {
        if (i >= 5) return false; // Limit to top 5 results
        
        const title = $(element).find('.result__title').text().trim();
        const snippet = $(element).find('.result__snippet').text().trim();
        const url = $(element).find('.result__url').attr('href');
        
        if (title && snippet) {
          results.push({
            title,
            snippet,
            url: url || 'N/A'
          });
        }
      });

      if (results.length === 0) {
        return 'No results found for this query.';
      }

      // Format results for the AI
      let formattedResults = `Web Search Results for "${query}":\n\n`;
      results.forEach((result, index) => {
        formattedResults += `${index + 1}. ${result.title}\n`;
        formattedResults += `   ${result.snippet}\n`;
        formattedResults += `   URL: ${result.url}\n\n`;
      });

      console.log(`[WebSearch] Found ${results.length} results`);
      return formattedResults;
    } catch (error) {
      console.error('[WebSearch] Error:', error.message);
      return `Error performing web search: ${error.message}`;
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
        searchResults = await this.performWebSearch(userMessage);
        console.log('[WebSearchService] Search results obtained:', searchResults.length, 'chars');
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
          `${userMessage}\n\n[Web Search Results]:\n${searchResults}\n\nPlease provide an answer based on these search results.`
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
      
      searchResults = await this.performWebSearch(userMessage);
      console.log('[WebSearchService] Search completed. Results length:', searchResults.length);

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
          `${userMessage}\n\n[Web Search Results]:\n${searchResults}\n\nPlease provide an answer based on these search results.`
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
