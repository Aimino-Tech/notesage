import React, { useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronRight, Folder, FileText, Trash2 } from 'lucide-react'; // Added Trash2
import { cn } from '@/lib/utils';
import { FileNode } from '@/components/notebook/file-explorer'; // Import FileNode type
import { Button } from '@/components/ui/button'; // Added Button import

// --- TreeView Container ---
interface TreeViewProps extends React.HTMLAttributes<HTMLDivElement> {
  'aria-label'?: string;
  nodes: FileNode[]; // Expect nodes data directly
  onFileSelect: (file: FileNode) => void;
  onDeleteFile?: (file: FileNode) => void; // Added optional delete callback
}

export const TreeView: React.FC<TreeViewProps> = ({ nodes, onFileSelect, onDeleteFile, className, ...props }) => { // Added onDeleteFile
  return (
    <div role="tree" className={cn("space-y-0.5", className)} {...props}>
      {nodes.map((node) => (
        <RecursiveTreeItem key={node.id} node={node} onFileSelect={onFileSelect} onDeleteFile={onDeleteFile} level={0} /> // Pass onDeleteFile
      ))}
    </div>
  );
};

// --- Recursive TreeItem ---
interface RecursiveTreeItemProps {
  node: FileNode;
  onFileSelect: (file: FileNode) => void;
  level: number;
  onDeleteFile?: (file: FileNode) => void; // Added optional delete callback
}

const RecursiveTreeItem: React.FC<RecursiveTreeItemProps> = ({ node, onFileSelect, level, onDeleteFile }) => { // Added onDeleteFile
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = node.type === 'folder' && node.children && node.children.length > 0;
  const isFile = node.type === 'file';

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent file selection when clicking delete
    if (onDeleteFile) {
      onDeleteFile(node);
    }
  };

  const handleSelect = () => {
    if (isFile) {
      onFileSelect(node);
    }
  };

  const paddingLeft = `${level * 1.25}rem`; // Indentation based on level (adjust multiplier as needed)

  if (isFolder) {
    return (
      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
        <Collapsible.Trigger asChild>
          <div
            className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-muted/50"
            style={{ paddingLeft }}
            role="treeitem"
            aria-expanded={isOpen}
          >
            <ChevronRight
              className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-90')}
            />
            <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="truncate text-sm">{node.name}</span>
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content>
          {node.children?.map((childNode) => (
            <RecursiveTreeItem
              key={childNode.id}
              node={childNode}
              onFileSelect={onFileSelect}
              onDeleteFile={onDeleteFile} // Pass down delete handler
              level={level + 1}
            />
          ))}
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }

  // Render File
  return (
    <div
      className="flex items-center gap-1 p-1 rounded hover:bg-muted/50" // Removed justify-between and group
      style={{ paddingLeft: `calc(${paddingLeft} + 1rem)` }} // Indent files slightly more than folders
      role="treeitem"
      // Removed onClick={handleSelect} from the main div to avoid conflict with button
    >
      {/* Delete Button - Always Visible & on the Left */}
      {onDeleteFile && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 flex-shrink-0 mr-1" // Always visible, add right margin
          onClick={handleDelete}
          aria-label={`Delete ${node.name}`}
        >
          <Trash2 className="h-3 w-3" /> {/* Smaller icon */}
        </Button>
      )}
      {/* File Icon and Name */}
      <div
        className="flex items-center gap-2 flex-grow overflow-hidden cursor-pointer" // Added cursor-pointer here
        onClick={handleSelect} // Moved onClick here
      >
        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <span className="truncate text-sm">{node.name}</span>
      </div>
    </div>
  );
};

// --- Exporting TreeView as the main component ---
// Note: TreeItem is now internal (RecursiveTreeItem)
