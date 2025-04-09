
import React, { useState, useRef, useEffect } from "react";
import { Source, SourceStatus } from "@/types/types"; // Added SourceStatus
import { cn } from "@/lib/utils";
import { FileText, FileImage, FileAudio, FileSpreadsheet, Link as LinkIcon, MoreVertical, Loader2, AlertTriangle } from "lucide-react"; // Added Loader2, AlertTriangle
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface SourceItemProps {
  source: Source;
  isActive?: boolean;
  onClick?: () => void;
  onRename?: (sourceId: string, newName: string) => void; // Added
  onDownload?: (source: Source) => void; // Added
  onDelete?: (sourceId: string) => void; // Added
  className?: string;
}

export function SourceItem({ 
  source, 
  isActive, 
  onClick, 
  onRename, 
  onDownload, 
  onDelete, 
  className 
}: SourceItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(source.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select text for easy replacement
    }
  }, [isEditing]);

  const handleRename = () => {
    if (editedName.trim() && editedName !== source.name && onRename) {
      onRename(source.id, editedName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedName(source.name); // Reset to original name
    setIsEditing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRename();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getSourceIcon = (type: Source['type']) => {
    switch (type) {
      case 'pdf':
      case 'docx':
      case 'txt':
      case 'md':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <FileImage className="h-4 w-4" />;
      case 'audio':
        return <FileAudio className="h-4 w-4" />;
      case 'url':
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "hover:bg-secondary",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-full bg-secondary">
          {getSourceIcon(source.type)}
        </div>
        <div className="truncate flex-1"> 
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()} // Prevent triggering outer onClick
              className="h-8 text-sm" // Adjust styling as needed
            />
          ) : (
            <div className="flex items-center gap-2"> {/* Wrap title and status indicator/date */}
              <h4 className="font-medium truncate">{source.name}</h4>
              {source.status === SourceStatus.Processing || source.isGeneratingSummary ? (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Processing...</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : source.status === SourceStatus.Error ? (
                 <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                       <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Error processing source.</p>
                      {/* Optionally show more detail from source.content if it's an error message */}
                      {source.content?.startsWith('[') && <p className="text-xs mt-1">{source.content}</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                 // Only show date if not processing or error
                 <p className="text-xs text-muted-foreground flex-shrink-0">
                   {formatDistanceToNow(source.dateAdded, { addSuffix: true, locale: de })}
                 </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Hide dropdown menu while processing or if error prevents actions */}
      {source.status !== SourceStatus.Processing && !source.isGeneratingSummary && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditedName(source.name); // Initialize edited name
                setIsEditing(true);
              }}
              disabled={isEditing || source.status === SourceStatus.Error} // Disable rename if error
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (onDownload) onDownload(source);
              }}
              disabled={source.status === SourceStatus.Error} // Disable download if error
            >
              Download
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(source.id);
              }}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
