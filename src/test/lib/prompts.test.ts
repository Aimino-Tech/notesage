import { describe, it, expect } from 'vitest';
import { getPrompt } from '@/lib/prompts'; // Import the actual function

describe('getPrompt', () => {
  const mockContent = 'This is the document content.';
  const mockQuestion = 'What is this document about?';

  it('should generate the correct document_answer prompt', () => {
    const prompt = getPrompt('document_answer', mockContent, mockQuestion);
    // Check for the core instructions and structure
    expect(prompt).toContain('You are an AI assistant. Your task is to answer the user\'s question based *strictly* and *only* on the provided text context below.');
    expect(prompt).toContain('Provided Context:');
    expect(prompt).toContain(mockContent); // Ensure the actual content is included
    expect(prompt).toContain('User Question:');
    expect(prompt).toContain(mockQuestion); // Ensure the actual question is included
    expect(prompt).toContain('Answer based *only* on the context provided above.');
    // Note: Citation instructions seem to be part of the system prompt, not this specific prompt generation.
   });

   it('should generate the correct document_overview prompt', () => {
    const prompt = getPrompt('document_overview', mockContent);
    expect(prompt).toContain('Analyze the following document and generate a comprehensive overview.');
    expect(prompt).toContain('Respond ONLY with a valid JSON object');
    expect(prompt).toContain('"summary":');
    expect(prompt).toContain('"outline":');
    expect(prompt).toContain('"keyPoints":');
    expect(prompt).toContain('"qa":');
    expect(prompt).toContain(mockContent);
  });

  it('should generate the correct work_aid prompt with specific lowercase headers', () => {
    const prompt = getPrompt('work_aid', mockContent);
    expect(prompt).toContain('Based on the following document(s), please provide a comprehensive analysis using the EXACT following section headers:');
    expect(prompt).toContain('document summary:');
    expect(prompt).toContain('key highlights:');
    expect(prompt).toContain('work aid/checklist:');
    expect(prompt).toContain(mockContent);
    expect(prompt).toContain('Ensure your response uses ONLY these lowercase headers followed by a colon.');
    // Check that title case headers are NOT present
    expect(prompt).not.toContain('Document Summary');
    expect(prompt).not.toContain('Key Highlights');
    expect(prompt).not.toContain('Work Aid/Checklist');
  });

  it('should handle unknown prompt types gracefully', () => {
    // @ts-expect-error - Testing invalid type
    const prompt = getPrompt('unknown_type', mockContent);
    // Check for a generic fallback or warning message if applicable
    // Based on current implementation, it returns a generic string
    expect(prompt).toBe(`Generate content based on: ${mockContent}`);
    // Optionally check console warning if possible in test environment
  });

  it('should replace {question} placeholder correctly for relevant types', () => {
    const prompt = getPrompt('document_answer', mockContent, mockQuestion);
    expect(prompt).toContain(mockQuestion);
    expect(prompt).not.toContain('{question}');
  });

  it('should not replace {question} placeholder for irrelevant types', () => {
    const prompt = getPrompt('work_aid', mockContent, mockQuestion);
    expect(prompt).not.toContain(mockQuestion); // Question shouldn't be inserted
    expect(prompt).not.toContain('{question}'); // Placeholder shouldn't exist anyway for this type
  });
});
