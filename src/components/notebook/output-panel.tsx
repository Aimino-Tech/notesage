import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileExplorer } from './file-explorer';
import type { FileNode } from './file-explorer';
import { readFileVFS, writeFileVFS, exportToZipVFS, deleteFileVFS, deleteAllFilesVFS, VFSState, VFSNode } from '@/lib/vfs';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EditableMarkdown } from '@/components/ui/editable-markdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- OutputPanel Component ---
export interface OutputPanelProps { // Export the interface
  notebookId: string;
  vfsState: VFSState;
  refreshVfsState: () => void;
  vfsRevision: number;
}

// Helper function used by OutputPanel
const convertVfsToNodes = (currentPath: string, children: Record<string, VFSNode>): FileNode[] => {
  return Object.entries(children).map(([name, node]) => ({
    id: `${currentPath}${name}`,
    name: name,
    type: node.type,
    children: node.type === 'folder' && node.children
      ? convertVfsToNodes(`${currentPath}${name}/`, node.children)
      : undefined,
  }));
};

export const OutputPanel: React.FC<OutputPanelProps> = ({ notebookId, vfsState, refreshVfsState, vfsRevision }) => { // Export the component
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  useEffect(() => {
    console.log("OutputPanel detected vfsState change:", vfsState);
  }, [vfsState]);

  // Use the helper function defined above
  const clonedVfsState = JSON.parse(JSON.stringify(vfsState));
  const fileExplorerNodes = clonedVfsState['/']?.children
    ? convertVfsToNodes('/', clonedVfsState['/'].children)
    : [];

  const handleFileSelect = (node: FileNode) => {
    const filePath = node.id;
    console.log("Selected file:", filePath);
    const content = readFileVFS(notebookId, filePath);
    if (content !== null) {
      setSelectedFilePath(filePath);
      setFileContent(content);
    } else {
      setSelectedFilePath(null);
      setFileContent('');
      console.error(`Could not read file: ${filePath}`);
    }
  };

  const handleSaveFileContent = (newContent: string) => {
    if (!selectedFilePath) return;
    console.log(`Saving content for ${selectedFilePath}:`, newContent);
    const result = writeFileVFS(notebookId, selectedFilePath, newContent);
    
    if (result.success) {
      setFileContent(newContent);
      refreshVfsState();
      
      // Show warning if file was split due to size
      if (result.message) {
        toast({
          title: "Large File Detected",
          description: result.message,
          duration: 6000, // Show longer since this is important
        });
      }
    } else {
      console.error(`Failed to save file: ${selectedFilePath}`);
      toast.error("Failed to save file. Please try again.");
    }
  };

  const handleExport = async () => {
    if (!notebookId) return;
    try {
      const notebookTitle = document.title || 'notebook';
      const zipFileName = `${notebookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.zip`;
      await exportToZipVFS(notebookId, zipFileName);
      toast.success("Workspace exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export workspace.");
    }
  };

  const handleDeleteFile = (node: FileNode) => {
    if (!notebookId || node.type !== 'file') return;
    console.log(`Attempting to delete file: ${node.id}`);
    const success = deleteFileVFS(notebookId, node.id);
    if (success) {
      toast.success(`File "${node.name}" deleted.`);
      if (selectedFilePath === node.id) {
        setSelectedFilePath(null);
        setFileContent('');
      }
      refreshVfsState();
    } else {
      toast.error(`Failed to delete file "${node.name}".`);
      console.error(`Failed to delete file: ${node.id}`);
    }
  };

  const confirmDeleteAllFiles = () => {
    if (!notebookId) return;
    deleteAllFilesVFS(notebookId);
    toast.success("All generated files deleted.");
    setSelectedFilePath(null);
    setFileContent('');
    refreshVfsState();
  };

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-x-2">
        <CardTitle>Workspace Files</CardTitle>
        <div className="flex items-center space-x-2">
          <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all generated files
                  in this notebook's workspace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteAllFiles} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Files
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <FileExplorer
          key={vfsRevision}
          className="h-48 flex-shrink-0"
          nodes={fileExplorerNodes}
          onFileSelect={handleFileSelect}
          onDeleteFile={handleDeleteFile}
        />
        <div className="flex-1 border rounded-md overflow-auto">
          {selectedFilePath ? (
            <EditableMarkdown
              key={selectedFilePath}
              initialValue={fileContent}
              onSave={handleSaveFileContent}
              className="h-full"
              viewClassName="p-4 h-full"
              editClassName="p-4 h-full flex flex-col"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground p-4">
              Select a file from the explorer to view or edit its content.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
