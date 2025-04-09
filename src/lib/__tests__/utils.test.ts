// Use Vitest globals (describe, it, expect) - no explicit import needed
// Make sure vite.config.ts has `test: { globals: true }`
import { cn, detectLargeFile } from "../utils"; // Adjust the import path as necessary, added detectLargeFile
import { describe, it, expect } from 'vitest';
import { splitFileContent, createSplitFileIndex } from '../utils';

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const hasError = false;
    expect(cn("base", isActive && "active", hasError && "error")).toBe("base active");
  });

  it("should handle arrays of class names", () => {
    expect(cn(["p-4", "m-2"], "border")).toBe("p-4 m-2 border");
  });

  it("should handle objects with conditional classes", () => {
    expect(cn({ "font-bold": true, "italic": false }, "text-lg")).toBe("font-bold text-lg");
  });

  it("should override conflicting Tailwind classes", () => {
    // twMerge should handle this: p-4 overrides p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
    // twMerge should handle this: text-green-500 overrides text-red-500
    expect(cn("text-red-500", "bg-blue-100", "text-green-500")).toBe("bg-blue-100 text-green-500");
  });

  it("should handle mixed types of inputs", () => {
    expect(cn("base", ["p-4", { "m-2": true }], null, "text-xl")).toBe("base p-4 m-2 text-xl"); // Replaced false && "hidden" with null
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle null and undefined inputs gracefully", () => {
    expect(cn("text-red", null, "bg-blue", undefined)).toBe("text-red bg-blue");
  });
});

describe('File Splitting Utilities', () => {

  describe('detectLargeFile', () => {
    it('should detect a file under the limit as not large', () => {
      const content = 'Line 1\nLine 2';
      const result = detectLargeFile(content, 5);
      expect(result.isLarge).toBe(false);
      expect(result.lineCount).toBe(2);
      expect(result.message).toBe('');
    });

    it('should detect a file exactly at the limit as not large', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const result = detectLargeFile(content, 5);
      expect(result.isLarge).toBe(false);
      expect(result.lineCount).toBe(5);
      expect(result.message).toBe('');
    });

    it('should detect a file over the limit as large and calculate parts', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
      const result = detectLargeFile(content, 5);
       expect(result.isLarge).toBe(true);
       expect(result.lineCount).toBe(6);
       expect(result.message).toContain('This file will be split into multiple parts'); // Check for the current message part
       // expect(result.message).toContain('maximum of 5 lines'); // Remove old assertion
     });

     it('should use default maxLines of 500 if not provided', () => {
      const lines = Array.from({ length: 501 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      const result = detectLargeFile(content); // No maxLines argument
       expect(result.isLarge).toBe(true);
       expect(result.lineCount).toBe(501);
       expect(result.message).toContain('This file will be split into multiple parts'); // Check for the current message part
       // expect(result.message).toContain('maximum of 500 lines'); // Remove old assertion
     });

     it('should handle empty content', () => {
      const content = '';
      const result = detectLargeFile(content, 5);
      expect(result.isLarge).toBe(false);
      expect(result.lineCount).toBe(1); // split('\n') on empty string results in ['']
      expect(result.message).toBe('');
    });

     it('should handle content with only newline characters', () => {
      const content = '\n\n\n'; // 4 lines
      const result = detectLargeFile(content, 3);
       expect(result.isLarge).toBe(true);
       expect(result.lineCount).toBe(4);
       expect(result.message).toContain('This file will be split into multiple parts'); // Updated expectation
     });
   }); // <-- Close describe block for detectLargeFile


  describe('splitFileContent', () => {
    it('should not split files under the line and character limits', () => {
    const content = 'Line 1\nLine 2\nLine 3'; // Small content
    const result = splitFileContent(content, '/test.txt', 500, 20000); // High limits

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/test.txt'); // Should use original path
    expect(result[0].content).toBe(content);
    expect(result[0].part).toBe(1);
    expect(result[0].content).toBe(content);
    expect(result[0].part).toBe(1);
    expect(result[0].totalParts).toBe(1);
  });

  it('should split files over the line limit (using default char limit)', () => {
    // Create a file with 600 short lines (likely under default char limit per 500 lines)
    const lines = Array.from({ length: 600 }, (_, i) => `L${i + 1}`);
    const content = lines.join('\n');
    const maxLines = 500;
    // Uses default maxChars = 8000

    const result = splitFileContent(content, '/path/to/many-lines.md', maxLines); // Use default char limit

    // Should create 2 parts based on line limit
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('/path/to/many-lines_part1.md');
    expect(result[0].part).toBe(1);
    expect(result[0].totalParts).toBe(2);
    expect(result[0].content.split('\n').length).toBe(500); // First part has 500 lines
    expect(result[1].path).toBe('/path/to/many-lines_part2.md');
    expect(result[1].part).toBe(2);
    expect(result[1].totalParts).toBe(2);
    expect(result[1].content.split('\n').length).toBe(100); // Second part has remaining 100 lines
  });

   it('should split files over the character limit (using default line limit)', () => {
    // Create 10 lines, each 1000 chars long = 10 * (1000 + 1 newline) = 10010 chars
    const longLine = 'a'.repeat(1000);
    const lines = Array.from({ length: 10 }, (_, i) => `${longLine} ${i + 1}`); // Total ~10k chars
    const content = lines.join('\n');
    // Uses default maxLines = 500
    const maxChars = 8000; // Default char limit

    const result = splitFileContent(content, '/path/to/long-lines.txt', undefined, maxChars); // Use default line limit

    // Should split based on character limit (8000 chars), likely into 2 parts
    expect(result.length).toBe(2); // Expecting 2 parts (approx 8 lines in first, 2 in second)
    expect(result[0].content.length).toBeLessThanOrEqual(maxChars + 1000); // Allow leeway
    expect(result[0].content.split('\n').length).toBeLessThan(500); // Should be less than maxLines
    expect(result[0].path).toBe('/path/to/long-lines_part1.txt');
    expect(result[1].path).toBe('/path/to/long-lines_part2.txt');
    // Verify total parts is set correctly
    const totalParts = result.length;
    result.forEach(part => expect(part.totalParts).toBe(totalParts));
  });


  it('should handle files with extension correctly when splitting', () => {
    const lines = Array.from({ length: 700 }, (_, i) => `Line ${i + 1}`);
    const content = lines.join('\n');
    
    const result = splitFileContent(content, '/test.txt', 500);
    
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('/test_part1.txt');
    expect(result[1].path).toBe('/test_part2.txt');
  });

  it('should handle files without extension correctly', () => {
    const lines = Array.from({ length: 700 }, (_, i) => `Line ${i + 1}`);
    const content = lines.join('\n');
    
    const result = splitFileContent(content, '/README', 500);
    
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('/README_part1');
    expect(result[1].path).toBe('/README_part2');
  });

  it('should create index file content with links to all parts', () => {
    const parts = [
      {
        path: '/docs/large-file_part1.md',
        content: Array.from({ length: 500 }, (_, i) => `Line ${i + 1}`).join('\n'),
        part: 1,
        totalParts: 3
      },
      {
        path: '/docs/large-file_part2.md',
        content: Array.from({ length: 500 }, (_, i) => `Line ${i + 501}`).join('\n'),
        part: 2,
        totalParts: 3
      },
      {
        path: '/docs/large-file_part3.md',
        content: Array.from({ length: 100 }, (_, i) => `Line ${i + 1001}`).join('\n'),
        part: 3,
        totalParts: 3
      }
    ];
    
    const indexContent = createSplitFileIndex('/docs/large-file.md', parts);
    
    expect(indexContent).toContain('# large-file.md (Split File Index)');
    expect(indexContent).toContain('Original file: large-file.md');
    expect(indexContent).toContain('1. [Part 1](large-file_part1.md) - 500 lines');
    expect(indexContent).toContain('2. [Part 2](large-file_part2.md) - 500 lines');
    expect(indexContent).toContain('3. [Part 3](large-file_part3.md) - 100 lines');
  });
  
  it('should return empty string for index when there is only one part', () => {
    const parts = [
      {
        path: '/docs/small-file.md',
        content: 'Small file content',
        part: 1,
        totalParts: 1
      }
    ];
    
    const indexContent = createSplitFileIndex('/docs/small-file.md', parts);
    expect(indexContent).toBe('');
  });
}); // <-- Close describe block for splitFileContent
}); // <-- Add missing closing brace for the top-level describe block
