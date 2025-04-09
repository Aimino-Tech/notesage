import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AddSourceDialog, ProcessedSourceData } from '../add-source-dialog'; 
import * as Utils from '@/lib/utils';
import * as PdfWorker from '@/lib/pdf-worker';
import userEvent from '@testing-library/user-event';

// Mock the utils module
vi.mock('@/lib/utils', async (importOriginal) => {
  const original = await importOriginal<typeof Utils>();
  return {
    ...original, 
    detectLargeFile: vi.fn(),
    splitFileContent: vi.fn(),
  };
});

// Mock pdf-worker
vi.mock('@/lib/pdf-worker', () => ({
  extractTextFromPdf: vi.fn(),
}));

// Mock FileReader more effectively
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  result: string | ArrayBuffer | null = null;
  
  readAsText(file: Blob) {
    Promise.resolve().then(() => {
      if (this.onload) {
        this.result = 'mocked text content';
        this.onload();
      }
    });
  }
  
  readAsArrayBuffer(file: Blob) {
    Promise.resolve().then(() => {
      if (this.onload) {
        this.result = new ArrayBuffer(8);
        this.onload();
      }
    });
  }
}

// Replace global FileReader with our mock for tests
const originalFileReader = global.FileReader;

describe('AddSourceDialog Component', () => {
  const mockOnSourcesAdd = vi.fn();
  const mockOnTextAdd = vi.fn();
  const mockOnLinkAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up FileReader mock
    global.FileReader = MockFileReader as any;
    
    // Set up default mock returns
    vi.mocked(Utils.detectLargeFile).mockReturnValue({ isLarge: false, message: '', lineCount: 10 });
    vi.mocked(Utils.splitFileContent).mockImplementation((content, path) => [{ path, content, part: 1, totalParts: 1 }]);
    vi.mocked(PdfWorker.extractTextFromPdf).mockResolvedValue('Extracted PDF text');
  });

  afterEach(() => {
    // Restore the original FileReader
    global.FileReader = originalFileReader;
  });

  const renderDialog = async () => {
    const user = userEvent.setup();
    
    const result = render(
      <AddSourceDialog
        onSourcesAdd={mockOnSourcesAdd}
        onTextAdd={mockOnTextAdd}
        onLinkAdd={mockOnLinkAdd}
      />
    );
    
    // Open the dialog
    await user.click(screen.getByRole('button', { name: /add source/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    
    return { result, user };
  };

  const switchToTextTab = async () => {
    const { result, user } = await renderDialog();
    
    // Find and click the Text tab
    const textTab = screen.getByRole('tab', { name: /enter text/i });
    await user.click(textTab);
    
    // Wait for the tab content to be visible using aria-labels
    await waitFor(() => {
      const titleInput = screen.getByLabelText('Title');
      const contentTextarea = screen.getByLabelText('Content');
      expect(titleInput).toBeInTheDocument();
      expect(contentTextarea).toBeInTheDocument();
    }, { timeout: 3000 });
    
    return { result, user };
  };

  it('renders the dialog with tabs when opened', async () => {
    await renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /upload file/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /link/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /enter text/i })).toBeInTheDocument();
  });

  it('handles adding a small text file', async () => {
    const { user } = await renderDialog();
    
    // Create mock file
    const fileContent = 'Small file content.';
    const file = new File([fileContent], 'small.txt', { type: 'text/plain' });
    
    // Create a custom file change event
    const fileInputChange = {
      target: {
        files: [file]
      }
    };
    
    // Find the hidden file input and simulate a change
    const fileInput = screen.getByLabelText('file-input', { selector: 'input[type="file"]', hidden: true });
    fireEvent.change(fileInput, fileInputChange);
    
    // Wait for the file processing to complete
    await waitFor(() => {
      expect(mockOnSourcesAdd).toHaveBeenCalled();
    });
    
    // Verify the processed file was added
    expect(mockOnSourcesAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'small.txt',
        content: 'mocked text content', // From our mock FileReader
        type: 'text/plain'
      })
    ]);
  });

  // The following tests for text tab don't need FileReader mocks
  it('handles adding text via the text tab', async () => {
    const { user } = await switchToTextTab();
    
    // Enter title and content
    const titleInput = screen.getByLabelText('Title');
    const contentTextarea = screen.getByLabelText('Content');
    
    await user.type(titleInput, 'Test Note');
    await user.type(contentTextarea, 'This is a test note content.');
    
    // Click Add button
    const addButton = screen.getByRole('button', { name: /add$/i });
    await user.click(addButton);
    
    // Check that onTextAdd was called with the correct arguments
    expect(mockOnTextAdd).toHaveBeenCalledWith('This is a test note content.', 'Test Note');
  });

  it('shows warning for large text input in text tab', async () => {
    const { user } = await switchToTextTab();
    
    // Mock large text detection
    vi.mocked(Utils.detectLargeFile).mockReturnValue({
      isLarge: true,
      message: 'The text is very large. It will be processed but may impact performance.',
      lineCount: 1000
    });
    
    // Enter title and large content
    const titleInput = screen.getByLabelText('Title');
    const contentTextarea = screen.getByLabelText('Content');
    
    await user.type(titleInput, 'Large Text');
    await user.type(contentTextarea, 'Large text content...');
    
    // Check that the warning is displayed
    await waitFor(() => {
      expect(screen.getByText(/The text is very large/i)).toBeInTheDocument();
    });
  });
});
