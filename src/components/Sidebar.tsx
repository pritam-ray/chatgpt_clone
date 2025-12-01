import { useEffect, useState } from 'react';
import { Plus, MessageSquare, X, MoreHorizontal } from 'lucide-react';
import type { Conversation } from '../types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  isOpen: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) {
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    return `${minutes}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.max(1, Math.floor(diff / 3_600_000));
    return `${hours}h ago`;
  }
  const days = Math.max(1, Math.floor(diff / 86_400_000));
  return `${days}d ago`;
}

export function Sidebar({
  conversations,
  activeConversationId,
  isOpen,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onClose,
}: SidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.conversation-actions')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOpenMenuId(null);
    }
  }, [isOpen]);

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'} bg-[var(--bg-panel)] text-[var(--text-primary)]`}
      aria-label="Chat history"
    >
      <div className="sidebar-header">
        <button
          type="button"
          onClick={onNewConversation}
          className="new-chat-button"
        >
          <Plus className="h-4 w-4" aria-hidden />
          <span>New chat</span>
        </button>
        <button
          type="button"
          className="sidebar-close md:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Recent conversations">
        {conversations.length === 0 ? (
          <p className="sidebar-empty">No conversations yet</p>
        ) : (
          <ul className="conversation-list">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const fullTitle = conversation.title || 'New chat';
              const truncatedTitle = fullTitle.length > 20 ? `${fullTitle.slice(0, 20).trim()}…` : fullTitle;

              return (
                <li key={conversation.id} className="conversation-row">
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`conversation-item ${isActive ? 'is-active' : ''}`}
                    title={fullTitle}
                  >
                    <MessageSquare className="h-4 w-4 flex-none" aria-hidden />
                    <div className="conversation-meta">
                      <span className="conversation-title">{truncatedTitle}</span>
                      <span className="conversation-time">{formatRelativeTime(conversation.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="conversation-actions">
                    <button
                      type="button"
                      className="conversation-action-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((prev) => (prev === conversation.id ? null : conversation.id));
                      }}
                      aria-label="Conversation actions"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </button>
                    {openMenuId === conversation.id ? (
                      <div className="conversation-menu">
                        <button
                          type="button"
                          className="conversation-menu-item"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId(null);
                            onRenameConversation(conversation.id);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="conversation-menu-item is-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId(null);
                            onDeleteConversation(conversation.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
