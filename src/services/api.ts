const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export interface Conversation {
  id: string;
  title: string;
  azure_response_id?: string;
  created_at: number;
  updated_at: number;
  messages: any[];
}

// Get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Fetch all conversations from backend
export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

// Get single conversation
export async function fetchConversation(id: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
}

// Create new conversation in backend
export async function createConversation(
  id: string, 
  title: string, 
  azureResponseId?: string
): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, title, azureResponseId })
  });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
}

// Update conversation title
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}/title`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title })
  });
  if (!response.ok) throw new Error('Failed to update conversation');
}

// Update conversation Azure response ID
export async function updateConversationResponse(id: string, azureResponseId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}/response`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ azureResponseId })
  });
  if (!response.ok) throw new Error('Failed to update response ID');
}

// Delete conversation
export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
}

// Add message to conversation
export async function addMessage(
  conversationId: string,
  role: string,
  content: string,
  displayContent?: string,
  attachments?: any[]
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      role,
      content,
      displayContent: displayContent || content,
      attachments: attachments || []
    })
  });
  if (!response.ok) throw new Error('Failed to add message');
}

// Azure session management
export async function saveAzureSession(
  sessionId: string,
  conversationId: string,
  modelName?: string,
  totalTokens?: number
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/azure-sessions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sessionId, conversationId, modelName, totalTokens })
  });
  if (!response.ok) throw new Error('Failed to save Azure session');
}

export async function getAzureSession(conversationId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/session`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch Azure session');
  }
  return response.json();
}
