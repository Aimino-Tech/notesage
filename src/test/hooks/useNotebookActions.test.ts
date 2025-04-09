import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // Added afterEach
import { useNotebookActions, type UseNotebookActionsProps } from '@/hooks/useNotebookActions'; // Re-add type import
import { useToast } from '@/hooks/use-toast';
import { DocumentSummary, ChatMessage, Citation } from '@/types/types'; // Import necessary types
import { useApiKeys } from '@/hooks/useApiKeys'; // Import the hook to mock
import { getDocumentAnswerStream } from '@/lib/document-qa'; // Import the function to mock

// --- Mocks ---
// Mock the toast hook
const mockToastFnImplementation = vi.fn(); // Define the core mock fn
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: mockToastFnImplementation, // Use the defined mock
    dismiss: vi.fn(), // Add missing mock property
    toasts: [], // Add missing mock property
  })),
}));

// Mock the useApiKeys hook
vi.mock('@/hooks/useApiKeys', () => ({
  useApiKeys: vi.fn(() => ({
    getApiKey: vi.fn((provider: string) => `mock-api-key-for-${provider}`), // Return a mock key
    apiKeys: {}, // Add other properties if needed by the hook
    setApiKey: vi.fn(),
    removeApiKey: vi.fn(),
  })),
}));

// Mock API calls
vi.mock('@/shared/api', () => ({
  generateDocumentSummary: vi.fn(async () => ({ // Mock implementation for generateDocumentSummary
    summary: 'Mock summary',
    outline: 'Mock outline',
    keyPoints: 'Mock key points',
    qa: [], // Corrected type to empty array
    isValid: true,
    lastUpdated: new Date(),
  } as DocumentSummary)),
}));

// Mock document-qa (dynamic import)
vi.mock('@/lib/document-qa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/document-qa')>();

  // Create a more controllable mock stream
  const mockStreamController = {
    chunks: ['Chunk 1 ', 'Chunk 2', ' Chunk 3'],
    asyncIterator: null as any,
    createStream() {
      // Create a new async iterator each time
      this.asyncIterator = (async function*() {
        for (const chunk of mockStreamController.chunks) {
          yield chunk;
        }
      })();
      return this.asyncIterator;
    }
  };
  
  // Mock citations promise that properly resolves
  const mockCitations = [
    { sourceId: 'source-1', text: 'stream citation 1', searchText: 'stream search 1', pageNumber: 1, id: 'cit-stream-1' },
    { sourceId: 'source-1', text: 'stream citation 2', searchText: 'stream search 2', pageNumber: 2, id: 'cit-stream-2' },
  ] as Citation[];

  const mockCitationsPromise = Promise.resolve(mockCitations);

  return {
    ...actual,
    getDocumentAnswer: vi.fn(async () => ({ 
      answer: 'Mock AI answer (non-stream)',
      citations: [{ sourceId: 'source-1', text: 'mock citation text', searchText: 'mock search text', id: 'cit-nonstream-1' }],
    })),
    getDocumentAnswerStream: vi.fn(async () => ({ 
      stream: mockStreamController.createStream(),
      citationsPromise: mockCitationsPromise,
      selectedSourceId: 'source-1',
    })),
  };
});

// Mock pdf-worker
vi.mock('@/lib/pdf-worker', () => ({
  extractTextFromPdf: vi.fn(async () => 'Mock PDF content'), // Mock implementation for extractTextFromPdf
}));

// Mock mammoth
vi.mock('mammoth', () => ({
  default: { // Assuming mammoth uses default export
    convertToHtml: vi.fn(async () => ({ value: '<p>Mock DOCX content</p>' })), // Mock implementation
  }
}));

// Mock PDF.js is already handled in setupTests.ts

describe('useNotebookActions', () => {
  // Rely on the top-level vi.mock for useToast implementation

  // Setup test data
  const mockSource = {
    id: 'source-1',
    name: 'test.txt',
    type: 'text' as const,
    content: 'test content',
    dateAdded: new Date(),
  };

  const mockMessage = {
    id: 'msg-1',
    content: 'test message',
    role: 'user' as const,
    timestamp: new Date(),
  };

  const mockNote = {
    id: 'note-1',
    title: 'Test Note',
    content: 'test note content',
    dateCreated: new Date(),
    dateModified: new Date(),
  };

  const mockModel = {
    id: 'model-1',
    name: 'Test Model',
    provider: 'openai' as const,
    capabilities: {
      text: true,
      image: false,
      audio: false,
      computerUse: false, // Added missing property
    },
    requiresApiKey: true,
    // Removed 'modes' as it's not part of AIModel type
  };

  // Setup mock state and handlers (Using simple vi.fn())
  const mockSetSources = vi.fn();
  const mockSetMessages = vi.fn();
  const mockSetNotes = vi.fn();
  const mockSetViewingNote = vi.fn(); // Add mock for setViewingNote
  const mockSaveToLocalStorage = vi.fn();

  const defaultProps: UseNotebookActionsProps = { // Add type annotation for better checking
    sources: [mockSource],
    setSources: mockSetSources,
    messages: [mockMessage], // Initial messages for some tests
    setMessages: mockSetMessages,
    notes: [mockNote],
    setNotes: mockSetNotes,
    selectedModel: mockModel,
    selectedAIMode: 'cite' as const,
    setViewingNote: mockSetViewingNote, // Add the mock to defaultProps
    saveNotebookToLocalStorage: mockSaveToLocalStorage,
    // Removed selectedSourceIds as it's not a prop of the hook
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockToastFnImplementation.mockClear(); // Clear the global mock function
    vi.useFakeTimers(); // Use fake timers by default
  });

  // Ensure timers are reset after each test if real timers were used
  afterEach(() => {
    vi.useRealTimers(); // Reset to real timers just in case a test changed it
  });

  it('should not send empty messages', () => {
    const { result } = renderHook(() => useNotebookActions(defaultProps));

    // Call handleSendMessage with required second argument
    act(() => {
      result.current.handleSendMessage('   ', new Set()); // Pass empty Set
    });

    expect(mockSetMessages).not.toHaveBeenCalled(); // Still shouldn't be called for empty message
  });

  // --- Improved test for streaming ---
  it('should handle sending a message with streaming', async () => {
    // Track messages for validation
    let capturedMessages: ChatMessage[] = [];
    
    // Use the hook with mocked dependencies
    const { result } = renderHook(() => useNotebookActions({
      ...defaultProps,
      messages: [], // Start with empty messages
    }));

    const userQuery = 'Stream test query';
    const selectedSourceIds = new Set(['source-1']);

    // Mock implementation of setMessages to capture updates
    mockSetMessages.mockImplementation((updater) => {
      // Apply the updater function to current messages
      capturedMessages = typeof updater === 'function' 
        ? updater(capturedMessages) 
        : updater;
      
      // Call saveNotebookToLocalStorage to simulate component behavior
      mockSaveToLocalStorage(defaultProps.sources, capturedMessages, defaultProps.notes);
    });

    // Call handleSendMessage
    await act(async () => {
      await result.current.handleSendMessage(userQuery, selectedSourceIds);
    });

    // Ensure we have enough time for async operations
    vi.runAllTimersAsync();
    await vi.waitFor(() => {
      // We expect at least two messages: user query and AI response
      return capturedMessages.length >= 2;
    });

    // Verify message setting was called with correct values
    expect(capturedMessages.length).toBeGreaterThanOrEqual(2);
    expect(capturedMessages[0].content).toBe(userQuery);
    expect(capturedMessages[0].role).toBe('user');
    expect(capturedMessages[1].role).toBe('assistant');
    
    // AI response should have the combined stream chunks
    expect(capturedMessages[1].content).toContain('Chunk 1');
    expect(capturedMessages[1].content).toContain('Chunk 2');
    
    // Verify API was called with correct params
    // Use expect.objectContaining to be less strict about date type
    expect(getDocumentAnswerStream).toHaveBeenCalledWith(
      userQuery,
      expect.arrayContaining([
        expect.objectContaining({
          id: 'source-1',
          name: 'test.txt',
          type: 'text',
          content: 'test content',
          dateAdded: expect.any(String), // Expect a string based on error
        })
      ]),
      mockModel,
      "mock-api-key-for-openai",
      'cite'
    );
    
    // Verify localStorage was called
    expect(mockSaveToLocalStorage).toHaveBeenCalled();
    
    // Verify citations were eventually added to the message
    expect(capturedMessages[1].citations?.length).toBeGreaterThan(0);
  });
});
