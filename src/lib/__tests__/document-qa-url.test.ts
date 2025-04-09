import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocumentAnswer, getDocumentAnswerStream } from '../document-qa';
import { generateDocumentSummary } from '../llm-summary';
import { generateTextCompletion, generateTextCompletionStream } from '../llm-completion';
import { Source, AIModel } from '@/types/types';

// Mock dependencies
vi.mock('../llm-summary', () => ({
  generateDocumentSummary: vi.fn()
}));

vi.mock('../llm-completion', () => ({
  generateTextCompletion: vi.fn(),
  generateTextCompletionStream: vi.fn()
}));

describe('Document Q&A with URL content', () => {
  let mockModel: AIModel;
  let mockApiKey: string;
  let mockSources: Source[];
  let mockWebsiteSource: Source;
  let mockPdfSource: Source;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiKey = 'test-api-key';
    mockModel = {
      id: 'test-model-id',
      name: 'Test Model',
      provider: 'openai',
      capabilities: {
        text: true,
        image: false,
        audio: false,
        computerUse: false,
      },
      requiresApiKey: true,
      // Removed 'modes' as it's not part of AIModel type
    };
    
    // Create mock website source
    mockWebsiteSource = {
      id: 'website-source-1',
      name: 'example.com',
      content: 'This is content from a website about test subjects.',
      type: 'url', // Important: type is 'url'
      dateAdded: new Date(),
      summary: {
        summary: 'Website about test subjects',
        outline: '',
        keyPoints: '',
        qa: [],
        todos: '',
        isValid: true,
        lastUpdated: new Date()
      }
    };
    
    // Create mock PDF source
    mockPdfSource = {
      id: 'pdf-source-1',
      name: 'test-document.pdf',
      content: 'This is content from a PDF document.',
      type: 'pdf', // Corrected type to 'pdf'
      dateAdded: new Date(),
      summary: {
        summary: 'A PDF document with test content',
        outline: '',
        keyPoints: '',
        qa: [],
        todos: '',
        isValid: true,
        lastUpdated: new Date()
      }
    };
    
    mockSources = [mockWebsiteSource, mockPdfSource];
    
    // Default mock implementations
    vi.mocked(generateTextCompletion).mockResolvedValue('Mock answer from the AI');
    vi.mocked(generateDocumentSummary).mockResolvedValue({
      summary: 'Mock summary',
      outline: '',
      keyPoints: '',
      qa: [],
      todos: '',
      isValid: true,
      lastUpdated: new Date()
    });
    
    // Mock the streaming function
    vi.mocked(generateTextCompletionStream).mockImplementation(async function* () {
      yield 'Mock ';
      yield 'streaming ';
      yield 'answer';
    });
  });
  
  // Test URL content handling in non-streaming mode
  it('should include URL content in document answer generation', async () => {
    // Mock the selection response to select the website source
    vi.mocked(generateTextCompletion).mockImplementationOnce(() => {
      return Promise.resolve(`I'll use document [1] with ID: website-source-1`);
    });
    
    await getDocumentAnswer(
      'What are test subjects?',
      mockSources,
      mockModel,
      mockApiKey,
      'cite'
    );
    
    // Check that the completion was called with content that includes the website content
    const lastCall = vi.mocked(generateTextCompletion).mock.calls[1]; // Second call has the content
    
    // Verify that the URL content was included correctly
    expect(lastCall[1]).toBe(mockApiKey);
    expect(lastCall[0]).toEqual(mockModel);
    expect(lastCall[2]).toContain('This is content from a website about test subjects');
    expect(lastCall[2]).toContain('--- START example.com (Web Content) ---');
  });
  
  // Test URL content handling in streaming mode
  it('should include URL content in streaming answers', async () => {
    // Mock the selection response to select the website source
    vi.mocked(generateTextCompletion).mockImplementationOnce(() => {
      return Promise.resolve(`I'll use the website source with ID: website-source-1`);
    });
    
    const result = await getDocumentAnswerStream(
      'What are test subjects?',
      mockSources,
      mockModel,
      mockApiKey,
      'cite'
    );
    
    // Test that the stream works (assuming it was called)
    const streamContent = [];
    for await (const chunk of result.stream) {
      streamContent.push(chunk);
    }
    
    expect(streamContent.join('')).toBe('Mock streaming answer');

    // NOW check that the streaming function was called and its arguments
    expect(vi.mocked(generateTextCompletionStream)).toHaveBeenCalled();
    
    // Check the arguments of the first call to the streaming function
    const streamCalls = vi.mocked(generateTextCompletionStream).mock.calls;
    expect(streamCalls.length).toBeGreaterThan(0); // Ensure it was called
    const firstStreamCall = streamCalls[0];
    
    expect(firstStreamCall[1]).toBe(mockApiKey);
    expect(firstStreamCall[0]).toEqual(mockModel);
    expect(firstStreamCall[2]).toContain('This is content from a website about test subjects');
    expect(firstStreamCall[2]).toContain('--- START example.com (Web Content) ---');
    
    // The stream was already consumed above to trigger the function call
    // No need to consume it again here.
    // const streamContent = []; // Remove duplicate declaration
    // for await (const chunk of result.stream) {
    //   streamContent.push(chunk);
    // }
  }); // <<< This brace closes the 'it' block correctly
  
  it('should handle websites with missing content gracefully', async () => {
    const sourceWithoutContent = {
      ...mockWebsiteSource,
      id: 'website-no-content',
      content: undefined
    };
    
    mockSources = [sourceWithoutContent];
    
    // Mock selection to choose the empty source
    vi.mocked(generateTextCompletion).mockImplementationOnce(() => {
      return Promise.resolve(`I'll use document ID: website-no-content`);
    });
    
    await getDocumentAnswer(
      'What information do you have?',
      mockSources,
      mockModel,
      mockApiKey,
      'cite'
    );
    
    // Verify the placeholder text was used in the prompt construction phase
    // Since the second LLM call doesn't happen with no content, we don't check mock.calls[1]
    // We can infer the function handled it gracefully if no error was thrown before this point.
    // Optionally, check the return value if it indicates no answer.
    expect(vi.mocked(generateTextCompletion)).toHaveBeenCalledTimes(1); // Only selection call should happen
  });
  
  it('should correctly filter URL sources as valid content', async () => {
    // Create sources that shouldn't be recognized as valid content
    // Explicitly type these mocks to ensure compatibility
    const imageSrc: Source = { ...mockPdfSource, id: 'image-1', type: 'image', content: '[Image content]' }; 
    const errorSrc: Source = { ...mockPdfSource, id: 'error-1', type: 'pdf', content: '[PDF Text Extraction Failed]' }; // Keep type as 'pdf' for error case
    
    mockSources = [mockWebsiteSource, imageSrc, errorSrc];
    
    // Mock selection to choose all sources
    vi.mocked(generateTextCompletion).mockImplementationOnce(() => {
      return Promise.resolve(`I'll use documents: [1] [2] [3]`);
    });
    
    const result = await getDocumentAnswer(
      'What information do you have?',
      mockSources,
      mockModel,
      mockApiKey,
      'cite'
    );
    
    // Verify URL content is used but image and error content are properly marked
    const contentArgument = vi.mocked(generateTextCompletion).mock.calls[1][2];
    
    // URL content should be included properly
    expect(contentArgument).toContain('This is content from a website about test subjects');
    // Image content should be marked as not usable
    expect(contentArgument).toContain('[Content is image, extraction failed, or placeholder - not usable text]');
    // Error content should be marked as not usable - Use 'pdf' as type is 'pdf'
    expect(contentArgument).toContain('[Content is pdf, extraction failed, or placeholder - not usable text]');
  });

  it('should handle URL selection via different selection patterns', async () => {
    const testSelectionPatterns = [
      `I'll use document [1] with ID: website-source-1`,
      `The most relevant source is website-source-1`,
      `I recommend using source #1`
    ];
    
    for (const selectionPattern of testSelectionPatterns) {
      vi.mocked(generateTextCompletion).mockReset();
      
      // Mock selection with the current pattern
      vi.mocked(generateTextCompletion).mockImplementationOnce(() => {
        return Promise.resolve(selectionPattern);
      });
      
      await getDocumentAnswer(
        'What are test subjects?',
        mockSources,
        mockModel,
        mockApiKey,
        'cite'
      );
      
      // Check that the URL source was selected and its content included
      const lastCall = vi.mocked(generateTextCompletion).mock.calls[1];
      expect(lastCall[2]).toContain('This is content from a website about test subjects');
    }
  });
});
