import { useEffect, useState, useRef } from 'react';
import { X, Search, MessageSquare } from 'lucide-react';
import type { Conversation } from '../types/chat';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelectConversation: (conversationId: string, messageId?: string, searchQuery?: string) => void;
}

interface SearchResult {
  conversation: Conversation;
  matchedIn: 'title' | 'message';
  matchedText?: string;
  messageIndex?: number;
  role?: 'user' | 'assistant' | 'system';
  messageId?: string;
}

function highlightMatch(text: string, query: string): JSX.Element {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return <>{text}</>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <mark className="search-highlight">
        {match}
      </mark>
      {after}
    </>
  );
}

function getContextSnippet(text: string, query: string, maxLength = 150): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Try to center the match in the snippet
  const startOffset = Math.max(0, index - Math.floor((maxLength - query.length) / 2));
  const endOffset = Math.min(text.length, startOffset + maxLength);
  
  let snippet = text.slice(startOffset, endOffset);
  
  if (startOffset > 0) snippet = '...' + snippet;
  if (endOffset < text.length) snippet = snippet + '...';

  return snippet;
}

export function SearchModal({ isOpen, onClose, conversations, onSelectConversation }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    conversations.forEach((conversation) => {
      // Check title match
      const title = (conversation.title || 'New chat').toLowerCase();
      if (title.includes(query)) {
        results.push({
          conversation,
          matchedIn: 'title',
        });
        return; // Only show once per conversation
      }

      // Check message matches
      conversation.messages.forEach((message, index) => {
        const content = (message.displayContent || message.content || '').toLowerCase();
        if (content.includes(query)) {
          results.push({
            conversation,
            matchedIn: 'message',
            matchedText: message.displayContent || message.content,
            messageIndex: index,
            role: message.role,
            messageId: message.id,
          });
        }
      });
    });

    setSearchResults(results);
  }, [searchQuery, conversations]);

  const handleSelectResult = (result: SearchResult) => {
    onSelectConversation(
      result.conversation.id,
      result.messageId,
      result.matchedIn === 'message' ? searchQuery : undefined
    );
    onClose();
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
    setSearchResults([]);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[10vh] px-4">
        <div
          className="w-full max-w-2xl bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[var(--border-strong)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-strong)]">
            <Search className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              className="flex-1 bg-transparent text-[var(--text-primary)] text-base outline-none placeholder:text-[var(--text-tertiary)]"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversations"
            />
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[var(--bg-control-hover)] transition text-[var(--text-tertiary)]"
              aria-label="Close search"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-tertiary)]">
                <Search className="h-12 w-12 mb-3 opacity-40" aria-hidden />
                <p className="text-sm">Start typing to search your conversations</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-tertiary)]">
                <MessageSquare className="h-12 w-12 mb-3 opacity-40" aria-hidden />
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="py-2">
                {searchResults.map((result, index) => {
                  const title = result.conversation.title || 'New chat';
                  
                  return (
                    <button
                      key={`${result.conversation.id}-${index}`}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="w-full px-4 py-3 hover:bg-[var(--bg-control-hover)] transition text-left border-b border-[var(--border-subtle)] last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <MessageSquare className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Conversation Title */}
                          <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            {result.matchedIn === 'title' ? (
                              highlightMatch(title, searchQuery)
                            ) : (
                              title
                            )}
                          </div>
                          
                          {/* Matched Content Snippet */}
                          {result.matchedIn === 'message' && result.matchedText && (
                            <div className="space-y-1">
                              <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                                {result.role === 'user' ? '# You' : '# AI Assistant'}
                                <span>·</span>
                                <span>Message {(result.messageIndex || 0) + 1}</span>
                              </div>
                              <div className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                {highlightMatch(
                                  getContextSnippet(result.matchedText, searchQuery),
                                  searchQuery
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {searchResults.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border-strong)] bg-[var(--bg-app)] text-xs text-[var(--text-tertiary)]">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
