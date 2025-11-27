import { useState, useRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Attachment, Message, streamChatCompletion } from './services/azureOpenAI';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (
    content: string,
    displayContent?: string,
    fileName?: string,
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
    <div className="flex h-screen bg-[#343541] text-white">
      <div className="flex flex-col flex-1">
        <header className="border-b border-[#2a2b32]">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10a37f]/10">
              <MessageSquare className="h-5 w-5 text-[#10a37f]" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">ChatGPT Clone</h1>
              <p className="text-sm text-[#9a9b9f]">Powered by Azure OpenAI</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 text-center text-[#acadc1]">
                <MessageSquare className="h-16 w-16 text-[#565869]" />
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold text-white">How can I help you today?</h2>
                  <p className="text-base text-[#9a9b9f]">
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
                  <div className="flex items-start gap-3 rounded-2xl bg-[#444654] px-6 py-6 text-white">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#10a37f]/10">
                      <MessageSquare className="h-5 w-5 text-[#10a37f]" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 text-sm font-semibold text-white">AI Assistant</div>
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
