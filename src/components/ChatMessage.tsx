import { useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';
import { Message } from '../services/azureOpenAI';
import { renderMarkdownToHTML } from '../utils/markdown';
import 'katex/dist/katex.min.css';

interface ChatMessageProps {
  message: Message;
}

function MarkdownContent({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Add copy buttons to code blocks after rendering
      const codeBlocks = contentRef.current.querySelectorAll('pre.code-block');
      
      codeBlocks.forEach((block, index) => {
        const codeElement = block.querySelector('code');
        if (!codeElement) return;
        
        // Check if copy button already exists
        if (block.querySelector('.copy-button')) return;
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button absolute top-3 right-3 p-2.5 bg-slate-700/80 hover:bg-slate-600 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 active:scale-95';
        copyButton.setAttribute('aria-label', 'Copy code to clipboard');
        copyButton.innerHTML = `<svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
        
        copyButton.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(codeElement.textContent || '');
            copyButton.innerHTML = `<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            setTimeout(() => {
              copyButton.innerHTML = `<svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        });
        
        // Wrap pre in relative container for absolute positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'relative group';
        block.parentNode?.insertBefore(wrapper, block);
        wrapper.appendChild(block);
        wrapper.appendChild(copyButton);
      });
    }
  }, [content]);

  const html = renderMarkdownToHTML(content);

  return (
    <div
      ref={contentRef}
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className="py-3">
      <div
        className={`flex gap-4 rounded-2xl px-6 py-6 text-white ${
          isUser ? 'bg-[#343541] border border-[#3f414a]' : 'bg-[#444654]'
        }`}
      >
        <div
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-full font-semibold ${
            isUser ? 'bg-[#3f414a] text-white' : 'bg-[#10a37f] text-white'
          }`}
        >
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-2 text-sm font-semibold text-[#abadb8]">
            {isUser ? 'You' : 'ChatGPT'}
          </div>
          <div className="text-[15px] leading-relaxed text-[#ececf1]">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.displayContent || message.content}</div>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
          {message.attachments?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {message.attachments.map((attachment, index) => (
                <div
                  key={`${attachment.fileName}-${index}`}
                  className="overflow-hidden rounded-2xl border border-[#2a2b32] bg-[#202123]"
                >
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.fileName}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                  <div className="px-3 py-2 text-xs text-[#9a9b9f]">{attachment.fileName}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
