import fetchMock from 'fetch-mock-jest';
// Vitest provides describe, it, expect, beforeEach, afterEach globally.
import { vi } from 'vitest';
import OpenAI from 'openai'; // Import OpenAI for mocking
import { generateDocumentSummary } from '../llm-summary'; // Import from llm-summary.ts
import { AIModel, DocumentSummary, QAPair } from '@/types/types'; // Ensure QAPair is imported

// Mock the getPrompt function using vi
vi.mock('../prompts', () => ({
  getPrompt: vi.fn((type: string, content: string) => `Mock prompt for ${type} with content: ${content}`),
}));

// Mock the OpenAI library specifically for Deepseek tests
const mockCreate = vi.fn();
vi.mock('openai', () => {
  // Mock the default export which is the OpenAI class
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate, // Use the mock function for create
      },
    },
    // Mock other methods if needed
  }));
  return { default: MockOpenAI };
});


describe('generateDocumentSummary', () => {
  const mockContent = 'This is the document content.';
  const mockApiKey = 'test-api-key';

  const mockOpenAIModel: AIModel = {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    capabilities: { text: true, image: false, audio: false, computerUse: false },
    requiresApiKey: true,
  };

  const mockGoogleModel: AIModel = {
    id: 'gemini-pro', // Keep original ID for model selection logic
    name: 'Gemini Pro',
    provider: 'google',
    capabilities: { text: true, image: false, audio: false, computerUse: false },
    requiresApiKey: true,
  };

  const mockAnthropicModel: AIModel = {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    capabilities: { text: true, image: false, audio: false, computerUse: false },
    requiresApiKey: true,
  };

  const mockOllamaModel: AIModel = {
    id: 'llama3',
    name: 'Llama 3 (Ollama)',
    provider: 'ollama',
    capabilities: { text: true, image: false, audio: false, computerUse: false },
    requiresApiKey: false,
    ollamaConfig: { host: 'http://localhost:11434', model: 'llama3' }
  };

  const mockDeepseekModel: AIModel = {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    capabilities: { text: true, image: false, audio: false, computerUse: false },
    requiresApiKey: true,
  };

  const validJsonResponse: DocumentSummary = {
    summary: 'This is a summary.',
    outline: '1. Point one\n2. Point two',
    keyPoints: '- Key point 1\n- Key point 2',
    qa: [{ question: 'Q1?', answer: 'A1.' }, { question: 'Q2?', answer: 'A2.' }],
    todos: 'Mock TODO list', // Added mock todos
    isValid: true,
    lastUpdated: expect.any(Date), // Use expect.any(Date) for dynamic date
  };

  beforeEach(() => {
    fetchMock.reset();
    mockCreate.mockClear(); // Clear the OpenAI mock
  });

  afterEach(() => {
    // Ensure fetchMock is always reset after each test
    fetchMock.reset();
  });

  it('should generate summary successfully with OpenAI (JSON mode)', async () => {
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      status: 200,
      body: {
        choices: [{ message: { content: JSON.stringify(validJsonResponse) } }],
      },
    });

    const result = await generateDocumentSummary(mockOpenAIModel, mockApiKey, mockContent);
    expect(result).toEqual(validJsonResponse);
    expect(fetchMock).toHaveFetched('https://api.openai.com/v1/chat/completions');
    const fetchOptions = fetchMock.lastOptions('https://api.openai.com/v1/chat/completions');
    // Add type check before parsing body
    expect(typeof fetchOptions?.body).toBe('string');
    if (typeof fetchOptions?.body === 'string') {
      expect(JSON.parse(fetchOptions.body).response_format).toEqual({ type: "json_object" });
    } else {
      // Fail test explicitly if body isn't a string as expected
      throw new Error('Expected fetch body to be a string in OpenAI test');
    }
  });

  it('should generate summary successfully with Google', async () => {
    // Match the model ID from the implementation (gemini-2.0-flash)
    const googleEndpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${mockApiKey}`;
    fetchMock.post(googleEndpoint, {
      status: 200,
      body: {
        candidates: [{ content: { parts: [{ text: JSON.stringify(validJsonResponse) }] } }],
      },
    });

    const result = await generateDocumentSummary(mockGoogleModel, mockApiKey, mockContent);
    expect(result).toEqual(validJsonResponse);
    // Use the updated model ID in the expected fetched URL
    expect(fetchMock).toHaveFetched(googleEndpoint);
  });

  it('should generate summary successfully with Anthropic', async () => {
    fetchMock.post('https://api.anthropic.com/v1/messages', {
      status: 200,
      body: {
        content: [{ text: JSON.stringify(validJsonResponse) }],
      },
    });

    const result = await generateDocumentSummary(mockAnthropicModel, mockApiKey, mockContent);
    expect(result).toEqual(validJsonResponse);
    expect(fetchMock).toHaveFetched('https://api.anthropic.com/v1/messages');
  });

  it('should generate summary successfully with Ollama', async () => {
    const ollamaEndpoint = mockOllamaModel.ollamaConfig?.host + '/api/generate';
    fetchMock.post(ollamaEndpoint, {
      status: 200,
      body: {
        response: JSON.stringify(validJsonResponse),
      },
    });

    const result = await generateDocumentSummary(mockOllamaModel, '', mockContent); // No API key for Ollama
    expect(result).toEqual(validJsonResponse);
    expect(fetchMock).toHaveFetched(ollamaEndpoint);
  });

  it('should generate summary successfully with Deepseek', async () => {
    // Configure the mock implementation for chat.completions.create
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validJsonResponse) } }],
    });

    const result = await generateDocumentSummary(mockDeepseekModel, mockApiKey, mockContent);

    // Assert the result
    expect(result).toEqual(validJsonResponse);

    // Assert that the mock was called with expected parameters
    expect(mockCreate).toHaveBeenCalledWith({
      model: mockDeepseekModel.id,
      messages: [{ role: 'user', content: expect.stringContaining('Mock prompt for document_overview') }],
      temperature: 0.3,
      // response_format is not explicitly set in deepseek provider
    });

    // No fetchMock assertion needed here anymore
    expect(fetchMock.calls()).toHaveLength(0); // Ensure fetch wasn't called for deepseek
  });

  it('should handle API errors gracefully', async () => {
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      status: 401,
      body: { error: { message: 'Invalid API key' } },
    });

    const result = await generateDocumentSummary(mockOpenAIModel, 'invalid-key', mockContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid API key');
    expect(result.summary).toBe('');
    expect(result.qa).toEqual([]);
  });

  it('should handle network errors gracefully', async () => {
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      throws: new Error('Network connection failed'),
    });

    const result = await generateDocumentSummary(mockOpenAIModel, mockApiKey, mockContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Network connection failed');
    expect(result.summary).toBe('');
    expect(result.qa).toEqual([]);
  });

  it('should handle invalid JSON response', async () => {
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      status: 200,
      body: {
        choices: [{ message: { content: 'This is not JSON { summary: ...' } }],
      },
    });

    const result = await generateDocumentSummary(mockOpenAIModel, mockApiKey, mockContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Failed to parse LLM response as valid JSON');
    expect(result.summary).toBe('');
    expect(result.qa).toEqual([]);
  });

  it('should handle JSON response wrapped in markdown fences', async () => {
    const wrappedJson = "```json\n" + JSON.stringify(validJsonResponse) + "\n```";
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      status: 200,
      body: {
        choices: [{ message: { content: wrappedJson } }],
      },
    });

    const result = await generateDocumentSummary(mockOpenAIModel, mockApiKey, mockContent);
    expect(result).toEqual(validJsonResponse);
  });

  it('should handle JSON response missing required keys', async () => {
    const incompleteJson = {
      summary: 'Only summary provided.',
      // outline, keyPoints, qa are missing
    };
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      status: 200,
      body: {
        choices: [{ message: { content: JSON.stringify(incompleteJson) } }],
      },
    });

    const result = await generateDocumentSummary(mockOpenAIModel, mockApiKey, mockContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('LLM response missing required keys: outline, keyPoints, qa');
    expect(result.summary).toBe('');
    expect(result.qa).toEqual([]);
  });

  it('should handle JSON response with invalid Q&A structure', async () => {
    const invalidQaJson = {
      ...validJsonResponse,
      qa: [{ question: "Q1?" }, { answer: "A2." }] // Missing answer/question
    };
    fetchMock.post('https://api.openai.com/v1/chat/completions', {
      status: 200,
      body: {
        choices: [{ message: { content: JSON.stringify(invalidQaJson) } }],
      },
    });

    const result = await generateDocumentSummary(mockOpenAIModel, mockApiKey, mockContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid Q&A structure in LLM response');
    expect(result.summary).toBe('');
    expect(result.qa).toEqual([]);
  });

  it('should throw error for unsupported provider', async () => {
    const unsupportedModel: AIModel = {
      id: 'unsupported-model',
      name: 'Unsupported Model',
      provider: 'local', // Assuming 'local' is unsupported by this function
      capabilities: { text: true, image: false, audio: false, computerUse: false },
      requiresApiKey: false,
    };

    const result = await generateDocumentSummary(unsupportedModel, '', mockContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unsupported provider for document summary: local');
    expect(result.summary).toBe('');
    expect(result.qa).toEqual([]);
  });
});
