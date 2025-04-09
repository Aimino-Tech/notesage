import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * File splitting utility functions
 */

export interface FileSplit {
  path: string;
  content: string;
  part: number;
  totalParts: number;
}

/**
 * Checks if a file is too large and needs to be split
 * @param content The file content to check
 * @param maxLines Maximum number of lines per file (default: 500)
 * @returns Object with detection result and message
 */
export function detectLargeFile(content: string, maxLines = 500): { isLarge: boolean; message: string; lineCount: number } {
  const lines = content.split('\n');
  const lineCount = lines.length;
  
  if (lineCount <= maxLines) {
    return { 
      isLarge: false, 
      message: "", 
      lineCount 
    };
  }
  
  // Calculate parts based on lines for the message, even though splitting considers chars too
  const parts = Math.ceil(lineCount / maxLines);
  return {
    isLarge: true,
    // Update message to mention both limits implicitly handled by splitFileContent
    message: `⚠️ Large file detected (${lineCount} lines) - This file will be split into multiple parts based on line and character limits to ensure processability.`,
    lineCount
  };
}

/**
 * Splits a file content into multiple parts if it exceeds the maximum line limit.
 * @param content The content of the file to split
 * @param filePath The original file path
 * @param maxLines Maximum number of lines per chunk (default: 500)
 * @param maxChars Maximum number of characters per chunk (default: 8000)
 * @returns Array of FileSplit objects containing the path and content for each part
 */
export function splitFileContent(
  content: string,
  filePath: string,
  maxLines = 500,
  maxChars = 8000 // Reduce default character limit
): FileSplit[] {
  const lines = content.split('\n');
  const totalLines = lines.length;
  const result: FileSplit[] = [];
  let currentChunkLines: string[] = [];
  let currentChunkChars = 0;
  let partCounter = 1;

  // Get the base name and extension for creating split file names
  const pathParts = filePath.split('/');
  const fileName = pathParts.pop() || '';
  const fileNameWithoutExt = fileName.includes('.')
    ? fileName.substring(0, fileName.lastIndexOf('.'))
    : fileName;
  const extension = fileName.includes('.')
    ? fileName.substring(fileName.lastIndexOf('.'))
    : '';
  const basePath = pathParts.join('/') + (pathParts.length > 0 ? '/' : '');


  // Helper function to finalize and add a chunk
  const addChunk = () => {
    if (currentChunkLines.length > 0) {
      const chunkContent = currentChunkLines.join('\n');
      const chunkPath = `${basePath}${fileNameWithoutExt}_part${partCounter}${extension}`;
      result.push({
        path: chunkPath,
        content: chunkContent,
        part: partCounter,
        totalParts: -1 // Placeholder, will be updated later
      });
      partCounter++;
      currentChunkLines = [];
      currentChunkChars = 0;
    }
  };

  // Iterate through lines, creating chunks based on limits
  for (const line of lines) {
    const lineLength = line.length + 1; // +1 for the newline character

    // Check if adding the current line exceeds limits
    if (
      currentChunkLines.length > 0 && // Ensure chunk isn't empty before checking limits
      (currentChunkLines.length >= maxLines || currentChunkChars + lineLength > maxChars)
    ) {
      addChunk(); // Finalize the current chunk
    }

    // Add the line to the current chunk
    currentChunkLines.push(line);
    currentChunkChars += lineLength;
  }

  // Add the last remaining chunk
  addChunk();

  // Update totalParts for all chunks
  const totalParts = result.length;
  result.forEach(part => part.totalParts = totalParts);

  // If only one part was created, return it with the original file path
  if (result.length === 1) {
    result[0].path = filePath; // Use original path if not split
    return [{
      path: filePath,
      content,
      part: 1,
      totalParts: 1
    }];
  }
  
  return result;
}

/**
 * Creates an index file that references all parts of a split file
 * @param originalPath The original file path
 * @param parts Array of FileSplit objects
 * @returns The content for an index file
 */
export function createSplitFileIndex(originalPath: string, parts: FileSplit[]): string {
  if (parts.length <= 1) {
    return '';
  }
  
  const fileName = originalPath.split('/').pop() || originalPath;
  
  return `# ${fileName} (Split File Index)

This file was split due to size limitations (max 500 lines per file).

Original file: ${fileName}

## Parts:
${parts.map(part => 
  `${part.part}. [Part ${part.part}](${part.path.split('/').pop()}) - ${countLines(part.content)} lines`
).join('\n')}
`;
}

/**
 * Count the number of lines in a string
 * @param content The content to count lines in
 * @returns Number of lines
 */
function countLines(content: string): number {
  return content.split('\n').length;
}
