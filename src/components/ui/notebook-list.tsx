import { Notebook } from "@/types/types";
import { NotebookCard } from "@/components/ui/notebook-card";
import { Grid, List, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NotebookListProps {
  notebooks: Notebook[];
  className?: string;
  onOpenCreateDialog: () => void; // Add the new prop
  onRename: (id: string, newTitle: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}

export function NotebookList({ 
  notebooks,
  className, 
  onOpenCreateDialog, // Destructure the new prop
  onRename, 
  onDuplicate, 
  onDelete,
  onReset
}: NotebookListProps) {
  // Always show 4 more empty notebooks than the current count, max total of 12
  const NUMBER_OF_NOTEBOOKS_TO_DISPLAY = Math.min(12, notebooks.length + 4);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Removed internal notebooks state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeNotebook, setActiveNotebook] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Handlers to manage dialog visibility
  const handleRenameRequest = useCallback((id: string, currentTitle: string) => {
    setActiveNotebook({ id, title: currentTitle });
    setNewTitle(currentTitle);
    setIsRenameDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    const notebook = notebooks.find(n => n.id === id); // Find notebook from props
    if (!notebook) return;
    
    setActiveNotebook({ id, title: notebook.title });
    setIsDeleteDialogOpen(true);
  }, [notebooks]); // Depend on notebooks prop to find title

  // Confirmation handlers call the props passed from the parent
  const confirmRename = useCallback(() => {
    if (!activeNotebook || !newTitle.trim()) return;
    onRename(activeNotebook.id, newTitle.trim()); // Call parent handler
    setIsRenameDialogOpen(false);
    setActiveNotebook(null);
    setNewTitle('');
  }, [activeNotebook, newTitle, onRename]);

  const confirmDelete = useCallback(() => {
    if (!activeNotebook) return;
    onDelete(activeNotebook.id); // Call parent handler
    setIsDeleteDialogOpen(false);
    setActiveNotebook(null);
  }, [activeNotebook, onDelete]);

  // Calculate placeholders based on the notebooks prop
  const numberOfPlaceholders = Math.max(0, NUMBER_OF_NOTEBOOKS_TO_DISPLAY - notebooks.length);
  const placeholderNotebooks = Array.from({ length: numberOfPlaceholders }, (_, index) => ({
    id: `placeholder-${index}`,
    title: "Empty Slot",
    dateCreated: new Date(),
    dateModified: new Date(),
    description: "This slot is empty",
    sources: [],
  }));

  // Combine notebooks from props with placeholders
  const allNotebooks = [...notebooks, ...placeholderNotebooks];

  return (
    <div className={className}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">My Collection</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              className="text-destructive hover:text-destructive"
              title="Reset all notebooks"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Reset all notebooks</span>
            </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(viewMode === 'grid' && "bg-secondary")}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(viewMode === 'list' && "bg-secondary")}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allNotebooks.slice(0, NUMBER_OF_NOTEBOOKS_TO_DISPLAY).map((notebook, index) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              isPlaceholder={notebook.id.startsWith('placeholder-')}
              isFirstPlaceholder={index === notebooks.length && notebook.id.startsWith('placeholder-')}
              onOpenCreateDialog={onOpenCreateDialog} // Pass down the prop
              // Pass down the appropriate handlers
              onRename={handleRenameRequest}
              onDuplicate={onDuplicate}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {allNotebooks.slice(0, NUMBER_OF_NOTEBOOKS_TO_DISPLAY).map((notebook, index) => (
            <NotebookCard
              key={notebook.id}
              notebook={notebook}
              className="flex flex-col md:flex-row md:items-center p-4"
              isPlaceholder={notebook.id.startsWith('placeholder-')}
              isFirstPlaceholder={index === notebooks.length && notebook.id.startsWith('placeholder-')}
              onOpenCreateDialog={onOpenCreateDialog} // Pass down the prop
              // Pass down the appropriate handlers (Corrected for list view)
              onRename={handleRenameRequest}
              onDuplicate={onDuplicate}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Dialogs remain the same, but confirm actions call props */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogTitle>Rename Notebook</DialogTitle>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!newTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notebook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{activeNotebook?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
