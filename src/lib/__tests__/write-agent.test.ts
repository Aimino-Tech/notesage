import { describe, it, expect, vi, beforeEach, Mock, afterEach } from 'vitest'; // Import Mock type & afterEach
import { WriteAgent } from '../write-agent'; // Adjust path if needed
import { generateTextCompletion } from '../llm-completion'; // Mock this
// Import the VFS functions directly for mocking and calling
import { writeFileVFS, mkdirVFS, readFileVFS, getFileSystemStateVFS } from '../vfs';
import type { AIModel } from '@/types/types'; // Import type

// Mock dependencies
vi.mock('../llm-completion', () => ({
  generateTextCompletion: vi.fn(),
}));
// Mock VFS functions directly
vi.mock('../vfs', () => ({
  writeFileVFS: vi.fn(() => true),
  mkdirVFS: vi.fn(() => true),
  readFileVFS: vi.fn(() => null),
  getFileSystemStateVFS: vi.fn(() => ({ '/': { type: 'folder', children: {} } })),
}));

const mockModel: AIModel = {
  id: 'mock-model',
  name: 'Mock Model',
  provider: 'openai', // Use a valid provider for consistency
  capabilities: { text: true, image: false, audio: false, computerUse: false },
  requiresApiKey: true,
};

const mockApiKey = 'mock-api-key';
const mockNotebookId = 'test-notebook-agent';
const mockTodoList = `
- Create introduction.md
- Create chapter1.md with content "Chapter 1 content"
- Create folder /images
- Create conclusion.md
`;

// Add mock context documents
const mockContextDocuments: { name: string; content: string }[] = [
  { name: 'context1.md', content: 'Some context information.' },
  { name: 'context2.txt', content: 'More context.' },
];


describe('WriteAgent', () => {
  let agent: WriteAgent;
  let mockUpdateCallback: ReturnType<typeof vi.fn>;

  // Use beforeEach for setup common to most tests
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default VFS mocks (can be overridden in specific tests)
    (writeFileVFS as Mock).mockReturnValue(true);
    (mkdirVFS as Mock).mockReturnValue(true);
    (readFileVFS as Mock).mockReturnValue(null);

    mockUpdateCallback = vi.fn();
    // Agent instantiation moved to individual tests or a setup function if needed
  });

  // Helper to setup default successful agent run mock sequence
  const setupDefaultSuccessMock = () => {
    (generateTextCompletion as Mock)
      // Corrected format: Removed angle brackets and closing tag to match regex `tool_name(JSON_content)`
      .mockResolvedValueOnce('create_document({"path": "/introduction.md", "content": "Intro content"})')
      .mockResolvedValueOnce('create_document({"path": "/chapter1.md", "content": "Chapter 1 content"})')
      .mockResolvedValueOnce('create_folder({"path": "/images"})')
      .mockResolvedValueOnce('create_document({"path": "/conclusion.md", "content": "Conclusion content"})')
      .mockResolvedValueOnce('finish_writing({})');
  };

  const instantiateAgent = () => {
     agent = new WriteAgent(
      mockModel,
      mockApiKey,
      mockNotebookId,
      mockTodoList,
      mockContextDocuments, // Pass mock context documents
      mockUpdateCallback // Pass callback as the 6th argument
    );
  }

  it('should initialize correctly', () => {
    instantiateAgent(); // Instantiate here
    expect(agent).toBeInstanceOf(WriteAgent);
  });

  it('should call generateTextCompletion with the correct initial prompt', async () => {
    setupDefaultSuccessMock(); // Setup mock for this test
    instantiateAgent();
     await agent.start();
     // Check only the first call for the initial prompt
     // Removed: expect(generateTextCompletion).toHaveBeenCalledOnce(); - Check below verifies first call args
     expect(generateTextCompletion).toHaveBeenCalled(); // Ensure it was called at least once
     const firstCallArgs = (generateTextCompletion as Mock).mock.calls[0];
     expect(firstCallArgs[0]).toEqual(mockModel);
    expect(firstCallArgs[1]).toEqual(mockApiKey);
    expect(firstCallArgs[2]).toContain(mockTodoList); // Initial user prompt
    expect(firstCallArgs[3]).toContain('You are an AI assistant'); // System prompt
  });

  it('should execute file system actions based on sequential LLM responses', async () => {
    setupDefaultSuccessMock();
    instantiateAgent();
    await agent.start();
    expect(writeFileVFS).toHaveBeenNthCalledWith(1, mockNotebookId, '/introduction.md', 'Intro content');
    expect(writeFileVFS).toHaveBeenNthCalledWith(2, mockNotebookId, '/chapter1.md', 'Chapter 1 content');
    expect(mkdirVFS).toHaveBeenNthCalledWith(1, mockNotebookId, '/images');
    expect(writeFileVFS).toHaveBeenNthCalledWith(3, mockNotebookId, '/conclusion.md', 'Conclusion content');
    expect(writeFileVFS).toHaveBeenCalledTimes(3);
    expect(mkdirVFS).toHaveBeenCalledTimes(1);
  });

  it('should call update callback with actual status updates', async () => {
    setupDefaultSuccessMock();
    instantiateAgent();
    await agent.start();
    const calls = mockUpdateCallback.mock.calls;

    // Check the sequence of status updates more carefully, matching WriteAgentUpdate type
    let callIndex = 0;
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Starting agent...' });

    // Iteration 1
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Iteration 1/10...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Executing tool: create_document...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'fileSystemChanged' }); // VFS success triggers this first
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Tool create_document succeeded.' });

    // Iteration 2
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Iteration 2/10...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Executing tool: create_document...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'fileSystemChanged' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Tool create_document succeeded.' });

     // Iteration 3
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Iteration 3/10...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Executing tool: create_folder...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'fileSystemChanged' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Tool create_folder succeeded.' });

     // Iteration 4
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Iteration 4/10...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Executing tool: create_document...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'fileSystemChanged' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Tool create_document succeeded.' });

     // Iteration 5 (Finish)
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Iteration 5/10...' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Agent decided to finish.' });
    expect(calls[callIndex++][0]).toEqual({ type: 'status', message: 'Agent finished.' });

    // Check if fileSystemChanged was called appropriately (at least once)
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'fileSystemChanged' }));
  });

   it('should handle generateTextCompletion errors during loop', async () => {
    const errorMessage = 'LLM failed on second call';
    // Specific mock setup for this test
    (generateTextCompletion as Mock)
        .mockResolvedValueOnce('create_document({"path": "/file1.md", "content": "Content 1"})') // Iteration 1 ok - Corrected format
        .mockRejectedValueOnce(new Error(errorMessage)); // Iteration 2 fails
    instantiateAgent();
    await agent.start();

    // Check final status reflects failure, matching WriteAgentUpdate type
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent failed.' }));
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: errorMessage }));
    // Check VFS call for the first iteration only
    expect(writeFileVFS).toHaveBeenCalledOnce();
    expect(writeFileVFS).toHaveBeenCalledWith(mockNotebookId, '/file1.md', 'Content 1');
    expect(mkdirVFS).not.toHaveBeenCalled();
  });

  it('should handle non-tool string from generateTextCompletion', async () => {
    // Specific mock setup for this test
    (generateTextCompletion as Mock).mockResolvedValue('this is not a tool call');
    instantiateAgent();
    await agent.start();

    // Check status updates, matching WriteAgentUpdate type
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Starting agent...' }));
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Iteration 1/10...' }));
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent did not call a tool. Finishing...' }));
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent finished.' }));
    expect(writeFileVFS).not.toHaveBeenCalled();
    expect(mkdirVFS).not.toHaveBeenCalled();
  });

   it('should handle invalid tool format from LLM', async () => {
     // Specific mock setup for this test - Use a format the regex won't match
     (generateTextCompletion as Mock).mockResolvedValue('invalid_tool_format without parentheses');
     instantiateAgent();
     await agent.start();

     // Check status updates, matching WriteAgentUpdate type
     expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent did not call a tool. Finishing...' }));
     expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent finished.' }));
     expect(writeFileVFS).not.toHaveBeenCalled();
     expect(mkdirVFS).not.toHaveBeenCalled();
   });

   it('should handle invalid tool params from LLM', async () => {
     // Specific mock setup for this test - Corrected format, but invalid JSON params
     (generateTextCompletion as Mock).mockResolvedValue('create_document({"path": "/test.txt"})'); // Missing 'content'
     instantiateAgent();
     await agent.start();

     // Agent should log warning but finish loop as no valid tool call executed, matching WriteAgentUpdate type
     expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent did not call a tool. Finishing...' }));
     expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent finished.' }));
     expect(writeFileVFS).not.toHaveBeenCalled();
     expect(mkdirVFS).not.toHaveBeenCalled();
   });


  it('should handle VFS write errors during execution', async () => {
    // Specific mock setup for this test - Corrected format
    (generateTextCompletion as Mock)
      .mockResolvedValueOnce('create_document({"path": "/file1.md", "content": "Content 1"})') // Iteration 1 ok
      .mockResolvedValueOnce('create_document({"path": "/file2.md", "content": "Content 2"})') // Iteration 2 will fail VFS
      .mockResolvedValueOnce('finish_writing({})'); // Iteration 3 finish

    // Make the second writeFileVFS call fail
    (writeFileVFS as Mock)
        .mockReturnValueOnce(true) // First call succeeds
        .mockReturnValueOnce(false); // Second call fails
    instantiateAgent();
    await agent.start();

    // Check status updates reflect the tool failure, matching WriteAgentUpdate type
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Tool create_document failed.' }));
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('Failed to write document') })); // Check for error message
    // Check final status (agent continues and finishes)
    expect(mockUpdateCallback).toHaveBeenCalledWith(expect.objectContaining({ type: 'status', message: 'Agent finished.' }));

    // Check VFS calls
    expect(writeFileVFS).toHaveBeenCalledTimes(2); // Called twice (once success, once fail)
    expect(writeFileVFS).toHaveBeenNthCalledWith(1, mockNotebookId, '/file1.md', 'Content 1');
    expect(writeFileVFS).toHaveBeenNthCalledWith(2, mockNotebookId, '/file2.md', 'Content 2');
    expect(mkdirVFS).not.toHaveBeenCalled();
  });

  // Add more tests:
  // - Agent requiring API key but none provided (handled in WorkspacePanel, but could add defensive check here)
  // - Different todo list formats
  // - LLM response with readFile action (if implemented)
  // - Edge cases in paths (e.g., leading/trailing slashes, empty paths)

});
