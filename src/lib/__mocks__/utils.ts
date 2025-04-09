import { vi } from 'vitest';

// Make sure we're importing the actual module and its exports
const actual = await vi.importActual('@/lib/utils');

export const cn = actual.cn;

// Mock utility functions that need custom behavior for tests
export const detectLargeFile = vi.fn().mockImplementation((content, maxLines = 500) => {
  const lines = content.split('\n');
  const lineCount = lines.length;
  const isLarge = lineCount > maxLines;
  
  const parts = Math.ceil(lineCount / maxLines);
  
  return {
    isLarge,
    lineCount,
    message: isLarge 
      ? `⚠️ Large file detected (${lineCount} lines) - This file will be split into ${parts} parts based on line and character limits to ensure processability.`
      : ''
  };
});

export const splitFileContent = vi.fn().mockImplementation((content, maxLines = 500) => {
  const lines = content.split('\n');
  const parts = Math.ceil(lines.length / maxLines);
  
  const result = [];
  for (let i = 0; i < parts; i++) {
    const start = i * maxLines;
    const end = Math.min((i + 1) * maxLines, lines.length);
    result.push(lines.slice(start, end).join('\n'));
  }
  
  return result;
});

export const formatBytes = vi.fn().mockImplementation((bytes) => {
  if (bytes === 0) return '0 Bytes';
  return `${bytes} bytes`;
});

// Re-export everything else from the actual module
Object.entries(actual).forEach(([key, value]) => {
  if (!exports[key]) {
    exports[key] = value;
  }
});