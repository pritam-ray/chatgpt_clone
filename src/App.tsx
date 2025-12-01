import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Moon, Sun } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Attachment, Message, streamChatCompletion } from './services/azureOpenAI';

const THEME_STORAGE_KEY = 'chatgpt-clone-theme';

type Theme = 'dark' | 'light';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async (
    content: string,
    displayContent?: string,
    _fileName?: string,
    attachments?: Attachment[],
  ) => {
    const userMessage: Message = {
      role: 'user',
      content, // Full content for API
      displayContent: displayContent || content, // Display content for UI
      attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const messageHistory = [...messages, userMessage];

      for await (const chunk of streamChatCompletion(messageHistory)) {
        assistantMessage.content += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...assistantMessage };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="flex flex-col flex-1">
        <header className="border-b border-[var(--border-strong)] bg-[var(--bg-panel)]/95 backdrop-blur-md transition-colors">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4">
            <div className="accent-badge flex h-11 w-11 items-center justify-center rounded-full">
              <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[var(--text-primary)]">ChatGPT Clone</h1>
              <p className="text-sm text-[var(--text-tertiary)]">Powered by Azure OpenAI</p>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-control)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-control-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
          <div className="mx-auto w-full max-w-3xl px-4">
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
              <div className="pb-6">
                {messages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                  <div className="chat-bubble flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-message-assistant)] px-6 py-6 text-[var(--text-primary)]">
                    <div className="accent-badge flex h-10 w-10 flex-none items-center justify-center rounded-full">
                      <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">AI Assistant</div>
                      <div className="flex gap-2">
                        <span className="typing-dot"></span>
                        <span className="typing-dot dot-2"></span>
                        <span className="typing-dot dot-3"></span>
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
