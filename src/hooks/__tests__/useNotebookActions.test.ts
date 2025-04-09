import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotebookActions, UseNotebookActionsProps } from '../useNotebookActions'; // Adjust path
import { Source, AIModel, ChatMessage, Note, SourceStatus, AIMode, Citation } from '@/types/types'; // Adjust path
import * as LlmQa from '@/lib/document-qa'; // Import module to mock
import * as ApiKeysHook from '@/hooks/useApiKeys'; // Import module to mock
import * as ToastHook from '@/hooks/use-toast'; // Import module to mock
import * as LlmWorkaid from '@/lib/llm-workaid';
import * as LlmCompletion from '@/lib/llm-completion';
import * as Prompts from '@/lib/prompts';

// Mock dependencies
vi.mock('@/lib/document-qa');
vi.mock('@/hooks/useApiKeys');
vi.mock('@/hooks/use-toast');
vi.mock('@/lib/llm-workaid');
vi.mock('@/lib/llm-completion');
vi.mock('@/lib/prompts');

const mockGetDocumentAnswerStream = vi.mocked(LlmQa.getDocumentAnswerStream);
const mockGetApiKey = vi.fn();
const mockToast = vi.fn();
const mockGenerateWorkAid = vi.mocked(LlmWorkaid.generateWorkAidContent);
const mockGenerateCompletion = vi.mocked(LlmCompletion.generateTextCompletion);
const mockGetPrompt = vi.mocked(Prompts.getPrompt);

// Mock implementations
vi.mocked(ApiKeysHook.useApiKeys).mockReturnValue({
  apiKeys: {},
  setApiKey: vi.fn(),
  getApiKey: mockGetApiKey,
  isApiKeyValid: vi.fn().mockReturnValue(true),
  testApiKey: vi.fn().mockResolvedValue(true),
});

vi.mocked(ToastHook.useToast).mockReturnValue({
  toast: mockToast,
  dismiss: vi.fn(),
  toasts: [],
});

// Mock stream and citations
const mockStream = (async function* () {
  yield 'AI response chunk 1';
  yield ' chunk 2';
})(); // Immediately invoke async generator
const mockCitationsPromise = Promise.resolve<Citation[]>([]);

mockGetDocumentAnswerStream.mockResolvedValue({
  stream: mockStream,
  citationsPromise: mockCitationsPromise,
  selectedSourceId: 'mock-source-id',
});

describe('useNotebookActions Hook', () => {
  let mockSetSources: ReturnType<typeof vi.fn>;
  let mockSetMessages: ReturnType<typeof vi.fn>;
  let mockSetNotes: ReturnType<typeof vi.fn>;
  let mockSaveNotebook: ReturnType<typeof vi.fn>;
  let mockSources: Source[];
  let mockMessages: ChatMessage[];
  let mockNotes: Note[];
  let mockSelectedModel: AIModel;
  let mockSelectedAIMode: AIMode;
  let mockSetViewingNote: ReturnType<typeof vi.fn>;


  const defaultProps: UseNotebookActionsProps = {
    sources: [],
    setSources: vi.fn(),
    messages: [],
    setMessages: vi.fn(),
    notes: [],
    setNotes: vi.fn(),
    selectedModel: { id: 'test-model', name: 'Test Model', provider: 'openai', capabilities: { text: true, image: false, audio: false, computerUse: false }, requiresApiKey: true },
    selectedAIMode: 'cite',
    setViewingNote: vi.fn(),
    saveNotebookToLocalStorage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSources = [];
    mockMessages = [];
    mockNotes = [];
    mockSetSources = vi.fn(updater => { mockSources = typeof updater === 'function' ? updater(mockSources) : updater; });
    mockSetMessages = vi.fn(updater => { mockMessages = typeof updater === 'function' ? updater(mockMessages) : updater; });
    mockSetNotes = vi.fn(updater => { mockNotes = typeof updater === 'function' ? updater(mockNotes) : updater; });
    mockSaveNotebook = vi.fn();
    mockSelectedModel = { ...defaultProps.selectedModel };
    mockSelectedAIMode = 'cite';
    mockSetViewingNote = vi.fn();

    // Reset mock implementations
    mockGetApiKey.mockReturnValue('valid-key');
    mockGetDocumentAnswerStream.mockResolvedValue({
      stream: (async function* () { yield 'response'; })(),
      citationsPromise: Promise.resolve([]),
      selectedSourceId: 'mock-id',
    });
  });

  const getHook = (props: Partial<UseNotebookActionsProps> = {}) => {
    // Update local mocks based on passed props for accurate state simulation
    mockSources = props.sources ?? mockSources;
    mockMessages = props.messages ?? mockMessages;
    mockNotes = props.notes ?? mockNotes;

    return renderHook(() => useNotebookActions({
      ...defaultProps,
      sources: mockSources,
      setSources: mockSetSources,
      messages: mockMessages,
      setMessages: mockSetMessages,
      notes: mockNotes,
      setNotes: mockSetNotes,
      saveNotebookToLocalStorage: mockSaveNotebook,
      selectedModel: mockSelectedModel,
      selectedAIMode: mockSelectedAIMode,
      setViewingNote: mockSetViewingNote,
      ...props,
    }));
  };

  // --- Tests for handleSendMessage Context Gathering ---

  it('handleSendMessage: should pass only selected non-split sources', async () => {
    const sources: Source[] = [
      { id: 's1', name: 'doc1.txt', content: 'Content 1', type: 'txt', dateAdded: new Date() },
      { id: 's2', name: 'doc2.txt', content: 'Content 2', type: 'txt', dateAdded: new Date() },
    ];
    const selectedIds = new Set(['s1']);
    const { result } = getHook({ sources });

    await act(async () => {
      await result.current.handleSendMessage('Test message', selectedIds);
    });

    expect(mockGetDocumentAnswerStream).toHaveBeenCalledTimes(1);
    const sourcesSent = mockGetDocumentAnswerStream.mock.calls[0][1];
    expect(sourcesSent).toHaveLength(1);
    expect(sourcesSent[0].id).toBe('s1');
  });

  it('handleSendMessage: should pass all parts if one part of a split doc is selected', async () => {
    const sources: Source[] = [
      { id: 's1-p1', name: 'doc1_part1.pdf', content: 'Part 1', type: 'pdf', dateAdded: new Date(), originalId: 'orig-1', part: 1, totalParts: 2 },
      { id: 's1-p2', name: 'doc1_part2.pdf', content: 'Part 2', type: 'pdf', dateAdded: new Date(), originalId: 'orig-1', part: 2, totalParts: 2 },
      { id: 's2', name: 'doc2.txt', content: 'Content 2', type: 'txt', dateAdded: new Date() },
    ];
    const selectedIds = new Set(['s1-p2']); // Select only part 2
    const { result } = getHook({ sources });

    await act(async () => {
      await result.current.handleSendMessage('Test message', selectedIds);
    });

    expect(mockGetDocumentAnswerStream).toHaveBeenCalledTimes(1);
    const sourcesSent = mockGetDocumentAnswerStream.mock.calls[0][1];
    expect(sourcesSent).toHaveLength(2); // Should include both parts
    expect(sourcesSent.map(s => s.id).sort()).toEqual(['s1-p1', 's1-p2'].sort());
    expect(sourcesSent[0].id).toBe('s1-p1'); // Check order
    expect(sourcesSent[1].id).toBe('s1-p2');
  });

  it('handleSendMessage: should pass all parts if multiple parts of the same split doc are selected', async () => {
     const sources: Source[] = [
      { id: 's1-p1', name: 'doc1_part1.pdf', content: 'Part 1', type: 'pdf', dateAdded: new Date(), originalId: 'orig-1', part: 1, totalParts: 3 },
      { id: 's1-p2', name: 'doc1_part2.pdf', content: 'Part 2', type: 'pdf', dateAdded: new Date(), originalId: 'orig-1', part: 2, totalParts: 3 },
      { id: 's1-p3', name: 'doc1_part3.pdf', content: 'Part 3', type: 'pdf', dateAdded: new Date(), originalId: 'orig-1', part: 3, totalParts: 3 },
    ];
    const selectedIds = new Set(['s1-p1', 's1-p3']); // Select parts 1 and 3
    const { result } = getHook({ sources });

    await act(async () => {
      await result.current.handleSendMessage('Test message', selectedIds);
    });

    expect(mockGetDocumentAnswerStream).toHaveBeenCalledTimes(1);
    const sourcesSent = mockGetDocumentAnswerStream.mock.calls[0][1];
    expect(sourcesSent).toHaveLength(3); // Should include all 3 parts, no duplicates
    expect(sourcesSent.map(s => s.id).sort()).toEqual(['s1-p1', 's1-p2', 's1-p3'].sort());
  });

  it('handleSendMessage: should pass parts of multiple split docs if selected', async () => {
    const sources: Source[] = [
      { id: 's1-p1', name: 'doc1_part1.pdf', content: 'A1', type: 'pdf', dateAdded: new Date(), originalId: 'orig-A', part: 1, totalParts: 2 },
      { id: 's1-p2', name: 'doc1_part2.pdf', content: 'A2', type: 'pdf', dateAdded: new Date(), originalId: 'orig-A', part: 2, totalParts: 2 },
      { id: 's2-p1', name: 'doc2_part1.txt', content: 'B1', type: 'txt', dateAdded: new Date(), originalId: 'orig-B', part: 1, totalParts: 1 }, // Note: totalParts=1 means not really split, but has originalId
      { id: 's3', name: 'doc3.md', content: 'C1', type: 'md', dateAdded: new Date() },
    ];
    const selectedIds = new Set(['s1-p1', 's2-p1']); // Select part of A and part of B
    const { result } = getHook({ sources });

     await act(async () => {
      await result.current.handleSendMessage('Test message', selectedIds);
    });

    expect(mockGetDocumentAnswerStream).toHaveBeenCalledTimes(1);
    const sourcesSent = mockGetDocumentAnswerStream.mock.calls[0][1];
    expect(sourcesSent).toHaveLength(3); // All parts of A (2) + part of B (1)
    expect(sourcesSent.map(s => s.id).sort()).toEqual(['s1-p1', 's1-p2', 's2-p1'].sort());
  });

   it('handleSendMessage: should pass parts of split doc and a non-split doc if selected', async () => {
    const sources: Source[] = [
      { id: 's1-p1', name: 'doc1_part1.pdf', content: 'A1', type: 'pdf', dateAdded: new Date(), originalId: 'orig-A', part: 1, totalParts: 2 },
      { id: 's1-p2', name: 'doc1_part2.pdf', content: 'A2', type: 'pdf', dateAdded: new Date(), originalId: 'orig-A', part: 2, totalParts: 2 },
      { id: 's2', name: 'doc2.txt', content: 'B1', type: 'txt', dateAdded: new Date() },
    ];
    const selectedIds = new Set(['s1-p1', 's2']); // Select part of A and doc B
    const { result } = getHook({ sources });

     await act(async () => {
      await result.current.handleSendMessage('Test message', selectedIds);
    });

    expect(mockGetDocumentAnswerStream).toHaveBeenCalledTimes(1);
    const sourcesSent = mockGetDocumentAnswerStream.mock.calls[0][1];
    expect(sourcesSent).toHaveLength(3); // All parts of A (2) + doc B (1)
    expect(sourcesSent.map(s => s.id).sort()).toEqual(['s1-p1', 's1-p2', 's2'].sort());
  });

  // --- Other tests for handleGenerate etc. can go here ---

});
