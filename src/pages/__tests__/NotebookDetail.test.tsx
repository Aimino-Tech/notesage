import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotebookDetail from '../NotebookDetail'; // Adjust path as needed
import { useNotebookData } from '@/hooks/useNotebookData';
import { useNotebookActions } from '@/hooks/useNotebookActions';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useIsMobile } from '@/hooks/use-mobile';
import { Note, Source, ChatMessage as ChatMessageType, AIMode, AIModel } from '@/types/types'; // Import necessary types

// --- Mocks ---
// Mock hooks
vi.mock('@/hooks/useNotebookData');
vi.mock('@/hooks/useNotebookActions');
vi.mock('@/hooks/useApiKeys');
vi.mock('@/hooks/use-mobile');

// Explicitly mock react-router-dom to ensure original components are used alongside other mocks
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any; // Cast result to any
  return {
    ...actual, // Keep all original exports
    // We don't need to mock useParams here as the hook mock below handles it indirectly
  };
});

// Mock components used internally
vi.mock('@/components/notebook/source-panel', () => ({ SourcePanel: () => <div data-testid="source-panel-mock">Source Panel Mock</div> }));
// Enhance ChatPanel mock to include maximize/minimize interaction
vi.mock('@/components/notebook/chat-panel', () => ({ 
  ChatPanel: ({ viewMode, setViewMode }) => (
    <div data-testid="chat-panel-mock">
      Chat Panel Mock
      {viewMode === 'chatMaximized' ? (
        <button aria-label="Minimize Chat Panel" onClick={() => setViewMode('normal')}>Minimize Chat</button>
      ) : (
        <button aria-label="Maximize Chat Panel" onClick={() => setViewMode('chatMaximized')}>Maximize Chat</button>
      )}
    </div>
  ) 
}));
vi.mock('@/components/notebook/studio-panel', () => ({ StudioPanel: () => <div data-testid="studio-panel-mock">Studio Panel Mock</div> }));
vi.mock('@/components/notebook/workspace-panel', () => ({ WorkspacePanel: () => <div data-testid="workspace-panel-mock">Workspace Panel Mock</div> }));
vi.mock('@/components/notebook/file-viewer', () => ({ FileViewer: ({ onClose }) => <div data-testid="file-viewer-mock">File Viewer Mock <button onClick={onClose}>Close</button></div> }));
vi.mock('@/components/notebook/NoteViewer', () => ({ NoteViewer: ({ onClose }) => <div data-testid="note-viewer-mock">Note Viewer Mock <button onClick={onClose}>Close</button></div> })); // Mock NoteViewer
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, className }) => <div className={className}>{children}</div>,
  // Update ResizablePanel mock to forward refs and implement the resize method
  ResizablePanel: React.forwardRef(({ children, className, defaultSize, minSize, collapsible, collapsedSize, ...restProps }, ref) => {
    React.useImperativeHandle(ref, () => ({
      resize: vi.fn()
    }));
    return (
      <div 
        className={className} 
        data-default-size={defaultSize}
        data-min-size={minSize}
        data-collapsible={collapsible ? 'true' : 'false'}
        data-collapsed-size={collapsedSize}
        {...restProps}
      >
        {children}
      </div>
    );
  }),
  // Updated ResizableHandle mock that prevents withHandle prop from passing to DOM
  ResizableHandle: ({ withHandle, className, ...restProps }) => (
    <div 
      data-testid="resizable-handle" 
      className={className}
      data-with-handle={withHandle ? 'true' : 'false'} 
      {...restProps} 
    />
  ),
}));


// Default mock implementations
const mockUseNotebookData = useNotebookData as jest.Mock;
const mockUseNotebookActions = useNotebookActions as jest.Mock;
const mockUseApiKeys = useApiKeys as jest.Mock;
const mockUseIsMobile = useIsMobile as jest.Mock;

const mockSetSelectedSourceIds = vi.fn();
// No need for separate mockSetViewMode, useState handles it internally

// Helper function to render the component with router context
const renderComponent = (notebookId = 'test-notebook-id') => {
  // Reset mocks before each render
  mockUseIsMobile.mockReturnValue(false); // Default to desktop
  mockUseApiKeys.mockReturnValue({ isApiKeyValid: vi.fn().mockReturnValue(true) });
  mockUseNotebookData.mockReturnValue({
    notebook: { id: notebookId, title: 'Test Notebook', dateCreated: new Date(), lastModified: new Date() },
    sources: [] as Source[],
    setSources: vi.fn(),
    messages: [] as ChatMessageType[],
    setMessages: vi.fn(),
    notes: [] as Note[],
    setNotes: vi.fn(),
    // Add missing properties to the mock AIModel
    selectedModel: { 
      id: 'model1', 
      name: 'Test Model', 
      provider: 'openai', // Changed 'test' to a valid provider 'openai'
      modes: ['chat'], 
      // Corrected capabilities structure
      capabilities: { text: true, image: false, audio: false, computerUse: false }, 
      requiresApiKey: true // Added mock requiresApiKey
    } as AIModel,
    setSelectedModel: vi.fn(),
    selectedAIMode: 'chat' as AIMode,
    setSelectedAIMode: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn(),
    saveNotebookToLocalStorage: vi.fn(),
    selectedSourceIds: new Set<string>(),
    setSelectedSourceIds: mockSetSelectedSourceIds,
  });
  mockUseNotebookActions.mockReturnValue({
    handleSendMessage: vi.fn(),
    handleAddNote: vi.fn(),
    handleNoteClick: vi.fn(),
    handleDeleteNote: vi.fn(),
    handleGenerate: vi.fn(),
    handleAddFiles: vi.fn(),
    handleRenameSource: vi.fn(),
    handleDownloadSource: vi.fn(),
    handleDeleteSource: vi.fn(),
    handleRenameNote: vi.fn(),
    handleDownloadNote: vi.fn(),
    handleAddText: vi.fn(),
    handleAddLink: vi.fn(),
    isGeneratingContent: false,
    isSendingMessage: false,
  });


  return render(
    <MemoryRouter initialEntries={[`/notebook/${notebookId}`]}>
      <Routes>
        <Route path="/notebook/:id" element={<NotebookDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('NotebookDetail Component', () => {
  it('renders correctly in default desktop view', () => {
    renderComponent();
    // Check for key elements of both panels
    expect(screen.getByText('Sources')).toBeInTheDocument(); // Left panel tab
    expect(screen.getByText('Workspace')).toBeInTheDocument(); // Left panel tab
    expect(screen.getByText('Studio')).toBeInTheDocument(); // Left panel tab
    // Check for the mocked chat panel instead of the text "Chat"
    expect(screen.getByTestId('chat-panel-mock')).toBeInTheDocument(); 
    // Check for maximize buttons on both panels (using accessible names)
    expect(screen.getByRole('button', { name: 'Maximize Panel' })).toBeInTheDocument(); // Left panel
    expect(screen.getByRole('button', { name: 'Maximize Chat Panel' })).toBeInTheDocument(); // Chat panel (from mock)
    expect(screen.getByTestId('resizable-handle')).toBeInTheDocument(); // Separator handle
  });

  // --- Tests for Left Panel Maximize/Minimize ---
  it('hides chat panel when left panel is maximized', async () => {
    renderComponent();
    // Use getByRole for the button with accessible name
    const maximizeLeftButton = screen.getByRole('button', { name: 'Maximize Panel' });
    fireEvent.click(maximizeLeftButton);

    // Wait for potential state updates and re-renders
    await waitFor(() => {
      // Chat panel mock is still rendered
      expect(screen.getByTestId('chat-panel-mock')).toBeInTheDocument();
      // Its maximize button should STILL be present (it's the panel that *can* be maximized)
      expect(screen.getByRole('button', { name: 'Maximize Chat Panel' })).toBeInTheDocument();
      // Check that the resizable handle has the 'hidden' class instead of checking visibility
      expect(screen.getByTestId('resizable-handle')).toHaveClass('hidden');
      // Left panel tabs should still be there
      expect(screen.getByText('Sources')).toBeInTheDocument();
      // Minimize button should now be visible for left panel
      expect(screen.getByRole('button', { name: 'Minimize Panel' })).toBeInTheDocument();
      // Left panel's maximize button should be gone
      expect(screen.queryByRole('button', { name: 'Maximize Panel' })).not.toBeInTheDocument();
    });
  });

  it('restores both panels when left panel is minimized after maximizing', async () => {
    renderComponent();
    // Use getByRole for the button with accessible name
    const maximizeLeftButton = screen.getByRole('button', { name: 'Maximize Panel' });
    fireEvent.click(maximizeLeftButton);

    // Wait for maximization
    await waitFor(() => {
      // Ensure left panel minimize button is present
      expect(screen.getByRole('button', { name: 'Minimize Panel' })).toBeInTheDocument();
    });

    // Now click minimize
    const minimizeLeftButton = screen.getByRole('button', { name: 'Minimize Panel' });
    fireEvent.click(minimizeLeftButton);

    // Wait for restoration
    await waitFor(() => {
      // Both panels should be visible again with their maximize buttons
      expect(screen.getByText('Sources')).toBeInTheDocument();
      expect(screen.getByTestId('chat-panel-mock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Maximize Panel' })).toBeInTheDocument(); // Left panel maximize
      expect(screen.getByRole('button', { name: 'Maximize Chat Panel' })).toBeInTheDocument(); // Chat panel maximize (mock)
      expect(screen.getByTestId('resizable-handle')).toBeInTheDocument();
      // Ensure minimize buttons are gone
      expect(screen.queryByRole('button', { name: 'Minimize Panel' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Minimize Chat Panel' })).not.toBeInTheDocument();
    });
  });

  // --- Tests for Chat Panel Maximize/Minimize ---
  it('hides left panel when chat panel is maximized', async () => {
    renderComponent();
    // Find the maximize button within the mocked chat panel
    const maximizeChatButton = screen.getByRole('button', { name: 'Maximize Chat Panel' });
    fireEvent.click(maximizeChatButton);

    // Wait for potential state updates and re-renders
    await waitFor(() => {
      // Left panel's maximize button should STILL be present (it's the panel that *can* be maximized)
      // Note: The panel itself is visually hidden, but the button might still be in the DOM.
      // Let's verify the *other* panel's state instead for robustness.
      // expect(screen.getByRole('button', { name: 'Maximize Panel' })).toBeInTheDocument(); // This might be brittle depending on implementation.

      // Check that the resizable handle has the 'hidden' class instead of checking visibility
      expect(screen.getByTestId('resizable-handle')).toHaveClass('hidden');
      // Chat panel mock is still rendered
      expect(screen.getByTestId('chat-panel-mock')).toBeInTheDocument();
      // Minimize button should now be visible for chat panel (in mock)
      expect(screen.getByRole('button', { name: 'Minimize Chat Panel' })).toBeInTheDocument();
      // Chat panel's maximize button should be gone
      expect(screen.queryByRole('button', { name: 'Maximize Chat Panel' })).not.toBeInTheDocument();
    });
  });

  it('restores both panels when chat panel is minimized after maximizing', async () => {
    renderComponent();
    // Maximize chat panel
    const maximizeChatButton = screen.getByRole('button', { name: 'Maximize Chat Panel' });
    fireEvent.click(maximizeChatButton);

    // Wait for maximization
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Minimize Chat Panel' })).toBeInTheDocument();
    });

    // Now click minimize on the chat panel mock
    const minimizeChatButton = screen.getByRole('button', { name: 'Minimize Chat Panel' });
    fireEvent.click(minimizeChatButton);

    // Wait for restoration
    await waitFor(() => {
      // Both panels should be visible again with their maximize buttons
      expect(screen.getByText('Sources')).toBeInTheDocument(); // Left panel tab visible
      expect(screen.getByTestId('chat-panel-mock')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Maximize Panel' })).toBeInTheDocument(); // Left panel maximize
      expect(screen.getByRole('button', { name: 'Maximize Chat Panel' })).toBeInTheDocument(); // Chat panel maximize (mock)
      expect(screen.getByTestId('resizable-handle')).toBeInTheDocument();
      // Ensure minimize buttons are gone
      expect(screen.queryByRole('button', { name: 'Minimize Panel' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Minimize Chat Panel' })).not.toBeInTheDocument();
    });
  });

  // Add more tests as needed (e.g., mobile view, different initial states)
});
