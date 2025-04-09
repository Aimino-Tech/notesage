import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FileExplorer, FileNode } from '../file-explorer'; // Adjust path if needed
import { TreeView } from '@/components/ui/tree-view'; // Import TreeView to potentially mock or check props

// Mock the TreeView component to isolate FileExplorer logic
// Or, allow TreeView to render and test the interaction through it (as done below)
// vi.mock('@/components/ui/tree-view', () => ({
//   TreeView: vi.fn(({ nodes, onFileSelect }) => (
//     <div data-testid="mock-tree-view">
//       {/* Basic rendering for verification */}
//       <button onClick={() => onFileSelect(nodes[0])}>Select First Node</button>
//     </div>
//   )),
// }));

// Mock Lucide icons used by TreeView/TreeItem if necessary (if not mocking TreeView itself)
vi.mock('lucide-react', async (importOriginal) => {
  const original = await importOriginal<typeof import('lucide-react')>();
  return {
    ...original,
    Folder: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="folder-icon" {...props} />,
    FileText: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="file-icon" {...props} />,
    ChevronRight: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="chevron-right-icon" {...props} />,
    ChevronDown: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="chevron-down-icon" {...props} />,
  };
});


const mockNodes: FileNode[] = [
  {
    id: 'folder-1',
    name: 'Folder 1',
    type: 'folder',
    children: [
      { id: 'file-1', name: 'File 1.txt', type: 'file' },
    ],
  },
  { id: 'file-2', name: 'File 2.md', type: 'file' },
];

describe('FileExplorer', () => {
  it('should render the title and the TreeView component', () => {
    render(<FileExplorer nodes={mockNodes} onFileSelect={vi.fn()} />);

    expect(screen.getByText('Generated Files:')).toBeInTheDocument();
    // Check if TreeView renders the nodes (assuming TreeView works as tested separately)
    expect(screen.getByText('Folder 1')).toBeInTheDocument();
    expect(screen.getByText('File 2.md')).toBeInTheDocument();
    // Initially nested file should not be visible
    expect(screen.queryByText('File 1.txt')).not.toBeInTheDocument();
  });

  it('should pass nodes and onFileSelect callback to TreeView', async () => {
    const user = userEvent.setup();
    const handleFileSelect = vi.fn();
    render(<FileExplorer nodes={mockNodes} onFileSelect={handleFileSelect} />);

    // Expand folder to make file clickable
    const folder1 = screen.getByText('Folder 1');
    await user.click(folder1);

    // Click the file within the TreeView structure
    const file1 = screen.getByText('File 1.txt');
    await user.click(file1);

    // Verify that the callback provided to FileExplorer was called (via TreeView)
    expect(handleFileSelect).toHaveBeenCalledOnce();
    expect(handleFileSelect).toHaveBeenCalledWith(mockNodes[0].children![0]); // Check correct node passed

    handleFileSelect.mockClear();

    // Click top-level file
    const file2 = screen.getByText('File 2.md');
    await user.click(file2);
    expect(handleFileSelect).toHaveBeenCalledOnce();
    expect(handleFileSelect).toHaveBeenCalledWith(mockNodes[1]);

  });

   it('should apply className prop', () => {
    const testClassName = 'test-class-name';
    render(<FileExplorer nodes={mockNodes} onFileSelect={vi.fn()} className={testClassName} />);
    // The className is applied to the root div of FileExplorer
    const explorerDiv = screen.getByText('Generated Files:').parentElement; // Get the container div
    expect(explorerDiv).toHaveClass(testClassName);
  });

});
