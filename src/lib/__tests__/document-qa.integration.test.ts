import { describe, it, expect } from 'vitest';
import { getDocumentAnswer } from '../document-qa';
import { Source, AIModel } from '@/types/types';

// --- Integration Test ---
// This test makes real API calls to Google AI using the provided key.
// It's marked with '.skip' by default to avoid running during normal unit tests.
// Remove '.skip' to run it manually for verification.

describe.skip('getDocumentAnswer Integration Test', () => { // Added .skip back
  it('should get an answer from Google Flash using real API call', async () => {
    const apiKey = 'AIzaSyA9XhV3NVLZnGrtGaVFi54Mkwu5KcG8x2s'; // Hardcoded API key for testing
    const model: AIModel = {
      // Using gemini-2.0-flash-exp as requested by user, adding required fields based on type
      id: 'gemini-2.0-flash-exp', // Updated model ID
      name: 'Google Flash Exp', // Updated name for clarity
      provider: 'google',
      capabilities: { // Added based on type definition and typical Google model capabilities
        text: true,
        image: true, // Flash models often support image input
        audio: false,
        computerUse: false, // Assuming no computer use capability
      },
      requiresApiKey: true, // Added based on type definition
      maxTokens: 8192, // Kept existing value
      // Removed config, isDefault, supportsSystemPrompt, supportsVision as they are not top-level fields in AIModel type
    };

    const sources: Source[] = [
      {
        id: 'doc1',
        name: 'Fruit Colors',
        content: 'Apples are typically red or green.\nSometimes they can be yellow.\nPears are usually green or yellow.',
        type: 'text',
        dateAdded: new Date(), // Added missing dateAdded
        summary: { // Provide simple summaries for the selection stage
          summary: 'This document talks about the colors of apples and pears.',
          outline: '', keyPoints: '', qa: [], todos: '', isValid: true, lastUpdated: new Date()
        }
      },
      {
        id: 'doc2',
        name: 'Vegetable Info',
        content: 'Carrots are orange.\nBroccoli is green.\nLettuce is also green.',
        type: 'text',
        dateAdded: new Date(), // Added missing dateAdded
        summary: { // Provide simple summaries for the selection stage
          summary: 'This document lists the colors of carrots, broccoli, and lettuce.',
          outline: '', keyPoints: '', qa: [], todos: '', isValid: true, lastUpdated: new Date()
        }
      },
    ];

    const question = 'What color are apples?';

    console.log('--- Starting Integration Test ---');
    console.log('Model:', model.id);
    console.log('Question:', question);
    console.log('Sources:', sources.map(s => s.name));

    try {
      const result = await getDocumentAnswer(question, sources, model, apiKey, 'cite'); // Provide a default AI mode for the test

      console.log('--- Integration Test Result ---');
      console.log('Answer:', result.answer);
      console.log('Citations:', result.citations);

      // Basic assertions
      expect(result).toBeDefined();
      expect(typeof result.answer).toBe('string');
      expect(result.answer.length).toBeGreaterThan(0); // Expect some answer text
      expect(result.answer).not.toContain('Sorry, I encountered an error');
      expect(Array.isArray(result.citations)).toBe(true);
      // We can't reliably assert the exact answer/citations from the LLM,
      // but we expect it to not be an error message and to have the correct structure.

    } catch (error) {
      console.error('Integration test failed:', error);
      // Fail the test explicitly if an error is thrown
      expect(error).toBeNull(); // This will cause the test to fail and log the error
    }
  }, 60000); // Increase timeout for API calls
});
