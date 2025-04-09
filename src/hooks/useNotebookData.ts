import { useState, useEffect, useCallback } from "react";
import { extractTextFromPdf } from '@/lib/pdf-worker';
import { AIModel, ChatMessage, Note, Source, Notebook, AIMode, TodoItem } from "@/types/types"; // Added TodoItem import
import { apiProviders, sponsoredModelId } from "@/config"; // Import config values
import { VFSState, getFileSystemStateVFS } from "@/lib/vfs"; // Import VFSState directly from vfs

// Define a basic Notebook type if not already defined in types.ts
// interface Notebook {
//   id: string;
//   title: string;
//   sources: Source[];
//   messages: ChatMessage[];
//   notes: Note[];
//   dateCreated: Date;
//   dateModified: Date;
// }

export const useNotebookData = (id: string | undefined) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  // Find the default model (Aimino sponsored) from config
  const defaultModel = apiProviders
    .flatMap(provider => provider.models)
    .find(model => model.id === sponsoredModelId) || apiProviders[0]?.models[0] || null; // Fallback logic
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(defaultModel); // Initialize with the found default model
  // Add state for selected AI Mode, default to 'cite'
  const [selectedAIMode, setSelectedAIMode] = useState<AIMode>('cite');
  const [isLoading, setIsLoading] = useState(false);
  // Add state for workspace data - Changed todoMarkdown to todos
  const [todos, setTodos] = useState<TodoItem[]>([]); // Changed state variable and type
  const [vfsState, setVfsState] = useState<VFSState>({ '/': { type: 'folder', children: {} } });
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set()); // Add state for selected source IDs


  useEffect(() => {
    const loadData = async () => {
      if (id && id !== "create") {
        const existingNotebooksStr = localStorage.getItem('notebooks');
        if (existingNotebooksStr) {
          // Helper function to parse dates recursively
          const parseDates = (obj: unknown): unknown => { // Changed return type to unknown
            if (!obj || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return obj; // Already a Date object

            if (Array.isArray(obj)) {
              return obj.map(parseDates);
            }

            const newObj: { [key: string]: unknown } = {}; // Use unknown for values
            for (const key in obj) {
              // Type guard for key access on unknown
              if (typeof obj === 'object' && obj !== null && Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = (obj as Record<string, unknown>)[key]; // Access value safely
                if (typeof value === 'string') {
                  // Attempt to parse ISO date strings
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      newObj[key] = date;
                      continue; // Skip further processing for this key
                    }
                  }
                }
                // Recursively parse nested objects/arrays
                newObj[key] = parseDates(value);
              }
            }
            return newObj;
          };


          const existingNotebooks: Notebook[] = parseDates(JSON.parse(existingNotebooksStr)) as Notebook[]; // Assert type
          const foundNotebook = existingNotebooks.find((nb) => nb.id === id);

          if (foundNotebook) {
            setNotebook(foundNotebook);
            const loadedSources = foundNotebook.sources || [];

            // Load content for PDF sources (Keep existing PDF logic)
            for (const source of loadedSources) {
              if (source.type === 'pdf' && source.fileDataUrl) {
                try {
                  const byteString = atob(source.fileDataUrl.split(',')[1]);
                  const ab = new ArrayBuffer(byteString.length);
                  const ia = new Uint8Array(ab);
                  for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                  }
                  source.content = await extractTextFromPdf(ab);
                } catch (error) {
                  console.error('Error extracting PDF text:', error);
                }
              }
            }

            setSources(loadedSources);
            setMessages(foundNotebook.messages || []);
            setNotes(foundNotebook.notes || []);
            // Load workspace data if available - Changed to load todos
            setTodos(foundNotebook.workspace?.todos || []); // Load todos array
            // Load VFS state from localStorage directly using notebook ID
            setVfsState(getFileSystemStateVFS(id));
          } else {
            // Notebook ID not found in the existing list - Test expects "Notebook not found"
            setNotebook({
              id: id,
              title: "Notebook not found",
              sources: [],
              messages: [],
              notes: [],
              dateCreated: new Date(),
              dateModified: new Date(),
            });
            setSources([]);
            setMessages([]);
            setNotes([]);
            setTodos([]); // Reset workspace state
            setVfsState({ '/': { type: 'folder', children: {} } }); // Reset VFS state
          }
        } else {
          // No 'notebooks' key found in localStorage - Test expects "No notebooks found"
          setNotebook({
            id: id,
            title: "No notebooks found",
            sources: [],
            messages: [],
            notes: [],
            dateCreated: new Date(),
            dateModified: new Date(),
          });
            setSources([]);
            setMessages([]);
            setNotes([]);
            setTodos([]); // Reset workspace state
            setVfsState({ '/': { type: 'folder', children: {} } }); // Reset VFS state
          }
        } else if (id === "create") {
        setNotebook({
          id: 'create',
          title: "New Notebook",
          sources: [],
          messages: [],
          notes: [],
          dateCreated: new Date(),
          dateModified: new Date(),
        });
        setSources([]);
        setMessages([]);
        setNotes([]);
        setTodos([]); // Reset workspace state for new notebook
        setVfsState({ '/': { type: 'folder', children: {} } }); // Reset VFS state for new notebook
      }
    };

    loadData();
  }, [id]);

  // Update save function signature to include workspace data
  // Update save function signature to include workspace data - Changed updatedTodoMarkdown to updatedTodos
  const saveNotebookToLocalStorage = useCallback((
    updatedSources: Source[],
    updatedMessages: ChatMessage[],
    updatedNotes: Note[],
    updatedTodos?: TodoItem[], // Changed parameter name and type
    updatedVfsState?: VFSState // Optional: Only save if provided (VFS saves itself)
  ) => {
    if (!id || id === "create" || !notebook) return;

    const existingNotebooksStr = localStorage.getItem('notebooks');
     let existingNotebooks: Notebook[] = existingNotebooksStr ? JSON.parse(existingNotebooksStr) : [];
      // Use parseDates helper if available and needed for loaded notebooks
      try {
       const parseDates = (obj: unknown): unknown => { // Changed return type to unknown
         // ... (parseDates implementation as above) ...
         if (!obj || typeof obj !== 'object') return obj;
         if (obj instanceof Date) return obj;
         if (Array.isArray(obj)) return obj.map(parseDates);
         const newObj: { [key: string]: unknown } = {}; // Use unknown for values
         for (const key in obj) {
           // Type guard for key access on unknown
           if (typeof obj === 'object' && obj !== null && Object.prototype.hasOwnProperty.call(obj, key)) {
             const value = (obj as Record<string, unknown>)[key]; // Access value safely
             if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
               const date = new Date(value);
               if (!isNaN(date.getTime())) { newObj[key] = date; continue; }
             }
             newObj[key] = parseDates(value);
           }
         }
         return newObj;
       };
       existingNotebooks = parseDates(existingNotebooks) as Notebook[]; // Assert type
     } catch (e) { console.error("Error parsing dates from localStorage", e); }


    const notebookIndex = existingNotebooks.findIndex((nb) => nb.id === id);

    // Get current data, ensuring workspace object exists
    const currentNotebookData = notebookIndex > -1 ? existingNotebooks[notebookIndex] : { ...notebook, workspace: notebook.workspace || {} };
    if (!currentNotebookData.workspace) {
        currentNotebookData.workspace = {}; // Initialize workspace if it doesn't exist
    }


    const updatedNotebook: Notebook = {
      ...currentNotebookData,
      id: id, // Ensure ID is set correctly
      sources: updatedSources,
      messages: updatedMessages,
      notes: updatedNotes,
      workspace: {
        ...currentNotebookData.workspace,
        // Only update todos if it was explicitly passed
        ...(updatedTodos !== undefined && { todos: updatedTodos }), // Changed property name
        // VFS state is saved directly by vfs.ts, but we might store a reference or metadata if needed
        // For now, we don't store vfsState itself in the main notebook object to avoid duplication/sync issues
        // vfsState: updatedVfsState || currentNotebookData.workspace?.vfsState,
      },
      dateModified: new Date(),
    };

    if (notebookIndex > -1) {
      existingNotebooks[notebookIndex] = updatedNotebook;
    } else {
      // If notebook wasn't found, add the new/updated version
      // Ensure the notebook being added has the correct structure
      existingNotebooks.push({
          ...notebook, // Spread existing base notebook properties
          ...updatedNotebook, // Spread updated properties (sources, messages, notes, workspace, dates)
          id: id, // Ensure ID is correct
      });
       console.warn("Notebook not found in existing list. Adding as new.");
    }

    localStorage.setItem('notebooks', JSON.stringify(existingNotebooks));
    console.log("Notebook saved to localStorage:", updatedNotebook);

    // Update local state
    setNotebook(updatedNotebook);
    setSources(updatedSources);
    setMessages(updatedMessages);
    setNotes(updatedNotes);
    // Update local workspace state only if it was passed
    if (updatedTodos !== undefined) {
        setTodos(updatedTodos); // Update local todos state
    }
    // VFS state is managed by vfs.ts and refreshed via WorkspacePanel's useEffect/refreshVfsState

  }, [id, notebook]); // Removed vfsState from dependencies as it's managed separately

  return {
    notebook, // The core notebook data (title, desc, dates etc.)
    sources, // Array of sources
    setSources, // Setter for sources
    messages, // Array of chat messages
    setMessages, // Setter for messages
    notes, // Array of notes
    setNotes, // Setter for notes
    selectedModel, // Currently selected AI model (can be null initially)
    setSelectedModel, // Setter for model
    selectedAIMode, // Current AI mode ('cite', 'solve', 'write')
    setSelectedAIMode, // Setter for AI mode
    isLoading, // Loading state flag
    setIsLoading, // Setter for loading state
    saveNotebookToLocalStorage, // Function to save notebook data
    // Add workspace state and setters to the return object - Changed todoMarkdown to todos
    todos, // Return todos array
    setTodos, // Return setter for todos
    vfsState,
    setVfsState,
    selectedSourceIds, // Return selected IDs
    setSelectedSourceIds, // Return setter for selected IDs
  };
};
