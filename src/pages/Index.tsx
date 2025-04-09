import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react"; // Removed Trash2 as it's unused here
import { NotebookList } from "@/components/ui/notebook-list";
// Removed import { mockNotebooks } from "@/data/mockData";
import { Notebook, Source } from "@/types/types"; // Added Source type import
import { CreateNotebookDialog } from "@/components/ui/create-notebook-dialog";

const STORAGE_KEY = 'notebooks';

// Helper type for parsed source data
type ParsedSource = Omit<Source, 'dateAdded'> & { dateAdded: string };
// Helper type for parsed notebook data
type ParsedNotebook = Omit<Notebook, 'dateCreated' | 'dateModified' | 'sources'> & {
  dateCreated: string;
  dateModified: string;
  sources: ParsedSource[];
};

const Index = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false); // State for dialog visibility
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    const storedNotebooks = localStorage.getItem(STORAGE_KEY);
    let parsedNotebooks: Notebook[] | null = null;
    if (storedNotebooks) {
      try {
        const parsed: ParsedNotebook[] = JSON.parse(storedNotebooks);
        // Convert string dates back to Date objects
        parsedNotebooks = parsed.map((notebook) => ({
          ...notebook,
          dateCreated: new Date(notebook.dateCreated),
          dateModified: new Date(notebook.dateModified),
          sources: notebook.sources.map((source) => ({
            ...source,
            dateAdded: new Date(source.dateAdded)
          }))
        }));
      } catch (error) {
        console.error("Failed to parse notebooks from localStorage", error);
        // Fallback to mock data if parsing fails
      }
    }
    // Use empty array as fallback instead of mockNotebooks
    return parsedNotebooks || []; 
  });

  useEffect(() => {
    // Save notebooks to localStorage whenever the state changes
    if (notebooks.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notebooks));
    } else {
      // If notebooks array is empty, remove the item from storage
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [notebooks]);

  // Define handlers within Index to manage the state
  const handleRename = useCallback((id: string, newTitle: string) => {
    setNotebooks(prev => prev.map(notebook =>
      notebook.id === id
        ? { ...notebook, title: newTitle.trim(), dateModified: new Date() }
        : notebook
    ));
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    setNotebooks(prev => {
      const notebookToDuplicate = prev.find(n => n.id === id);
      if (!notebookToDuplicate) return prev;

      const duplicate: Notebook = {
        ...notebookToDuplicate,
        id: `${id}-copy-${Date.now()}`, // Ensure unique ID
        title: `${notebookToDuplicate.title} (Copy)`,
        dateCreated: new Date(),
        dateModified: new Date()
      };
      // Add the duplicate to the list
      return [...prev, duplicate];
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNotebooks(prev => prev.filter(notebook => notebook.id !== id));
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    // Reset to an empty array
    setNotebooks([]); 
  }, []);

  // Callback to open the dialog
  const handleOpenCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);


  // Sort notebooks by creation date, newest first
  const sortedNotebooks = [...notebooks].sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime());

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      <header className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-notebook-100 dark:bg-notebook-900 mr-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-notebook-600 dark:text-notebook-400" />
                <path d="M9 7H7V17H17V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-notebook-600 dark:text-notebook-400" />
                <path d="M9 15H13L17 11L15 9L11 13L9 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-notebook-600 dark:text-notebook-400" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-notebook-600 bg-clip-text text-transparent">
            NoteSage
            </h1>
          </div>

          {/* Pass state and trigger to the dialog */}
          <CreateNotebookDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            trigger={
              <Button className="gap-2" onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4" />
                Create New
              </Button>
            }
          />
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl font-bold text-center mb-2 animate-fade-in">
            Welcome to NoteSage
          </h2>
          <p className="text-xl text-center text-muted-foreground animate-fade-in [animation-delay:200ms]">
            Chat with your documents and quickly find the information you need.
          </p>
        </div>

        <div className="animate-fade-in [animation-delay:400ms]">
          {/* Pass the handlers down to NotebookList, including the new one */}
          <NotebookList
            notebooks={sortedNotebooks} // Use the sorted list
            onOpenCreateDialog={handleOpenCreateDialog} // Pass the handler
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onReset={handleReset}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
