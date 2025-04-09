import { useCallback } from "react";
// Import full types instead of minimal definitions
import { Note, Source, ChatMessage } from "@/types/types";
import { useToast } from "@/hooks/use-toast";

// Minimal definitions removed


export interface UseNoteActionsProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setViewingNote: React.Dispatch<React.SetStateAction<Note | null>>;
  // Need sources and messages for saving context
  sources: Source[];
  messages: ChatMessage[];
  saveNotebookToLocalStorage: (updatedSources: Source[], updatedMessages: ChatMessage[], updatedNotes: Note[]) => void;
}

export const useNoteActions = ({
  notes,
  setNotes,
  setViewingNote,
  sources, // Receive sources for saving
  messages, // Receive messages for saving
  saveNotebookToLocalStorage,
}: UseNoteActionsProps) => {
  const { toast } = useToast();

  const handleAddNote = useCallback((noteContent: string, noteTitle: string = "Untitled Note") => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: noteTitle || "Untitled Note", // Ensure title is not empty
      content: noteContent,
      dateCreated: new Date(),
      dateModified: new Date(),
      isLoading: false, // Notes added manually are not loading
    };

    setNotes(prevNotes => {
      const updatedNotes = [newNote, ...prevNotes];
      saveNotebookToLocalStorage(sources, messages, updatedNotes);
      return updatedNotes;
    });

    toast({
      title: "Note Added",
      description: `Note "${newNote.title}" has been created.`,
    });
  }, [setNotes, saveNotebookToLocalStorage, sources, messages, toast]);

  const handleNoteClick = useCallback((note: Note) => {
    setViewingNote(note); // Set the note to be viewed in the parent component
  }, [setViewingNote]);

  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes(prevNotes => {
      const updatedNotes = prevNotes.filter(note => note.id !== noteId);
      saveNotebookToLocalStorage(sources, messages, updatedNotes);
      return updatedNotes;
    });
    toast({
      title: "Note Deleted",
      description: "The note has been removed.",
    });
  }, [setNotes, saveNotebookToLocalStorage, sources, messages, toast]);

  const handleRenameNote = useCallback((noteId: string, newTitle: string) => {
    setNotes(prevNotes => {
      const updatedNotes = prevNotes.map(note =>
        note.id === noteId ? { ...note, title: newTitle, dateModified: new Date() } : note
      );
      saveNotebookToLocalStorage(sources, messages, updatedNotes);
      return updatedNotes;
    });
    toast({
      title: "Note Renamed",
      description: `Note renamed to "${newTitle}".`,
    });
  }, [setNotes, saveNotebookToLocalStorage, sources, messages, toast]);

  const handleDownloadNote = useCallback((note: Note) => {
    try {
      // Create a blob from the note content (assuming Markdown or plain text)
      const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Ensure filename has .md extension
      const filename = note.title.endsWith('.md') ? note.title : `${note.title}.md`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `"${filename}" is being downloaded.`,
      });
    } catch (error) {
      console.error("Error preparing note download:", error);
      toast({
        title: "Download Failed",
        description: "Could not prepare the note for download.",
        variant: "destructive",
      });
    }
  }, [toast]);


  return {
    handleAddNote,
    handleNoteClick,
    handleDeleteNote,
    handleRenameNote,
    handleDownloadNote,
  };
};
