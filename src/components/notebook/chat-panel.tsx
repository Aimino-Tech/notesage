import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import { ChatMessage as ChatMessageType, AIModel, Citation, Source, AIMode } from "@/types/types"; // Added AIMode
import { ChatMessage } from "@/components/ui/chat-message";
import { ChatInput } from "@/components/ui/chat-input";
import { ModelSelector } from "@/components/ui/model-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
// Removed Select and Tooltip imports
import { Sparkles, Maximize2, Minimize2, Loader2, HelpCircle, FileText, CalendarClock } from "lucide-react"; // Added icons
// Removed Settings import as it's no longer used for the separate sheet trigger
// Removed Sheet imports as the sheet is being removed
// Removed AIModelSettings import as the component is being removed

// Define ViewMode type locally or import if defined globally
type ViewMode = 'normal' | 'chatMaximized' | 'leftPanelMaximized';

interface ChatPanelProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  availableModels: AIModel[];
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  onCitationClick?: (citation: Citation) => void;
  sources: Source[];
  isGenerating?: boolean; // Changed from isLoading
  className?: string;
  onGenerateWorkAid: () => void;
  // Add viewMode and setViewMode props
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  // Add AI Mode props
  selectedAIMode: AIMode;
  onSelectAIMode: (mode: AIMode) => void;
  // Add selected source IDs prop
  selectedSourceIds: Set<string>;
  // Add handlers for new generation types
  onGenerateFAQ: () => void;
  onGenerateBriefing: () => void;
  onGenerateTimeline: () => void;
  onClearHistory: () => void;
}


export function ChatPanel({
  onClearHistory,
  messages,
  onSendMessage,
  availableModels,
  selectedModel,
  onSelectModel,
  onCitationClick,
  sources,
  isGenerating = false, // Changed from isLoading
  className,
  onGenerateWorkAid,
  // Destructure viewMode and setViewMode
  viewMode,
  setViewMode,
  // Destructure AI Mode props
  selectedAIMode,
  onSelectAIMode,
  // Destructure selected source IDs
  selectedSourceIds,
  // Destructure new handlers
  onGenerateFAQ,
  onGenerateBriefing,
  onGenerateTimeline,
}: ChatPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  // Removed isModelSettingsOpen state as the sheet is being removed

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (shouldScrollToBottom && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, shouldScrollToBottom]);

  // Handle scroll events to determine if we should auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // If we're close to the bottom, enable auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  };

  const handleAttachFile = () => {
    // This would normally open a file picker
    console.log("Attach file clicked");
  };

  const getEmptyStateMessage = () => {
    if (sources.length === 0) {
      return {
        title: "Add sources to begin",
        description: "Upload documents, images, or audio files to ask questions and get answers.",
      };
    } else {
      return {
        title: "Ask a question about your sources",
        description: "The AI will answer your questions based on the uploaded sources and provide citations.",
      };
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between bg-background">
        <h2 className="font-semibold text-lg">Chat</h2>
        <div className="flex items-center gap-2">
          <ModelSelector
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
          />
          {/* AI Mode Selector Removed */}
          {/* Generate Work Aid button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onGenerateWorkAid}
            disabled={isGenerating || sources.length === 0} // Use isGenerating
            title="Generate Work Aid"
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
          {/* Clear Chat History button */}

          {/* Maximize/Minimize button for Chat Panel */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'chatMaximized' ? 'normal' : 'chatMaximized')}
            title={viewMode === 'chatMaximized' ? "Minimize Panel" : "Maximize Panel"}
            className="h-8 w-8"
            aria-label={viewMode === 'chatMaximized' ? "Minimize Panel" : "Maximize Panel"}
          >
            {viewMode === 'chatMaximized' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {/* Generate Timeline button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onGenerateTimeline}
            disabled={isGenerating || sources.length === 0}
            title="Generate Timeline"
          >
            <CalendarClock className="h-4 w-4" />
          </Button>
          {/* Clear Chat History button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearHistory}
            title="Clear Chat History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eraser h-4 w-4"><path d="M4 20v-7.5a2.5 2.5 0 0 1 5 0V20h2"></path><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M16 12l-7-7"></path></svg>
          </Button>
          {/* Maximize/Minimize button for Chat Panel */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'chatMaximized' ? 'normal' : 'chatMaximized')}
            title={viewMode === 'chatMaximized' ? "Minimize Panel" : "Maximize Panel"}
            className="h-8 w-8"
            aria-label={viewMode === 'chatMaximized' ? "Minimize Panel" : "Maximize Panel"}
          >
            {viewMode === 'chatMaximized' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef} onScroll={handleScroll}>
        <div className="py-4">
        {messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCitationClick={onCitationClick}
              />
            ))}
            {isGenerating && ( // Use isGenerating for the loader as well
              <div className="flex justify-start pl-4 pt-2"> {/* Adjusted padding */}
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4"> 
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-medium">{getEmptyStateMessage().title}</h3>
              <p className="text-sm text-muted-foreground">
                {getEmptyStateMessage().description}
              </p>
            </div>
          </div>
        )}
        </div>
      </ScrollArea>

      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t bg-background">
        <ChatInput
          onSendMessage={onSendMessage}
          onAttachFile={handleAttachFile}
          isLoading={isGenerating} // Pass isGenerating to ChatInput as isLoading
          // Pass AI Mode props down to ChatInput
          selectedAIMode={selectedAIMode}
          onSelectAIMode={onSelectAIMode}
        />
      </div>
    </div>
  );
}
