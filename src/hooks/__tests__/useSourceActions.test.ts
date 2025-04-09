import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSourceActions, UseSourceActionsProps } from '../useSourceActions'; // Adjust path
import { Source, AIModel, SourceStatus, DocumentSummary, ChatMessage, Note } from '@/types/types'; // Adjust path
import { ProcessedSourceData } from '@/components/ui/add-source-dialog'; // Adjust path
import * as LlmSummary from '@/lib/llm-summary'; // Import module to mock
import * as ApiKeysHook from '@/hooks/useApiKeys'; // Import module to mock
import * as ToastHook from '@/hooks/use-toast'; // Import module to mock

// Mock dependencies
vi.mock('@/lib/llm-summary');
vi.mock('@/hooks/useApiKeys');
vi.mock('@/hooks/use-toast');

const mockGenerateDocumentSummary = vi.spyOn(LlmSummary, 'generateDocumentSummary');
const mockGetApiKey = vi.fn();
const mockToast = vi.fn();

// Mock implementations
vi.mocked(ApiKeysHook.useApiKeys).mockReturnValue({
  apiKeys: {},
  setApiKey: vi.fn(),
  getApiKey: mockGetApiKey,
  isApiKeyValid: vi.fn().mockReturnValue(true), // Assume valid by default
  testApiKey: vi.fn().mockResolvedValue(true), // Add missing mock property
});

vi.mocked(ToastHook.useToast).mockReturnValue({
  toast: mockToast,
  dismiss: vi.fn(),
  toasts: [], // Add missing mock property
});

// Default mock summary
const mockSuccessSummary: DocumentSummary = {
  summary: 'Mock summary',
  outline: 'Mock outline',
  keyPoints: 'Mock key points',
  qa: [{ question: 'Q1', answer: 'A1' }],
  todos: 'Mock todos',
  isValid: true,
  lastUpdated: new Date(),
};

describe('useSourceActions Hook', () => {
  let mockSetSources: ReturnType<typeof vi.fn>;
  let mockSaveNotebook: ReturnType<typeof vi.fn>;
  let mockSources: Source[];
  let mockMessages: ChatMessage[];
  let mockNotes: Note[];
  let mockSelectedModel: AIModel;

  const defaultProps: UseSourceActionsProps = {
    sources: [],
    setSources: vi.fn(),
    selectedModel: { id: 'test-model', name: 'Test Model', provider: 'openai', capabilities: { text: true, image: false, audio: false, computerUse: false }, requiresApiKey: true },
    messages: [],
    notes: [],
    saveNotebookToLocalStorage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSources = [];
    mockMessages = [];
    mockNotes = [];
    mockSetSources = vi.fn(updater => {
      if (typeof updater === 'function') {
        mockSources = updater(mockSources); // Simulate state update
      } else {
        mockSources = updater;
      }
    });
    mockSaveNotebook = vi.fn();
    mockSelectedModel = { ...defaultProps.selectedModel }; // Reset model

    // Reset mock implementations for each test
    mockGetApiKey.mockReturnValue('valid-key'); // Default to having a valid key
    mockGenerateDocumentSummary.mockResolvedValue(mockSuccessSummary);
  });

  const getHook = (props: Partial<UseSourceActionsProps> = {}) => {
    return renderHook(() => useSourceActions({
      ...defaultProps,
      sources: mockSources,
      setSources: mockSetSources,
      messages: mockMessages,
      notes: mockNotes,
      saveNotebookToLocalStorage: mockSaveNotebook,
      selectedModel: mockSelectedModel,
      ...props,
    }));
  };

  it('handleAddProcessedSources should add sources and trigger summary generation', async () => {
    const { result } = getHook();
    const processedData: ProcessedSourceData[] = [
      { name: 'part1.txt', content: 'Content 1', type: 'text/plain', originalFile: new File([''], 'part1.txt'), part: 1, totalParts: 2 },
      { name: 'part2.txt', content: 'Content 2', type: 'text/plain', originalFile: new File([''], 'part2.txt'), part: 2, totalParts: 2 },
    ];

    await act(async () => {
      await result.current.handleAddProcessedSources(processedData);
    });

    // Check state update (initial add)
    // Check state update (initial add) - Sources are added with Processing status initially
    expect(mockSetSources).toHaveBeenCalled(); // Called at least once
    const initialCallArgs = mockSetSources.mock.calls[0][0]; // Get the updater function or state
    let initialSources: Source[] = [];
    if (typeof initialCallArgs === 'function') {
      initialSources = initialCallArgs([]); // Simulate initial state if updater is used
    } else {
      initialSources = initialCallArgs; // Direct state set
    }
    expect(initialSources.length).toBe(2);
    expect(initialSources[0].status).toBe(SourceStatus.Processing);
    expect(initialSources[1].status).toBe(SourceStatus.Processing);

    // Check save call (initial add) - Should be called after initial setSources
    expect(mockSaveNotebook).toHaveBeenCalledTimes(2); // Once initially, once after summaries
    expect(mockSaveNotebook.mock.calls[0][0]).toHaveLength(2); // Saved with 2 sources initially

    // Check summary generation calls
    expect(mockGenerateDocumentSummary).toHaveBeenCalledTimes(2);
    expect(mockGenerateDocumentSummary).toHaveBeenCalledWith(mockSelectedModel, 'valid-key', 'Content 1');
    expect(mockGenerateDocumentSummary).toHaveBeenCalledWith(mockSelectedModel, 'valid-key', 'Content 2');

    // Wait for async summary processing and final state update
    await waitFor(() => {
      expect(mockSources.length).toBe(2);
      expect(mockSources[0].status).toBe(SourceStatus.Completed); // Final status
      expect(mockSources[0].summary).toEqual(mockSuccessSummary);
      expect(mockSources[1].status).toBe(SourceStatus.Completed);
      expect(mockSources[1].summary).toEqual(mockSuccessSummary);
      expect(mockSaveNotebook.mock.calls[1][0]).toHaveLength(2); // Saved again with summaries
       expect(mockSaveNotebook.mock.calls[1][0][0].summary).toEqual(mockSuccessSummary); // Check summary in saved data
    });

    // Check toasts
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sources Added" }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Processing Complete" }));
  });

  it('handleAddProcessedSources should skip summary for images', async () => {
    const { result } = getHook();
     const processedData: ProcessedSourceData[] = [
      { name: 'image.png', content: '[Image Content]', type: 'image/png', originalFile: new File([''], 'image.png'), part: 1, totalParts: 1 },
    ];

    await act(async () => {
      await result.current.handleAddProcessedSources(processedData);
    });

    expect(mockGenerateDocumentSummary).not.toHaveBeenCalled();
    await waitFor(() => {
       expect(mockSources[0].status).toBe(SourceStatus.Completed);
       expect(mockSources[0].summary).toBeNull(); // Correct expectation: should be null
    });
  });

   it('handleAddProcessedSources should handle summary generation errors', async () => {
    const error = new Error('Summary failed');
    mockGenerateDocumentSummary.mockRejectedValue(error);
    const { result } = getHook();
     const processedData: ProcessedSourceData[] = [
      { name: 'error.txt', content: 'Content that fails', type: 'text/plain', originalFile: new File([''], 'error.txt'), part: 1, totalParts: 1 },
    ];

    await act(async () => {
      await result.current.handleAddProcessedSources(processedData);
    });

    expect(mockGenerateDocumentSummary).toHaveBeenCalledTimes(1);
    await waitFor(() => {
       expect(mockSources[0].status).toBe(SourceStatus.Error);
       expect(mockSources[0].summary?.error).toBe('Summary failed');
       expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Summary Generation Error", variant: "destructive" }));
    });
  });

   it('handleAddProcessedSources should handle missing API key for summary', async () => {
    mockGetApiKey.mockReturnValue(''); // No API key
    const { result } = getHook();
     const processedData: ProcessedSourceData[] = [
      { name: 'no_key.txt', content: 'Content', type: 'text/plain', originalFile: new File([''], 'no_key.txt'), part: 1, totalParts: 1 },
    ];

    await act(async () => {
      await result.current.handleAddProcessedSources(processedData);
    });

    expect(mockGenerateDocumentSummary).not.toHaveBeenCalled(); // Should not be called
    await waitFor(() => {
       expect(mockSources[0].status).toBe(SourceStatus.Error);
       expect(mockSources[0].summary?.error).toContain('Configuration missing');
    });
  });

  it('handleAddText should add a text source via handleAddProcessedSources', async () => {
    const { result } = getHook();

    await act(async () => {
      await result.current.handleAddText('Some text', 'My Text Title');
    });

    // Check if setSources was called with the new text source
    // We check the arguments of the *first* call to setSources within handleAddProcessedSources
    await waitFor(() => {
      expect(mockSetSources).toHaveBeenCalled();
      const firstCallArgs = mockSetSources.mock.calls[0][0]; // Get the updater or state
      let sourcesAfterAdd: Source[] = [];
       if (typeof firstCallArgs === 'function') {
         sourcesAfterAdd = firstCallArgs([]); // Simulate initial add
       } else {
         sourcesAfterAdd = firstCallArgs;
       }
      expect(sourcesAfterAdd).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'My Text Title.txt',
            content: 'Some text',
            type: 'txt', // Check the mapped type - Changed from 'text' to 'txt'
            status: SourceStatus.Processing, // Initial status
          })
        ])
      );
    });
    // Also check if summary generation was attempted (it should be for text)
    expect(mockGenerateDocumentSummary).toHaveBeenCalled();
  });

  it('handleAddLink should add a URL source via handleAddProcessedSources', async () => {
    const { result } = getHook();

    await act(async () => {
      await result.current.handleAddLink('https://example.com', 'Example Link');
    });

    // Check if setSources was called with the new URL source
    await waitFor(() => {
       expect(mockSetSources).toHaveBeenCalled();
       const firstCallArgs = mockSetSources.mock.calls[0][0];
       let sourcesAfterAdd: Source[] = [];
       if (typeof firstCallArgs === 'function') {
         sourcesAfterAdd = firstCallArgs([]);
       } else {
         sourcesAfterAdd = firstCallArgs;
       }
       expect(sourcesAfterAdd).toEqual(
         expect.arrayContaining([
           expect.objectContaining({
             name: 'Example Link',
             content: 'https://example.com',
             type: 'url', // Check the mapped type
             status: SourceStatus.Processing,
           })
         ])
       );
    });
     // Check if summary generation was attempted (it should be for URL type)
     expect(mockGenerateDocumentSummary).toHaveBeenCalled();
  });

  // TODO: Add tests for rename, download, delete if needed

});
