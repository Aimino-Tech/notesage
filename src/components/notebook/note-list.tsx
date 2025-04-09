import { useState, useRef, useEffect } from "react";
import { Note } from "@/types/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus,
  MoreVertical,
  Loader2 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface NoteListProps {
  notes: Note[];
  onAddNote: () => void; // Simplified: just trigger add, StudioPanel handles content/title
  onNoteClick: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onDownloadNote: (note: Note) => void;
}

export function NoteList({
  notes,
  onAddNote,
  onNoteClick,
  onDeleteNote,
  onRenameNote,
  onDownloadNote,
}: NoteListProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNoteId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNoteId]);

  const handleStartRename = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
  };

  const handleCancelRename = () => {
    setEditingNoteId(null);
    setEditingTitle("");
  };

  const handleConfirmRename = () => {
    if (editingNoteId && editingTitle.trim() !== "") {
      onRenameNote(editingNoteId, editingTitle.trim());
    }
    handleCancelRename();
  };

  return (
    <>
      <div className="px-4 flex justify-between items-center mt-4">
        <h3 className="font-medium">Saved Notes</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={onAddNote} // Use the passed handler
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add note</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {notes.length > 0 ? (
          <div className="p-4 space-y-4">
            {notes.map((note) => {
              const isEditing = editingNoteId === note.id;
              return (
              <Card 
                key={note.id} 
                className={`hover:shadow-md transition-shadow ${isEditing ? 'ring-2 ring-primary' : 'cursor-pointer'}`} 
                onClick={() => !isEditing && onNoteClick(note)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    {isEditing ? (
                      <Input
                        ref={inputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleConfirmRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-base h-8 flex-1"
                      />
                    ) : (
                      <CardTitle className="text-base flex-1 break-words">{note.title}</CardTitle>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex-shrink-0" 
                          onClick={(e) => e.stopPropagation()}
                          disabled={isEditing}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(note);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadNote(note);
                          }}
                        >
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id); 
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {note.isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                  )}
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  {formatDistanceToNow(note.dateModified, { addSuffix: true })}
                </CardFooter>
              </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-medium">No notes available</h3>
              <p className="text-sm text-muted-foreground">
                To create a new note, save a chat message or click the plus icon.
              </p>
            </div>
          </div>
        )}
      </ScrollArea>
    </>
  );
}
