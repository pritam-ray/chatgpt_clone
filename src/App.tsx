import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Moon, Sun, Menu, Bot, Plus } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { Attachment, Message, streamChatCompletion } from './services/azureOpenAI';
import type { Conversation } from './types/chat';

const THEME_STORAGE_KEY = 'chatgpt-clone-theme';
const HISTORY_STORAGE_KEY = 'chatgpt-clone-history';
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
  };
};

const loadInitialConversationState = (): ConversationState => {
  if (typeof window === 'undefined') {
    const conversation = createConversation();
    return { conversations: [conversation], activeConversationId: conversation.id };
  }

  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Conversation[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sorted = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt);
        const storedActiveId = window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        const fallbackId = sorted[0].id;
        const activeConversationId = sorted.some((conversation) => conversation.id === storedActiveId)
          ? (storedActiveId as string)
          : fallbackId;
        return { conversations: sorted, activeConversationId };
      }
    }
  } catch (error) {
    console.error('Failed to load conversations from storage:', error);
  }

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
  const [conversationState, setConversationState] = useState<ConversationState>(() => loadInitialConversationState());
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { conversations, activeConversationId } = conversationState;
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0];
  const messages = activeConversation?.messages ?? [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(conversations));
    window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, activeConversationId);
  }, [conversations, activeConversationId]);

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

  const handleRenameConversation = (conversationId: string) => {
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
    updateConversationById(conversationId, (conversation) => ({
      ...conversation,
      title: trimmed,
      updatedAt: Date.now(),
    }));
  };

  const handleDeleteConversation = (conversationId: string) => {
    const confirmDelete = window.confirm('Delete this conversation?');
    if (!confirmDelete) {
      return;
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

  const handleSelectConversation = (conversationId: string) => {
    setConversationState((prev) => {
      if (!prev.conversations.some((conversation) => conversation.id === conversationId)) {
        return prev;
      }

      return {
        ...prev,
        activeConversationId: conversationId,
      };
    });
    setIsSidebarOpen(false);
  };

  const handleNewConversation = () => {
    const conversation = createConversation();
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
      role: 'user',
      content, // Full content for API
      displayContent: displayContent || content, // Display content for UI
      attachments,
    };

    const conversationMessages = activeConversation.messages;
    const updatedMessages = [...conversationMessages, userMessage];

    updateConversationById(conversationId, (conversation) => ({
      ...conversation,
      messages: updatedMessages,
      title: summarizeTitle(conversation, userMessage.displayContent || userMessage.content),
      updatedAt: Date.now(),
    }));

    setIsLoading(true);

    try {
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
      };

      updateConversationById(conversationId, (conversation) => ({
        ...conversation,
        messages: [...updatedMessages, assistantMessage],
        updatedAt: Date.now(),
      }));

      const messageHistory = [...updatedMessages];

      for await (const chunk of streamChatCompletion(messageHistory)) {
        assistantMessage.content += chunk;
        const latestContent = assistantMessage.content;

        updateConversationById(conversationId, (conversation) => {
          const updated = [...conversation.messages];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = { ...updated[lastIndex], content: latestContent };
          }

          return {
            ...conversation,
            messages: updated,
            updatedAt: Date.now(),
          };
        });
      }
    } catch (error) {
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-300">
      <div
        className={`sidebar-overlay md:hidden ${isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
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
      />

      {/* Icon bar visible when sidebar is closed on desktop */}
      <div className={`hidden md:flex flex-col items-center gap-2 bg-[var(--bg-panel)] border-r border-[var(--border-strong)] py-2 transition-all duration-300 ${isSidebarOpen ? 'w-0 opacity-0 overflow-hidden' : 'w-14 opacity-100'}`}>
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
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-control)] text-[var(--text-primary)] transition hover:bg-[var(--bg-control-hover)]"
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <MessageSquare className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-[var(--border-strong)] bg-[var(--bg-panel)]/95 backdrop-blur-md transition-colors">
          <div className="flex w-full items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
            <button
              type="button"
              className={`inline-flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-control)] text-[var(--text-primary)] transition hover:bg-[var(--bg-control-hover)] ${isSidebarOpen ? 'md:hidden' : 'md:inline-flex'}`}
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
            <div className="flex-shrink-0">
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
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--bg-app)] transition-colors">
          <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 text-center text-[var(--text-tertiary)]">
                <MessageSquare className="h-16 w-16 text-[var(--border-subtle)]" />
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold text-[var(--text-primary)]">How can I help you today?</h2>
                  <p className="text-base text-[var(--text-tertiary)]">
                    Ask about anything—from quick questions to detailed explanations.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-10">
                {messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
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

        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export default App;
