import { useState, useEffect } from "react"; // Added useEffect
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  // DialogTrigger removed
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react"; // Removed Plus

interface CreateNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode; // Optional trigger element
}

const DEFAULT_TITLE = "My new notebook";
const DEFAULT_DESCRIPTION = "A brief description of my notebook contents.";

export function CreateNotebookDialog({ open, onOpenChange, trigger }: CreateNotebookDialogProps) {
  const navigate = useNavigate();
  // Add placeholder text to initial state
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set/Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Use functional updates to set defaults only if current state is empty/falsy
      setTitle(currentTitle => currentTitle || DEFAULT_TITLE);
      setDescription(currentDescription => currentDescription || DEFAULT_DESCRIPTION);
    } else {
      // Reset to placeholders when closing, ready for next open
      // Use a slight delay to avoid seeing the reset before the dialog closes
      const timer = setTimeout(() => {
        setTitle(DEFAULT_TITLE);
        setDescription(DEFAULT_DESCRIPTION);
        setIsSubmitting(false); // Also reset submitting state
      }, 150); // Adjust delay as needed
      // Cleanup timeout if the effect re-runs before timeout finishes
      return () => clearTimeout(timer);
    }
  }, [open]); // Rerun effect only when 'open' changes


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = title.trim() || DEFAULT_TITLE; // Use default if empty
    const finalDescription = description.trim(); // Description can be empty

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      // Create a new notebook with a random ID
      const newNotebookId = `nb-${Date.now()}`;
      const newNotebook = {
        id: newNotebookId,
        title: finalTitle, // Use potentially defaulted title
        description: finalDescription, // Use trimmed description
        dateCreated: new Date(),
        dateModified: new Date(),
        sources: [],
        messages: [],
        notes: []
      };

      // Get existing notebooks from localStorage
      const existingNotebooksStr = localStorage.getItem('notebooks');
      const existingNotebooks = existingNotebooksStr ? JSON.parse(existingNotebooksStr) : [];

      // Add new notebook to the array
      const updatedNotebooks = [...existingNotebooks, newNotebook];

      // Save updated notebooks array to localStorage
      localStorage.setItem('notebooks', JSON.stringify(updatedNotebooks));

      // Reset form and close dialog using prop
      setIsSubmitting(false);
      onOpenChange(false); // Use prop function

      // Navigate to the new notebook
      navigate(`/notebook/${newNotebookId}`);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Render trigger if provided */}
      {trigger}
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Notebook</DialogTitle>
          <DialogDescription>
            Create a new notebook to organize and analyze your documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_TITLE} // Use constant for placeholder attribute
              required
              className="glass-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={DEFAULT_DESCRIPTION} // Use constant for placeholder attribute
              className="min-h-[100px] glass-input"
            />
          </div>

          <div className="pt-4 flex justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}> {/* Use prop function */}
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting} // Allow submission even if title is only whitespace (will use default)
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Notebook
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
