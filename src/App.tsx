import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Moon, Sun, Menu, Bot, Plus, Search, User, LogOut } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { SearchModal } from './components/SearchModal';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ProfilePage } from './components/ProfilePage';
import { useAuth } from './contexts/AuthContext';
import { Attachment, Message, streamChatCompletion } from './services/azureOpenAI';
import { azureResponseAPI } from './services/azureResponseAPI';
import * as api from './services/api';
import type { Conversation } from './types/chat';

const THEME_STORAGE_KEY = 'chatgpt-clone-theme';
const ACTIVE_CONVERSATION_KEY = 'chatgpt-clone-active-conversation';
const DEFAULT_TITLE = 'New chat';

type Theme = 'dark' | 'light';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string;
}

const createConversation = (): Conversation => {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const timestamp = Date.now();

  return {
    id,
    title: DEFAULT_TITLE,
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    azureResponseId: undefined,
  };
};

const loadInitialConversationState = (): ConversationState => {
  // Initial empty state - will be loaded from database in useEffect
  const conversation = createConversation();
  return { conversations: [conversation], activeConversationId: conversation.id };
};

const summarizeTitle = (conversation: Conversation, content: string) => {
  if (conversation.title !== DEFAULT_TITLE) {
    return conversation.title;
  }

  const cleaned = content.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return DEFAULT_TITLE;
  }

  return cleaned.length > 40 ? `${cleaned.slice(0, 40).trim()}…` : cleaned;
};

// Generate a meaningful title from AI response using Azure OpenAI
const generateTitleFromResponse = async (userMessage: string, assistantResponse: string): Promise<string> => {
  try {
    const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
    const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
    const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

    if (!endpoint || !apiKey || !deployment) {
      console.warn('Azure OpenAI not configured for title generation');
      return summarizeTitle({ title: DEFAULT_TITLE } as Conversation, userMessage);
    }

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Generate a concise, descriptive title (3-6 words) for this conversation. Return only the title, nothing else.',
          },
          {
            role: 'user',
            content: userMessage,
          },
          {
            role: 'assistant',
            content: assistantResponse,
          },
        ],
        max_tokens: 20,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate title: ${response.status}`);
    }

    const data = await response.json();
    const generatedTitle = data.choices?.[0]?.message?.content?.trim();

    if (generatedTitle && generatedTitle.length > 0) {
      // Clean up the title - remove quotes if present
      return generatedTitle.replace(/^["']|["']$/g, '').slice(0, 50);
    }

    // Fallback to user message-based title
    return summarizeTitle({ title: DEFAULT_TITLE } as Conversation, userMessage);
  } catch (error) {
    console.error('Error generating title:', error);
    // Fallback to user message-based title
    return summarizeTitle({ title: DEFAULT_TITLE } as Conversation, userMessage);
  }
};

function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function App() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>(() => loadInitialConversationState());
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>(undefined);
  const [searchQueryForHighlight, setSearchQueryForHighlight] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTime = useRef<number>(0);

  const { conversations, activeConversationId } = conversationState;
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0];
  const messages = activeConversation?.messages ?? [];

  const scrollToBottom = (immediate = false) => {
    const now = Date.now();
    // Throttle scrolling to every 100ms during streaming
    if (!immediate && now - lastScrollTime.current < 100) {
      // Schedule a delayed scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        lastScrollTime.current = Date.now();
      }, 100);
      return;
    }
    
    lastScrollTime.current = now;
    messagesEndRef.current?.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'end' });
  };

  useEffect(() => {
    // Only scroll when not streaming or when messages change significantly
    if (!isLoading) {
      scrollToBottom(true);
    }
  }, [messages.length, isLoading]);

  // Clear highlighting when clicking anywhere
  useEffect(() => {
    const handleClick = () => {
      if (highlightedMessageId) {
        setHighlightedMessageId(undefined);
        setSearchQueryForHighlight(undefined);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [highlightedMessageId]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showUserMenu && !target.closest('[aria-label="User menu"]') && !target.closest('.absolute.right-0')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  // Load conversations from database on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    
    const loadFromDatabase = async () => {
      try {
        const dbConversations = await api.fetchConversations();
        
        if (dbConversations.length > 0) {
          // Map database fields to frontend structure
          const mapped = dbConversations.map(conv => ({
            id: conv.id,
            title: conv.title,
            messages: (conv.messages || []).map((msg: Message) => ({
              ...msg,
              id: msg.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11)),
            })),
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
            azureResponseId: conv.azure_response_id,
          }));
          
          const sorted = mapped.sort((a, b) => b.updatedAt - a.updatedAt);
          const storedActiveId = window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
          const activeId = sorted.some(c => c.id === storedActiveId) ? storedActiveId! : sorted[0].id;
          
          setConversationState({
            conversations: sorted,
            activeConversationId: activeId,
          });
        } else {
          // No conversations in database, create initial one
          const initialConv = createConversation();
          try {
            await api.createConversation(initialConv.id, initialConv.title);
            setConversationState({
              conversations: [initialConv],
              activeConversationId: initialConv.id,
            });
          } catch (error) {
            console.error('Failed to create initial conversation:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load from database:', error);
      }
    };
    
    loadFromDatabase();
  }, [isAuthenticated, authLoading]);

  // Save active conversation ID to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    const nextClass = theme === 'light' ? 'theme-light' : 'theme-dark';
    root.classList.add(nextClass);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const updateConversationById = (
    conversationId: string,
    updater: (conversation: Conversation) => Conversation,
  ) => {
    setConversationState((prev) => {
      const index = prev.conversations.findIndex((conversation) => conversation.id === conversationId);
      if (index === -1) {
        return prev;
      }

      const target = prev.conversations[index];
      const updatedConversation = updater(target);
      const remaining = prev.conversations.filter((_, idx) => idx !== index);

      return {
        ...prev,
        conversations: [updatedConversation, ...remaining],
      };
    });
  };

  const handleRenameConversation = async (conversationId: string) => {
    const target = conversations.find((conversation) => conversation.id === conversationId);
    if (!target) {
      return;
    }

    const initialTitle = target.title === DEFAULT_TITLE ? '' : target.title;
    const nextTitle = window.prompt('Rename conversation', initialTitle) ?? undefined;
    if (nextTitle === undefined) {
      return;
    }

    const trimmed = nextTitle.trim() || DEFAULT_TITLE;
    
    // Update in database
    try {
      await api.updateConversationTitle(conversationId, trimmed);
    } catch (error) {
      console.error('Failed to update title in database:', error);
    }
    
    updateConversationById(conversationId, (conversation) => ({
      ...conversation,
      title: trimmed,
      updatedAt: Date.now(),
    }));
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const confirmDelete = window.confirm('Delete this conversation?');
    if (!confirmDelete) {
      return;
    }

    // Delete from database
    try {
      await api.deleteConversation(conversationId);
    } catch (error) {
      console.error('Failed to delete from database:', error);
    }

    setConversationState((prev) => {
      const remaining = prev.conversations.filter((conversation) => conversation.id !== conversationId);
      if (remaining.length === 0) {
        const conversation = createConversation();
        return {
          conversations: [conversation],
          activeConversationId: conversation.id,
        };
      }

      const nextActiveId = prev.activeConversationId === conversationId ? remaining[0].id : prev.activeConversationId;
      return {
        conversations: remaining,
        activeConversationId: nextActiveId,
      };
    });

    if (activeConversationId === conversationId) {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string, messageId?: string, searchQuery?: string) => {
    setConversationState((prev) => {
      if (!prev.conversations.some((conversation) => conversation.id === conversationId)) {
        return prev;
      }

      // Remove the current active conversation if it's empty
      const currentActive = prev.conversations.find((c) => c.id === prev.activeConversationId);
      let updatedConversations = prev.conversations;
      
      if (currentActive && currentActive.messages.length === 0 && prev.activeConversationId !== conversationId) {
        updatedConversations = prev.conversations.filter((c) => c.id !== currentActive.id);
      }

      return {
        conversations: updatedConversations,
        activeConversationId: conversationId,
      };
    });
    
    // Set highlight info if provided
    if (messageId && searchQuery) {
      setHighlightedMessageId(messageId);
      setSearchQueryForHighlight(searchQuery);
      
      // Scroll to the message after a short delay to ensure DOM is updated
      setTimeout(() => {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      setHighlightedMessageId(undefined);
      setSearchQueryForHighlight(undefined);
    }
    
    setIsSidebarOpen(false);
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleRegenerateResponse = async () => {
    if (!activeConversation || isLoading) return;
    
    const messages = activeConversation.messages;
    if (messages.length < 2) return; // Need at least a user message and assistant response
    
    // Get the last assistant message and the user message before it
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;
    
    const lastUserMessageIndex = messages.length - 2;
    const lastUserMessage = messages[lastUserMessageIndex];
    if (lastUserMessage.role !== 'user') return;
    
    // Delete last assistant message from database
    try {
      await api.deleteLastMessage(activeConversation.id);
    } catch (error) {
      console.error('Failed to delete last message:', error);
      alert('Failed to regenerate response. Please try again.');
      return;
    }
    
    // Remove last assistant message from state
    const updatedMessages = messages.slice(0, -1);
    updateConversationById(activeConversation.id, (conversation) => ({
      ...conversation,
      messages: updatedMessages,
    }));

    const conversationId = activeConversation.id;
    setIsLoading(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Create new assistant message for the regenerated response
      const assistantMessage: Message = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
        role: 'assistant',
        content: '',
      };

      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: Date.now(),
      }));

      // Use Azure Response API with streaming
      if (azureResponseAPI.isConfigured()) {
        console.log('[Regenerate] Using Azure Response API');
        
        try {
          // Format input for Response API
          let input: any;
          if (lastUserMessage.attachments && lastUserMessage.attachments.length > 0) {
            const contentParts: any[] = [];
            
            if (lastUserMessage.content.trim()) {
              contentParts.push({ type: 'input_text', text: lastUserMessage.content });
            }
            
            for (const attachment of lastUserMessage.attachments) {
              if (attachment.type === 'image') {
                contentParts.push({ type: 'input_image', image_url: attachment.dataUrl });
              } else if (attachment.type === 'pdf') {
                contentParts.push({ 
                  type: 'input_file', 
                  filename: attachment.fileName, 
                  file_data: attachment.dataUrl 
                });
              }
            }
            
            input = [{ role: 'user', content: contentParts }];
          } else {
            input = lastUserMessage.content;
          }

          let responseId = activeConversation.azureResponseId;
          
          // Stream the response
          for await (const chunk of azureResponseAPI.streamWithContext(input, { 
            previousResponseId: activeConversation.azureResponseId 
          })) {
            if (controller.signal.aborted) {
              break;
            }

            if (chunk.done) {
              if (chunk.responseId) {
                responseId = chunk.responseId;
                try {
                  await api.updateConversationResponse(conversationId, responseId);
                  updateConversationById(conversationId, (conversation) => ({
                    ...conversation,
                    azureResponseId: responseId,
                  }));
                  console.log('[Regenerate] ✓ Response ID saved:', responseId);
                } catch (error) {
                  console.error('[Regenerate] Failed to save response ID:', error);
                }
              }
              break;
            }

            assistantMessage.content += chunk.content;

            // Batch updates
            const contentLength = assistantMessage.content.length;
            const shouldUpdate = contentLength % 50 === 0 || chunk.content.includes('\n');
            
            if (shouldUpdate) {
              updateConversationById(conversationId, (conversation) => {
                const updated = [...conversation.messages];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0) {
                  updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
                }
                return { ...conversation, messages: updated, updatedAt: Date.now() };
              });
              scrollToBottom();
            }
          }

          // Final update
          updateConversationById(conversationId, (conversation) => {
            const updated = [...conversation.messages];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0) {
              updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
            }
            return { ...conversation, messages: updated, updatedAt: Date.now() };
          });

          // Save to database
          try {
            await api.addMessage(
              conversationId,
              'assistant',
              assistantMessage.content,
              assistantMessage.content
            );
          } catch (error) {
            console.error('[Regenerate] Failed to save message:', error);
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('[Regenerate] Request cancelled');
          } else {
            console.error('[Regenerate] Azure Response API error:', error);
            throw error;
          }
        }
      } else {
        // Fallback to standard API
        console.log('[Regenerate] Using standard API');
        const MAX_CONTEXT_MESSAGES = 20;
        const messageHistory = updatedMessages.slice(-MAX_CONTEXT_MESSAGES);

        for await (const chunk of streamChatCompletion([...messageHistory, lastUserMessage])) {
          if (controller.signal.aborted) {
            break;
          }

          assistantMessage.content += chunk;

          const contentLength = assistantMessage.content.length;
          const shouldUpdate = contentLength % 50 === 0 || chunk.includes('\n');
          
          if (shouldUpdate) {
            updateConversationById(conversationId, (conversation) => {
              const updated = [...conversation.messages];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
              }
              return { ...conversation, messages: updated, updatedAt: Date.now() };
            });
            scrollToBottom();
          }
        }

        // Final update
        updateConversationById(conversationId, (conversation) => {
          const updated = [...conversation.messages];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
          }
          return { ...conversation, messages: updated, updatedAt: Date.now() };
        });

        // Save to database
        try {
          await api.addMessage(
            conversationId,
            'assistant',
            assistantMessage.content,
            assistantMessage.content
          );
        } catch (error) {
          console.error('[Regenerate] Failed to save message:', error);
        }
      }
    } catch (error: any) {
      console.error('Regenerate error:', error);
      if (error.name !== 'AbortError') {
        alert('Failed to regenerate response. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleNewConversation = async () => {
    // Check if the current active conversation is already empty
    const currentActive = conversations.find((c) => c.id === activeConversationId);
    if (currentActive && currentActive.messages.length === 0) {
      // Don't create a new chat if the current one is already empty
      setIsSidebarOpen(false);
      return;
    }

    const conversation = createConversation();
    
    // Create in database
    try {
      await api.createConversation(conversation.id, conversation.title);
    } catch (error) {
      console.error('Failed to create conversation in database:', error);
      alert('Failed to create new conversation. Please try again.');
      return;
    }
    
    setConversationState((prev) => ({
      conversations: [conversation, ...prev.conversations],
      activeConversationId: conversation.id,
    }));
    setIsSidebarOpen(false);
    setIsLoading(false);
  };

  const handleSendMessage = async (
    content: string,
    displayContent?: string,
    _fileName?: string,
    attachments?: Attachment[],
  ) => {
    if (!activeConversation) {
      return;
    }

    const conversationId = activeConversation.id;
    const userMessage: Message = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
      role: 'user',
      content, // Full content for API
      displayContent: displayContent || content, // Display content for UI
      attachments,
    };

    const conversationMessages = activeConversation.messages;
    const updatedMessages = [...conversationMessages, userMessage];
    const isFirstMessage = conversationMessages.length === 0;

    // Save user message to database
    try {
      await api.addMessage(
        conversationId,
        'user',
        content,
        displayContent,
        attachments
      );
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    updateConversationById(conversationId, (conversation) => ({
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    }));

    setIsLoading(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const assistantMessage: Message = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 11),
        role: 'assistant',
        content: '',
      };

      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: Date.now(),
      }));

      // Primary: Use Azure Response API (supports text, images, PDFs with stateful context)
      if (azureResponseAPI.isConfigured()) {
        console.log('[App] Using Azure Response API with stateful chaining');
        console.log('[App] Previous Response ID:', activeConversation.azureResponseId || 'New conversation');
        
        try {
          // Format input for Response API
          let input: any;
          if (attachments && attachments.length > 0) {
            // Multi-modal input with attachments
            const contentParts: any[] = [];
            
            if (content.trim()) {
              contentParts.push({ type: 'input_text', text: content });
            }
            
            for (const attachment of attachments) {
              if (attachment.type === 'image') {
                contentParts.push({ type: 'input_image', image_url: attachment.dataUrl });
              } else if (attachment.type === 'pdf') {
                contentParts.push({ 
                  type: 'input_file', 
                  filename: attachment.fileName, 
                  file_data: attachment.dataUrl 
                });
              }
            }
            
            input = [{ role: 'user', content: contentParts }];
          } else {
            input = content;
          }
          
          let responseId = activeConversation.azureResponseId;
          
          for await (const chunk of azureResponseAPI.streamWithContext(input, { 
            previousResponseId: activeConversation.azureResponseId 
          })) {
            // Check if generation was stopped
            if (controller.signal.aborted) {
              break;
            }

            if (chunk.done) {
              if (chunk.responseId) {
                responseId = chunk.responseId;
                try {
                  await api.updateConversationResponse(conversationId, responseId);
                  updateConversationById(conversationId, (conversation) => ({
                    ...conversation,
                    azureResponseId: responseId,
                  }));
                  console.log('[App] ✓ Response ID saved:', responseId);
                } catch (error) {
                  console.error('[App] Failed to save response ID:', error);
                }
              }
              break;
            }

            assistantMessage.content += chunk.content;

            // Batch updates: only update state every few chunks to reduce re-renders
            const contentLength = assistantMessage.content.length;
            const shouldUpdate = contentLength % 50 === 0 || chunk.content.includes('\n');
            
            if (shouldUpdate) {
              updateConversationById(conversationId, (conversation) => {
                const updated = [...conversation.messages];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0) {
                  updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
                }
                return { ...conversation, messages: updated, updatedAt: Date.now() };
              });
              scrollToBottom();
            }
          }
        } catch (error) {
          console.error('[App] Response API error:', error);
          throw error; // Will be caught by outer try-catch
        }
      } else {
        // Fallback: Standard Chat Completions API (only if Response API not configured)
        console.log('[App] Response API not configured, using standard API');
        
        const MAX_CONTEXT_MESSAGES = 20;
        const messageHistory = updatedMessages.slice(-MAX_CONTEXT_MESSAGES);

        for await (const chunk of streamChatCompletion(messageHistory)) {
          // Check if generation was stopped
          if (controller.signal.aborted) {
            break;
          }

          assistantMessage.content += chunk;

          // Batch updates: only update state every few chunks to reduce re-renders
          const contentLength = assistantMessage.content.length;
          const shouldUpdate = contentLength % 50 === 0 || chunk.includes('\n');
          
          if (shouldUpdate) {
            updateConversationById(conversationId, (conversation) => {
              const updated = [...conversation.messages];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
              }
              return { ...conversation, messages: updated, updatedAt: Date.now() };
            });
            scrollToBottom();
          }
        }
      }

      // Final update to ensure all content is displayed
      updateConversationById(conversationId, (conversation) => {
        const updated = [...conversation.messages];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = { ...updated[lastIndex], content: assistantMessage.content };
        }
        return { ...conversation, messages: updated, updatedAt: Date.now() };
      });

      // Save assistant message to database after streaming completes
      if (assistantMessage.content) {
        try {
          await api.addMessage(conversationId, 'assistant', assistantMessage.content);
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

      // Generate and update title based on assistant's first response
      if (isFirstMessage && assistantMessage.content) {
        try {
          const generatedTitle = await generateTitleFromResponse(
            userMessage.displayContent || userMessage.content,
            assistantMessage.content
          );
          
          if (generatedTitle !== DEFAULT_TITLE) {
            // Update title in database
            await api.updateConversationTitle(conversationId, generatedTitle);
            
            // Update title in state
            updateConversationById(conversationId, (conversation) => ({
              ...conversation,
              title: generatedTitle,
            }));
            
            console.log('[App] ✓ Generated title:', generatedTitle);
          }
        } catch (error) {
          console.error('Failed to generate/update conversation title:', error);
        }
      }
    } catch (error: any) {
      // Check if it was aborted by user
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Generation stopped by user');
        // Keep the partial response that was generated
      } else {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
        };
      updateConversationById(conversationId, (conversation) => {
        const updated = [...conversation.messages];
        if (updated.length && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = errorMessage;
        } else {
          updated.push(errorMessage);
        }

        return {
          ...conversation,
          messages: updated,
          updatedAt: Date.now(),
        };
      });
      }
    } finally {
      setAbortController(null);
      setIsLoading(false);
    }
  };

  // Show authentication screens if not authenticated
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-app)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Check for reset token in URL
    if (!showResetPassword && !resetToken) {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        setResetToken(token);
        setShowResetPassword(true);
        // Clear token from URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    if (showResetPassword && resetToken) {
      return (
        <ResetPasswordPage 
          token={resetToken} 
          onSuccess={() => {
            setShowResetPassword(false);
            setResetToken('');
            setShowSignup(false);
            setShowForgotPassword(false);
          }} 
        />
      );
    }

    if (showForgotPassword) {
      return (
        <ForgotPasswordPage 
          onBack={() => {
            setShowForgotPassword(false);
            setShowSignup(false);
          }} 
        />
      );
    }

    return showSignup ? (
      <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginPage 
        onSwitchToSignup={() => setShowSignup(true)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-300">
      <div
        className={`sidebar-overlay md:hidden ${isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        conversations={conversations}
        onSelectMessage={(conversationId, messageId, searchQuery) => {
          setIsSearchModalOpen(false);
          if (conversationId !== activeConversationId) {
            handleSelectConversation(conversationId);
          }
          setHighlightedMessageId(messageId);
          setSearchQueryForHighlight(searchQuery);
          setTimeout(() => {
            const messageElement = document.getElementById(`message-${messageId}`);
            messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }}
      />

      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isOpen={isSidebarOpen}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onClose={() => setIsSidebarOpen(false)}
        shouldFocusSearch={shouldFocusSearch}
        onSearchFocused={() => setShouldFocusSearch(false)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />

      {/* Icon bar visible when sidebar is closed on desktop */}
      <div className={`hidden md:flex flex-col items-center gap-2 bg-[var(--bg-panel)] border-r border-[var(--border-strong)] py-2 transition-all duration-300 ${isSidebarOpen ? 'w-0 opacity-0 overflow-hidden' : 'w-14 opacity-100'}`}>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-control)] text-[var(--text-primary)] transition hover:bg-[var(--bg-control-hover)]"
          title="Open sidebar"
          aria-label="Open chat history"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleNewConversation}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-control)] text-[var(--text-primary)] transition hover:bg-[var(--bg-control-hover)]"
          title="New chat"
          aria-label="New chat"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-control)] text-[var(--text-primary)] transition hover:bg-[var(--bg-control-hover)]"
          title="Search chats"
          aria-label="Search chats"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
      />

      <div className="flex flex-1 flex-col">
        <header className="border-b border-[var(--border-strong)] bg-[var(--bg-panel)]/95 backdrop-blur-md transition-colors">
          <div className="flex w-full items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
            <button
              type="button"
              className="inline-flex md:hidden h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-control)] text-[var(--text-primary)] transition hover:bg-[var(--bg-control-hover)]"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open chat history"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </button>
            <div className="accent-badge hidden h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-full md:flex">
              <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] truncate">ChatGPT Clone</h1>
              <p className="text-xs sm:text-sm text-[var(--text-tertiary)] truncate">Powered by Azure OpenAI</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-control)] px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-[var(--accent)]" />
                ) : (
                  <Moon className="h-4 w-4 text-[var(--accent)]" />
                )}
                <span className="hidden sm:inline">
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </span>
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-control)] px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-control-hover)]"
                  aria-label="User menu"
                >
                  <User className="h-4 w-4 text-[var(--accent)]" />
                  <span className="hidden sm:inline">{user?.username || 'User'}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg z-50">
                    <div className="p-3 border-b border-[var(--border-subtle)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{user?.username}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfile(true);
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-control-hover)] transition"
                    >
                      <User className="h-4 w-4" />
                      Profile Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-control-hover)] transition border-t border-[var(--border-subtle)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--bg-app)] transition-colors">
          <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-panel)] border-2 border-[var(--border-subtle)]">
                    <MessageSquare className="h-8 w-8 text-[var(--text-tertiary)]" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-normal text-[var(--text-primary)]">How can I help you today?</h2>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {messages.map((message, index) => {
                  const isLastAssistant = message.role === 'assistant' && index === messages.length - 1;
                  return (
                    <ChatMessage 
                      key={index} 
                      message={message}
                      isHighlighted={highlightedMessageId === message.id}
                      searchQuery={highlightedMessageId === message.id ? searchQueryForHighlight : undefined}
                      onRegenerate={isLastAssistant ? handleRegenerateResponse : undefined}
                      isLastAssistantMessage={isLastAssistant}
                    />
                  );
                })}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                  <div className="chat-row chat-row-assistant">
                    <div className="chat-avatar chat-avatar-assistant">
                      <Bot className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="chat-card chat-card-assistant">
                      <header className="chat-card-header">
                        <span className="chat-card-label">AI Assistant</span>
                      </header>
                      <div className="chat-card-body">
                        <div className="flex gap-2">
                          <span className="typing-dot"></span>
                          <span className="typing-dot dot-2"></span>
                          <span className="typing-dot dot-3"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <ChatInput onSend={handleSendMessage} isGenerating={isLoading} onStop={handleStopGeneration} />
      </div>

      {/* Profile Modal */}
      {showProfile && <ProfilePage onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default App;
