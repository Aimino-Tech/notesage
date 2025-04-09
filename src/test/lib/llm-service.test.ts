import { describe, it, expect, vi } from 'vitest';
import { parseWorkAidContent } from '@/lib/llm-parsers'; // Corrected import path

// Keep placeholder tests for general service if needed later
describe('LlmService (API Interaction - Placeholders)', () => {
  // TODO: Add setup mocks (e.g., for fetch or specific AI SDKs)

  it('should correctly format requests for the API', () => {
    // Test request formatting logic
    expect(true).toBe(true); // Placeholder
  });

  it('should handle successful API responses', async () => {
    // Mock a successful response
    // Call the service function
    // Assert the output is processed correctly
    expect(true).toBe(true); // Placeholder
  });

  it('should handle API errors gracefully', async () => {
    // Mock an error response
    // Call the service function
    // Assert that the error is handled as expected (e.g., throws specific error, returns null)
    expect(true).toBe(true); // Placeholder
  });

  // Add more tests for different providers (OpenAI, Anthropic, Google, Ollama) if logic differs
});

// --- Tests for parseWorkAidContent ---
describe('parseWorkAidContent', () => {
  it('should correctly parse content with all expected lowercase headers', () => {
    const text = `
document summary: This is the summary.
It can span multiple lines.

key highlights:
- Highlight 1
- Highlight 2

work aid/checklist:
* Action item 1
* Action item 2
    `;
    const expected = {
      summary: 'This is the summary.\nIt can span multiple lines.',
      highlights: '- Highlight 1\n- Highlight 2',
      checklist: '* Action item 1\n* Action item 2',
    };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

  it('should handle missing headers gracefully', () => {
    const text = `
document summary: Only summary is present.
key highlights: And highlights.
    `;
    const expected = {
      summary: 'Only summary is present.',
      highlights: 'And highlights.',
      checklist: '', // Checklist should be empty
    };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

  it('should handle headers appearing in different orders', () => {
    const text = `
key highlights: Highlights first.
work aid/checklist: Checklist second.
document summary: Summary last.
    `;
     const expected = {
      summary: 'Summary last.',
      highlights: 'Highlights first.',
      checklist: 'Checklist second.',
    };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

  it('should handle extra content before the first header or after the last', () => {
    const text = `
Some introductory text.
document summary: The summary.
key highlights: The highlights.
work aid/checklist: The checklist.
Some concluding text.
    `;
    const expected = {
      summary: 'The summary.',
      highlights: 'The highlights.',
      checklist: 'The checklist.\nSome concluding text.', // Concluding text gets attached to the last section
    };
    // Note: The current parser attaches trailing text to the last found section.
    // This test reflects that behavior. If different behavior is desired, the parser needs adjustment.
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

   it('should return empty sections for empty input', () => {
    const text = '';
    const expected = { summary: '', highlights: '', checklist: '' };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

  it('should return empty sections if no keywords are found', () => {
    const text = 'This text contains none of the required headers.';
    const expected = { summary: '', highlights: '', checklist: '' };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

  it('should handle case variations if the parser were case-insensitive (though prompt enforces lowercase)', () => {
    // This test assumes the parser *could* handle case variations, even if the prompt doesn't ask for it.
    // The current parser uses case-insensitive matching ('i' flag).
    const text = `
Document Summary: Summary text.
KEY HIGHLIGHTS: Highlights text.
Work aid/Checklist: Checklist text.
    `;
     const expected = {
      summary: 'Summary text.',
      highlights: 'Highlights text.',
      checklist: 'Checklist text.',
    };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });

   it('should handle headers without colons if the parser allowed it (current parser requires optional colon)', () => {
    // The current parser regex `^${keyword}:?\\s*` makes the colon optional.
    const text = `
document summary Summary text.
key highlights Highlights text.
work aid/checklist Checklist text.
    `;
     const expected = {
      summary: 'Summary text.',
      highlights: 'Highlights text.',
      checklist: 'Checklist text.',
    };
    expect(parseWorkAidContent(text)).toEqual(expected);
  });
});
