import React from 'react';
import { TreeView } from '@/components/ui/tree-view'; // Remove TreeItem import
import { Folder, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// TODO: Define actual types for file/folder structure
export interface FileNode { // Added export keyword
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
}

// TODO: Replace with actual data fetching/state management
const mockFileSystem: FileNode[] = [
  {
    id: 'folder-1',
    name: 'Generated Documents',
    type: 'folder',
    children: [
      { id: 'file-1', name: 'introduction.md', type: 'file' },
      { id: 'file-2', name: 'chapter-1.md', type: 'file' },
      {
        id: 'folder-2',
        name: 'Appendices',
        type: 'folder',
        children: [
          { id: 'file-3', name: 'appendix-a.md', type: 'file' },
        ],
      },
    ],
  },
  { id: 'file-4', name: 'summary.md', type: 'file' },
]; // Keep mock data for potential fallback/testing, but don't use by default

interface FileExplorerProps {
  className?: string;
  nodes: FileNode[]; // Accept nodes as a prop
  onFileSelect: (file: FileNode) => void;
  onDeleteFile?: (file: FileNode) => void; // Added optional delete callback
}

// Removed internal renderTree function as TreeView now handles recursion

export const FileExplorer: React.FC<FileExplorerProps> = ({ className, nodes, onFileSelect, onDeleteFile }) => { // Added onDeleteFile
  return (
    <div className={cn("p-2 border rounded-md overflow-auto h-full", className)}>
       <p className="text-sm text-muted-foreground mb-2">Generated Files:</p>
       {/* Use the TreeView component directly */}
       <TreeView
         aria-label="File Explorer"
         nodes={nodes} // Pass nodes data to TreeView
         onFileSelect={onFileSelect} // Pass the callback
         onDeleteFile={onDeleteFile} // Pass the delete callback down
         className="pr-1" // Add some padding for scrollbar if needed
         // defaultExpandedItems={['folder-1']} // Optional: default expanded folders - Requires TreeView implementation detail
       />
    </div>
  );
};
