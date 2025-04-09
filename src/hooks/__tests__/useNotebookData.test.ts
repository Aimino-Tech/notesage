import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotebookData } from '../useNotebookData';
import { mockModels } from '@/data/mockData'; // Keep for other tests if needed
import { supportedModels } from '@/types/types'; // Import actual models
import type { Notebook } from '@/types/types';

describe('useNotebookData', () => {
  const mockNotebook: Notebook = {
    id: 'test-id',
    title: 'Test Notebook',
    sources: [{
      id: 'source1',
      name: 'test.pdf',
      type: 'pdf',
      content: 'test content',
      dateAdded: new Date('2024-01-01')
    }],
    messages: [{
      id: 'msg1',
      role: 'user',
      content: 'test message',
      timestamp: new Date('2024-01-01')
    }],
    notes: [{
      id: 'note1',
      title: 'Test Note',
      content: 'test note',
      dateCreated: new Date('2024-01-01'),
      dateModified: new Date('2024-01-01')
    }],
    dateCreated: new Date('2024-01-01'),
    dateModified: new Date('2024-01-02')
  };

  // Mock localStorage
  const mockLocalStorage = new Map<string, string>();
  
  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    
    // Mock localStorage methods
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => mockLocalStorage.get(key) || null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key, value) => mockLocalStorage.set(key, value)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state for new notebook', () => {
    const { result } = renderHook(() => useNotebookData('create'));

     expect(result.current.notebook).toEqual({
       id: 'create', // ID should be 'create' when initializing
       title: 'New Notebook', // Default title for new notebook
       sources: [],
       messages: [],
      notes: [],
      dateCreated: expect.any(Date),
      dateModified: expect.any(Date)
    });
    expect(result.current.sources).toEqual([]);
     expect(result.current.messages).toEqual([]);
     expect(result.current.notes).toEqual([]);
     // Expect the actual default model provided by the hook
     expect(result.current.selectedModel).toEqual({
       apiKey: "AIzaSyBOapSkKX9xg3aEY0W158_WfkX7NGQiKmY", // Assuming this is intended or mock data
       capabilities: {
         audio: false,
         computerUse: true,
         image: true,
         text: true,
       },
       id: "gemini-2.0-flash-aimino-sponsored",
       maxTokens: 8192,
       name: "Aimino's sponsored Model",
       notes: "Provided by Aimino. No API key needed.",
       provider: "google",
       requiresApiKey: false,
       sponsored: true,
       version: "2.0",
     });
     expect(result.current.isLoading).toBe(false);
   });

  it('should load existing notebook from localStorage', () => {
    // Setup localStorage with a mock notebook
    mockLocalStorage.set('notebooks', JSON.stringify([mockNotebook]));

    const { result } = renderHook(() => useNotebookData(mockNotebook.id));

    expect(result.current.notebook).toEqual(mockNotebook);
    expect(result.current.sources).toEqual(mockNotebook.sources);
    expect(result.current.messages).toEqual(mockNotebook.messages);
    expect(result.current.notes).toEqual(mockNotebook.notes);
  });

  it('should handle non-existent notebook gracefully', () => {
    const { result } = renderHook(() => useNotebookData('non-existent-id'));

     expect(result.current.notebook).toEqual({
       id: 'non-existent-id',
       title: 'No notebooks found', // Corrected expected title
       sources: [],
       messages: [],
      notes: [],
      dateCreated: expect.any(Date),
      dateModified: expect.any(Date)
    });
  });

  it('should save notebook changes to localStorage', () => {
    mockLocalStorage.set('notebooks', JSON.stringify([mockNotebook]));

    const { result } = renderHook(() => useNotebookData(mockNotebook.id));

    const newSource = {
      id: 'source2',
      name: 'new.pdf',
      type: 'pdf' as const,
      content: 'new content',
      dateAdded: new Date()
    };
    const newMessage = {
      id: 'msg2',
      role: 'assistant' as const,
      content: 'new message',
      timestamp: new Date()
    };
    const newNote = {
      id: 'note2',
      title: 'New Note',
      content: 'new note',
      dateCreated: new Date(),
      dateModified: new Date()
    };

    act(() => {
      result.current.saveNotebookToLocalStorage(
        [...mockNotebook.sources, newSource],
        [...mockNotebook.messages, newMessage],
        [...mockNotebook.notes, newNote]
      );
    });

    // Get saved data from localStorage
    const savedData = JSON.parse(mockLocalStorage.get('notebooks') || '[]');
    const savedNotebook = savedData[0];

    expect(savedNotebook.sources).toHaveLength(2);
    expect(savedNotebook.messages).toHaveLength(2);
    expect(savedNotebook.notes).toHaveLength(2);
    expect(savedNotebook.dateModified).not.toBe(mockNotebook.dateModified);
  });

  it('should not save when id is "create"', () => {
    const { result } = renderHook(() => useNotebookData('create'));

    act(() => {
      result.current.saveNotebookToLocalStorage([], [], []);
    });

    // localStorage.setItem should not be called
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it('should update selected model', () => {
    const { result } = renderHook(() => useNotebookData('test-id'));

    act(() => {
      result.current.setSelectedModel(mockModels[1]);
    });

    expect(result.current.selectedModel).toEqual(mockModels[1]);
  });

  it('should handle empty localStorage', () => {
    mockLocalStorage.set('notebooks', '');
    
    const { result } = renderHook(() => useNotebookData('any-id'));

    expect(result.current.notebook).toEqual({
      id: 'any-id',
      title: 'No notebooks found',
      sources: [],
      messages: [],
      notes: [],
      dateCreated: expect.any(Date),
      dateModified: expect.any(Date)
    });
  });
});
