import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import { extractTextFromFile } from '../utils/pdfExtractor';
import { Attachment } from '../services/azureOpenAI';

interface ChatInputProps {
  onSend: (message: string, displayMessage?: string, fileName?: string, attachments?: Attachment[]) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [imageAttachment, setImageAttachment] = useState<Attachment | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      resetFileInput();
      return;
    }

    setAttachedFile(file);
    setIsExtractingFile(true);

    if (file.type.startsWith('image/')) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setImageAttachment({
          type: 'image',
          mimeType: file.type,
          dataUrl,
          fileName: file.name,
        });
        setFileContent('');
      } catch (error) {
        console.error('Error reading image:', error);
        alert('Could not read the selected image. Please try another file.');
        setAttachedFile(null);
        setImageAttachment(null);
      } finally {
        setIsExtractingFile(false);
        resetFileInput();
      }
      return;
    }

    try {
      const content = await extractTextFromFile(file);
      setImageAttachment(null);
      setFileContent(content);
      if (!content || content.trim().length === 0) {
        alert('Could not extract text from the file. The file might be empty or unsupported.');
        setAttachedFile(null);
        setFileContent('');
      }
    } catch (error) {
      console.error('Error extracting file content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error reading file: ${errorMessage}\nPlease try another file.`);
      setAttachedFile(null);
      setFileContent('');
    } finally {
      setIsExtractingFile(false);
      resetFileInput();
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileContent('');
    setImageAttachment(null);
    resetFileInput();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!(trimmedInput || fileContent || imageAttachment) || disabled || isExtractingFile) {
      return;
    }

    let fullContent = trimmedInput;
    let displayContent = trimmedInput;
    const attachments: Attachment[] = [];

    if (fileContent) {
      fullContent += `\n\n[Attached File: ${attachedFile?.name}]\n\n${fileContent}`;
      displayContent = trimmedInput
        ? `${trimmedInput}\n\n📎 Attached: ${attachedFile?.name}`
        : `📎 Attached: ${attachedFile?.name}`;
    }

    if (imageAttachment) {
      attachments.push(imageAttachment);
      displayContent = displayContent
        ? `${displayContent}\n\n🖼️ Image attached: ${imageAttachment.fileName}`
        : `🖼️ Image attached: ${imageAttachment.fileName}`;
    }

    onSend(fullContent, displayContent, attachedFile?.name, attachments.length ? attachments : undefined);
    setInput('');
    handleRemoveFile();
  };

  const sendDisabled = disabled || isExtractingFile || (!input.trim() && !fileContent && !imageAttachment);

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#2a2b32] bg-[#343541] px-4 py-4">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        {attachedFile && (
          <div className="flex items-center justify-between rounded-xl border border-[#565869] bg-[#40414f] px-4 py-3 text-[#ececf1]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#565869]/60">
                <Paperclip className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-sm font-medium">
                  {isExtractingFile ? 'Processing...' : attachedFile.name}
                </span>
                {imageAttachment ? (
                  <span className="text-xs text-[#9a9b9f]">Image attachment</span>
                ) : fileContent ? (
                  <span className="text-xs text-[#9a9b9f]">Document attachment</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[#565869]/70"
              title="Remove attachment"
              aria-label="Remove attachment"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isExtractingFile}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#565869] bg-[#40414f] text-[#ececf1] transition hover:bg-[#4a4b58] disabled:cursor-not-allowed disabled:border-[#3f414a] disabled:text-[#6b6e7f]"
            title="Attach file"
            aria-label="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.md,.doc,.docx,image/*"
            className="hidden"
            aria-label="Attachment input"
            title="Attachment input"
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isExtractingFile ? 'Processing file...' : 'Message ChatGPT'}
            disabled={disabled || isExtractingFile}
            className="flex-1 rounded-2xl border border-[#565869] bg-[#40414f] px-5 py-3 text-[15px] text-white placeholder-[#8e8f9b] focus:border-[#10a37f] focus:outline-none"
            aria-label="Message input"
            title="Message input"
          />

          <button
            type="submit"
            disabled={sendDisabled}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10a37f] text-[#0c1722] transition hover:bg-[#14b081] disabled:cursor-not-allowed disabled:bg-[#4a4b58] disabled:text-[#8b8c94]"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </form>
  );
}
