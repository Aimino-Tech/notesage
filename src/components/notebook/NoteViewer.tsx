import React from 'react';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm plugin
import { Note } from '@/types/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteViewerProps {
  note: Note;
  onClose: () => void;
  className?: string;
}

export function NoteViewer({ note, onClose, className }: NoteViewerProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Studio</span>
          </Button>
          <h2 className="font-semibold text-lg truncate" title={note.title}>
            {note.title}
          </h2>
        </div>
        {/* Add any note-specific actions here if needed in the future */}
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1 p-4">
        {/* Wrap ReactMarkdown in a div for styling */}
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]} // Enable GitHub Flavored Markdown
          >
            {note.content || "*No content available.*"}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  );
}
