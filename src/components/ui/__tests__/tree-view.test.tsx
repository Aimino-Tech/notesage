import React from 'react'; // Added React import
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TreeView } from '../tree-view'; // Adjust path if needed
import type { FileNode } from '@/components/notebook/file-explorer'; // Import FileNode type

// Mock Lucide icons used by TreeView/TreeItem if necessary
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
      {
        id: 'folder-2',
        name: 'Folder 2',
        type: 'folder',
        children: [
          { id: 'file-2', name: 'File 2.md', type: 'file' },
        ],
      },
    ],
  },
  { id: 'file-3', name: 'File 3.js', type: 'file' },
];

describe('TreeView', () => {
  it('should render the initial tree structure', () => {
    render(<TreeView nodes={mockNodes} onFileSelect={vi.fn()} />);

    // Check top-level nodes
    expect(screen.getByText('Folder 1')).toBeInTheDocument();
    expect(screen.getByText('File 3.js')).toBeInTheDocument();

    // Check icons (using data-testid from mock)
    expect(screen.getAllByTestId('folder-icon').length).toBeGreaterThanOrEqual(1); // At least Folder 1
    expect(screen.getAllByTestId('file-icon').length).toBeGreaterThanOrEqual(1); // At least File 3

    // Initially, nested nodes should not be visible unless defaultExpandedItems is used
    expect(screen.queryByText('File 1.txt')).not.toBeInTheDocument();
    expect(screen.queryByText('Folder 2')).not.toBeInTheDocument();
    expect(screen.queryByText('File 2.md')).not.toBeInTheDocument();
  });

  it('should expand folder on click and show children', async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={mockNodes} onFileSelect={vi.fn()} />);

    const folder1 = screen.getByText('Folder 1');
    await user.click(folder1);

    // Check if children are now visible
    expect(screen.getByText('File 1.txt')).toBeInTheDocument();
    expect(screen.getByText('Folder 2')).toBeInTheDocument();

    // Nested children still hidden
    expect(screen.queryByText('File 2.md')).not.toBeInTheDocument();

    // Expand nested folder
    const folder2 = screen.getByText('Folder 2');
    await user.click(folder2);
    expect(screen.getByText('File 2.md')).toBeInTheDocument();
  });

   it('should collapse folder on click', async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={mockNodes} onFileSelect={vi.fn()} />);

    const folder1 = screen.getByText('Folder 1');

    // First click: Expand
    await user.click(folder1);
    expect(screen.getByText('File 1.txt')).toBeInTheDocument(); // Verify expanded
    expect(screen.getByText('Folder 2')).toBeInTheDocument();

    // Second click: Collapse
    await user.click(folder1);
    expect(screen.queryByText('File 1.txt')).not.toBeInTheDocument(); // Verify collapsed
    expect(screen.queryByText('Folder 2')).not.toBeInTheDocument();
   });

  it('should call onFileSelect when a file node is clicked', async () => {
    const user = userEvent.setup();
    const handleFileSelect = vi.fn();
    render(<TreeView nodes={mockNodes} onFileSelect={handleFileSelect} />);

    // Expand necessary folders first
    const folder1 = screen.getByText('Folder 1');
    await user.click(folder1);
    const folder2 = screen.getByText('Folder 2');
    await user.click(folder2);

    // Now folders are expanded, find and click files
    const file1 = screen.getByText('File 1.txt');
    const file2 = screen.getByText('File 2.md');
    const file3 = screen.getByText('File 3.js'); // Top-level file

    await user.click(file1);
    expect(handleFileSelect).toHaveBeenCalledTimes(1); // Use specific count
    expect(handleFileSelect).toHaveBeenNthCalledWith(1, mockNodes[0].children![0]); // Check correct node passed

    // handleFileSelect.mockClear(); // No need to clear if checking call count and args

    await user.click(file2);
    expect(handleFileSelect).toHaveBeenCalledTimes(2);
    expect(handleFileSelect).toHaveBeenNthCalledWith(2, mockNodes[0].children![1].children![0]);

     // handleFileSelect.mockClear();

     await user.click(file3);
     expect(handleFileSelect).toHaveBeenCalledTimes(3);
     expect(handleFileSelect).toHaveBeenNthCalledWith(3, mockNodes[1]);
  });

  it('should NOT call onFileSelect when a folder node is clicked', async () => {
    const user = userEvent.setup();
    const handleFileSelect = vi.fn();
    render(<TreeView nodes={mockNodes} onFileSelect={handleFileSelect} />);

    const folder1 = screen.getByText('Folder 1');
    await user.click(folder1); // Expand folder 1

    const folder2 = screen.getByText('Folder 2'); // Folder 2 is now visible

    await user.click(folder1); // Click to expand/collapse
    expect(handleFileSelect).not.toHaveBeenCalled();

    await user.click(folder2); // Click to expand/collapse
    expect(handleFileSelect).not.toHaveBeenCalled();
  });

  // Add tests for aria attributes, keyboard navigation if implemented
});
