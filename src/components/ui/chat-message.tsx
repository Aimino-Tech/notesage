
import { ChatMessage as ChatMessageType, Citation } from "@/types/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { MessageSquare, User, Link } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

export function ChatMessage({ message, onCitationClick, className }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [showTimestamp, setShowTimestamp] = useState(false);

  // Splits content into regular text and citations
  const renderContentWithCitations = (content: string, citations: Citation[] = []) => {
    if (!citations.length) return content;

    const parts = [];
    let lastIndex = 0;
    // Updated regex to find [CITATION:N] placeholders
    const citationRegex = /\[CITATION:(\d+)\]/g;
    let match;

    while ((match = citationRegex.exec(content)) !== null) {
      // Extract the index N from the placeholder
      const citationIndex = parseInt(match[1], 10) - 1; // 0-based index
      const citation = citations[citationIndex];

      if (citation && citation.pageNumber !== undefined) { // Ensure citation exists and has page number
      // Add text before citation placeholder
      if (match.index > lastIndex) {
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} remarkPlugins={[remarkGfm]}>
            {content.substring(lastIndex, match.index)}
          </ReactMarkdown>
        );
      }

      // Add clickable citation button
        parts.push(
          <TooltipProvider key={citation.id}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="px-1 h-auto font-medium text-primary hover:text-primary/80"
                  // Pass the full citation object to the handler
                  onClick={() => onCitationClick?.(citation)}
                >
                  <Link className="h-3 w-3 mr-0.5" />
                  {/* Display citation index + 1 for user */}
                  [{citationIndex + 1}]
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                {/* Show quote and page number in tooltip */}
                <p className="text-xs">Page {citation.pageNumber}: {citation.text}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

        lastIndex = match.index + match[0].length;
      } else {
      // If citation data is missing or invalid, render the text before and the placeholder itself using Markdown
      if (match.index > lastIndex) {
         parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} remarkPlugins={[remarkGfm]}>
            {content.substring(lastIndex, match.index)}
          </ReactMarkdown>
        );
      }
      parts.push(
        <ReactMarkdown key={`placeholder-${match.index}`} remarkPlugins={[remarkGfm]}>
          {match[0]}
        </ReactMarkdown>
      );
      lastIndex = match.index + match[0].length;
      console.warn(`Could not find valid citation data for index ${citationIndex + 1}`);
      }
    }

    // Add any remaining text after the last citation
    if (lastIndex < content.length) {
      parts.push(
        <ReactMarkdown key={`text-${lastIndex}`} remarkPlugins={[remarkGfm]}>
          {content.substring(lastIndex)}
        </ReactMarkdown>
      );
    }

    // If parts were generated, return them, otherwise render the whole content as Markdown
    return <>{parts.length > 0 ? parts : <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>}</>;
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg transition-all",
        isUser 
          ? "bg-accent justify-end" // Changed from bg-secondary to bg-accent
          : "bg-card shadow-sm border justify-start",
        className
      )}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <div className={cn("p-2 rounded-full", isUser ? "order-last bg-primary" : "bg-notebook-100")}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <MessageSquare className="h-4 w-4 text-notebook-600" />
        )}
      </div>
      
      <div className={cn("flex-1 max-w-3xl", isUser && "text-right")}>
        {/* Removed the outer prose div, ReactMarkdown handles styling */}
        {message.citations?.length 
          ? renderContentWithCitations(message.content, message.citations)
          : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> // Removed className prop
        }
        
        {showTimestamp && (
          <div className="mt-2 text-xs text-muted-foreground">
            {format(message.timestamp, 'HH:mm · d MMM yyyy')}
          </div>
        )}
      </div>
    </div>
  );
}
