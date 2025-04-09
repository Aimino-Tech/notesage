import React from 'react';
import { vi, Mock } from 'vitest';
import { useNotebookData } from '@/hooks/useNotebookData';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useParams } from 'react-router-dom';
import { WriteAgent } from '@/lib/write-agent';
import * as VFS from '@/lib/vfs';
import type { AIModel, TodoItem, VFSState } from '@/types/types'; // Combined imports
import { toast } from 'sonner';

// --- Re-export types needed by the test file ---
export type { AIModel, TodoItem, VFSState };
export type AgentUpdate = {
  status?: string;
  fileSystemChanged?: boolean;
  // Add other possible update properties if known
};

// --- Mocks ---
vi.mock('@/hooks/useNotebookData');
vi.mock('@/hooks/useApiKeys');
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...original,
    useParams: vi.fn(),
  };
});
vi.mock('@/lib/write-agent');
vi.mock('@/lib/vfs');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));
vi.mock('lucide-react', async (importOriginal) => {
  const original = await importOriginal<typeof import('lucide-react')>();

  // Use React.createElement instead of JSX for mocks
  const createMockIcon = (testId: string) => (props: React.SVGProps<SVGSVGElement>) => 
    React.createElement('svg', { 'data-testid': testId, ...props });

  return {
    ...original,
    Folder: createMockIcon('folder-icon'),
    FileText: createMockIcon('file-icon'),
    ChevronRight: createMockIcon('chevron-right-icon'),
    ChevronDown: createMockIcon('chevron-down-icon'),
    Download: createMockIcon('download-icon'),
    // Add other icons if needed by WorkspacePanel or its children
  };
});

// --- Mock Data Constants ---
export const mockNotebookId = 'test-notebook-ws';
export const mockInitialTodo = '# My Todos\n- Task 1';
export const mockInitialVFSState: VFSState = {
  '/': { type: 'folder', children: {
    'existing.md': { type: 'file', content: 'Existing file content' }
  } },
};
export const mockModel: AIModel = {
  id: 'test-model', name: 'Test Model', provider: 'openai',
  capabilities: { text: true, image: false, audio: false, computerUse: false },
  requiresApiKey: true
};
export const mockApiKeys = { openai: 'fake-api-key' };

// --- Mock WriteAgent ---
export let mockAgentInstance: { start: Mock, updateCallback?: (update: AgentUpdate) => void } | null = null;
export let updateCallsLog: AgentUpdate[] = []; // Export log for assertions

export const MockWriteAgent = vi.fn().mockImplementation(
  (model, apiKey, notebookId, todoList, updateCallback: (update: AgentUpdate) => void) => {
    const wrappedUpdateCallback = (update: AgentUpdate) => {
      updateCallsLog.push(update); // Log the call
      updateCallback(update);     // Call the original callback
    };

    mockAgentInstance = {
      start: vi.fn(async () => {
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Starting agent...' });
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Iteration 1/10...' });
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Executing tool: create_document...' });
        await new Promise(res => setTimeout(res, 1));
        // Simulate VFS call success triggering fileSystemChanged
        (VFS.writeFileVFS as Mock).mockReturnValue(true);
        VFS.writeFileVFS(notebookId, '/task1_output.md', 'Generated content for task 1');
        wrappedUpdateCallback({ fileSystemChanged: true });
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Tool create_document succeeded.' });
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Iteration 2/10...' });
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Agent decided to finish.' });
        await new Promise(res => setTimeout(res, 1));
        wrappedUpdateCallback({ status: 'Agent finished.' });
      }),
      updateCallback: wrappedUpdateCallback,
    };
    return mockAgentInstance;
  }
);

// --- Setup Function for beforeEach ---
export function setupMocks() {
  vi.clearAllMocks();
  updateCallsLog = []; // Clear log

  // Reset mocks to default states
  (useParams as Mock).mockReturnValue({ id: mockNotebookId });
  (useNotebookData as Mock).mockReturnValue({
    selectedModel: mockModel,
    sources: [],
    messages: [],
    notes: [],
    todoMarkdown: mockInitialTodo,
    todos: [], // Default to empty for general setup, override in specific tests if needed
    setTodos: vi.fn(),
    vfsState: mockInitialVFSState,
    setVfsState: vi.fn((newState) => {
        // Simulate state update within the hook mock itself
        (useNotebookData as Mock).mockReturnValue({
            ...(useNotebookData as Mock)(), // Get current mocked value
            vfsState: newState // Update only vfsState
        });
    }),
    saveNotebookToLocalStorage: vi.fn(),
  });
  (useApiKeys as Mock).mockReturnValue({ apiKeys: mockApiKeys });
  (VFS.getFileSystemStateVFS as Mock).mockReturnValue(mockInitialVFSState);
  (VFS.readFileVFS as Mock).mockImplementation((id, path) => {
      if (id !== mockNotebookId) return null; // Basic check
      if (path === '/existing.md') return 'Existing file content';
      // Allow reading the file created by the mock agent
      // Ensure type assertion is correctly applied when accessing .mock
      if (path === '/task1_output.md' && (VFS.writeFileVFS as Mock).mock.calls.some(call => call[1] === path)) {
          return 'Generated content for task 1';
      }
      return null;
  });
  (VFS.writeFileVFS as Mock).mockReturnValue(true); // Default success
  (VFS.exportToZipVFS as Mock).mockResolvedValue(undefined); // Default success
  (WriteAgent as Mock).mockImplementation(MockWriteAgent); // Use the exported mock
}
