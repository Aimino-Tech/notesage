import { WorkAidContent } from '@/types/types'; // Assuming WorkAidContent is defined in types

/**
 * Parses the LLM response text for Work Aid content
 */
export function parseWorkAidContent(text: string): WorkAidContent {
  const sections: WorkAidContent = { summary: '', highlights: '', checklist: '' };
  if (!text) return sections;

  const keywordMappings: { [key: string]: keyof WorkAidContent } = {
    'document summary': 'summary',
    'key highlights': 'highlights',
    'work aid/checklist': 'checklist',
  };

  // Find all keyword occurrences with their indices
  const foundKeywords: { index: number; keyword: string; sectionKey: keyof WorkAidContent }[] = [];
  for (const keyword in keywordMappings) {
    // Match keyword case-insensitively, optionally followed by a colon and whitespace
    const regex = new RegExp(`^${keyword}:?\\s*`, 'im'); // Use ^ and m flag for start of line
    let match;
    let searchIndex = 0;
    // Find all occurrences, not just the first one
    while ((match = text.substring(searchIndex).search(regex)) !== -1) {
        const absoluteIndex = searchIndex + match;
        const matchedText = text.substring(absoluteIndex).match(regex)?.[0] || '';
        foundKeywords.push({
            index: absoluteIndex + matchedText.length, // Index *after* the keyword and colon/whitespace
            keyword: keyword,
            sectionKey: keywordMappings[keyword],
        });
        searchIndex = absoluteIndex + 1; // Continue search after the current match
    }
  }

  // If no keywords found, return empty sections (as per test expectation)
  if (foundKeywords.length === 0) {
    // console.warn("No keywords found in work aid content.");
    return sections;
  }

  // Sort keywords by their starting index
  foundKeywords.sort((a, b) => a.index - b.index);

  // Extract content between keywords
  for (let i = 0; i < foundKeywords.length; i++) {
    const current = foundKeywords[i];
    const next = foundKeywords[i + 1];
    const startIndex = current.index;
    // Adjust endIndex calculation to correctly find the start of the next keyword
    const endIndex = next ? text.substring(0, next.index).search(new RegExp(`^${next.keyword}:?\\s*`, 'im')) : text.length;
    const content = text.substring(startIndex, endIndex).trim();
    sections[current.sectionKey] = content;
  }

  // Basic validation or cleanup could be added here if needed

  return sections;
}
