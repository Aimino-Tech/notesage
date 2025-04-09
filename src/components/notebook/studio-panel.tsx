// Removed useState, useRef, useEffect, useToast, ScrollArea, Input, MoreVertical, Loader2, DropdownMenu*, Card*, formatDistanceToNow
import { Note, GenerationType, AIModel } from "@/types/types";
import { Button } from "@/components/ui/button";
import { 
  Plus, // Keep Plus for Add button
  Settings, // Keep Settings icon
} from "lucide-react";
import { GenerateButtons } from "./generate-buttons"; 
import { NoteList } from "./note-list"; // Import NoteList

export interface StudioPanelProps {
  notes: Note[];
  onAddNote: (noteContent: string, noteTitle: string) => void;
  onNoteClick: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onDownloadNote: (note: Note) => void;
  onGenerate: (type: GenerationType) => void;
  isGeneratingContent?: boolean;
  className?: string;
  selectedModel?: AIModel | null;
  hasValidApiKey?: boolean;
}

export function StudioPanel({ // Restore component definition
  notes,
  onAddNote,
  onNoteClick,
  onDeleteNote,
  onRenameNote,
  onDownloadNote,
  onGenerate,
  isGeneratingContent = false,
  className,
  selectedModel = null,
  hasValidApiKey = false,
}: StudioPanelProps) {
  // Removed state, ref, useEffect, and handlers (moved to NoteList)

  // Wrapper for onAddNote to match NoteList's simplified prop
  const handleAddNoteTrigger = () => {
    onAddNote("New Note", "New Note"); // Provide default title/content
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg">Studio</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>

        {/* Directly render the "notes" content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Use the new GenerateButtons component */}
          <GenerateButtons 
            onGenerate={onGenerate}
            isGeneratingContent={isGeneratingContent}
            selectedModel={selectedModel}
            hasValidApiKey={hasValidApiKey}
          />

          {/* Use the new NoteList component */}
          <NoteList
            notes={notes}
            onAddNote={handleAddNoteTrigger} // Use the wrapper
            onNoteClick={onNoteClick}
            onDeleteNote={onDeleteNote}
            onRenameNote={onRenameNote}
            onDownloadNote={onDownloadNote}
          />
        </div>
      {/* </Tabs> */} {/* Removed closing Tabs tag */}
    </div>
  );
}
