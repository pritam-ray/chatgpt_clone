export type Attachment = {
  type: 'image' | 'pdf';
  mimeType: string;
  dataUrl: string; // base64 data URL for images and PDFs
  fileName: string;
};

export interface Message {
  id?: string; // Optional: unique identifier for message (used for search highlighting)
  role: 'user' | 'assistant' | 'system';
  content: string;
  displayContent?: string; // Optional: content to display in UI (without file data)
  attachments?: Attachment[];
}

export interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

function buildAzureMessages(messages: Message[]) {
  return messages.map((message) => {
    if (message.role === 'user' && message.attachments?.length) {
      const parts: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
      > = [];

      const trimmed = message.content.trim();
      if (trimmed) {
        parts.push({ type: 'text', text: trimmed });
      }

      message.attachments.forEach((attachment) => {
        if (attachment.type === 'image') {
          parts.push({
            type: 'image_url',
            image_url: {
              url: attachment.dataUrl,
              detail: 'auto',
            },
          });
        } else if (attachment.type === 'pdf') {
          parts.push({
            type: 'image_url',
            image_url: {
              url: attachment.dataUrl,
            },
          });
        }
      });

      return {
        role: message.role,
        content: parts,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

export async function* streamChatCompletion(messages: Message[]) {
  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
  const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT_NAME;
  const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: buildAzureMessages(messages),
      stream: true,
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Response body is not readable');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === '' || trimmedLine === 'data: [DONE]') {
        continue;
      }

      if (trimmedLine.startsWith('data: ')) {
        try {
          const jsonStr = trimmedLine.slice(6);
          const data: ChatCompletionChunk = JSON.parse(jsonStr);

          if (data.choices?.[0]?.delta?.content) {
            yield data.choices[0].delta.content;
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      }
    }
  }
}
