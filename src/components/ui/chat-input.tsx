import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn utility
import { AIMode } from "@/types/types"; // Import AIMode

interface ChatInputProps {
  // Removed selectedProvider prop
  onSendMessage: (message: string) => void;
  onAttachFile?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
  // Add AI Mode props
  selectedAIMode: AIMode;
  onSelectAIMode: (mode: AIMode) => void;
}

const aiModes: AIMode[] = ['cite', 'solve', 'write']; // Define modes for iteration

export function ChatInput({
  // Removed selectedProvider prop
  onSendMessage,
  onAttachFile, // Kept onAttachFile prop
  placeholder = "Ask a question about your sources...",
  isLoading = false,
  className,
  // Destructure AI Mode props
  selectedAIMode,
  onSelectAIMode,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  // Removed apiKey state
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!message.trim() || isLoading) return;

    onSendMessage(message);
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea as content grows
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Removed handleApiKeyChange function
  // Removed selectedProviderConfig logic

  return (
    <div className={`flex flex-col border-t bg-background ${className}`}>
      {/* Mode Selector Row */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-1">
        <span className="text-sm font-medium text-muted-foreground">Mode:</span>
        {aiModes.map((mode) => (
          <Button
            key={mode}
            variant={selectedAIMode === mode ? "secondary" : "ghost"} // Highlight selected
            size="sm"
            className={cn(
              "capitalize h-7 px-2", // Adjust padding and height
              selectedAIMode === mode ? "font-semibold" : ""
            )}
            onClick={() => onSelectAIMode(mode)}
            disabled={isLoading}
          >
            {mode}
          </Button>
        ))}
      </div>

      {/* Input Row */}
      <div className="relative flex items-center p-4 pt-1"> {/* Adjusted padding */}
        {onAttachFile && ( // Conditionally render attach button
          <Button variant="ghost" size="icon" className="mr-2" onClick={onAttachFile}>
            <Paperclip className="h-4 w-4" />
          <span className="sr-only">Attach file</span>
        </Button>
      )}
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
      className="min-h-[60px] max-h-[200px] pr-10 resize-none flex-1"
    />
    <Button
      variant="ghost"
      size="icon"
      className="absolute right-6 bottom-5 h-8 w-8" // Keep button position relative to textarea row
      disabled={!message.trim() || isLoading}
      onClick={handleSubmit}
    >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      <span className="sr-only">{isLoading ? "Sending..." : "Send message"}</span>
    </Button>
    </div>
  </div>
  );
}
