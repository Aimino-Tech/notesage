import React, { useEffect, useRef } from 'react';
import { Source } from '@/types/types';
import { cn } from '@/lib/utils';

interface TextViewerProps {
  source: Source;
  className?: string;
  searchText?: string;
}

export function TextViewer({ source, className, searchText }: TextViewerProps) {
  const textContentRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (textContentRef.current) {
      const preElement = textContentRef.current;
      const originalContent = source.content || ""; // Get original content

      if (!searchText) {
        // Restore original content if search text is cleared
        preElement.textContent = originalContent;
        return;
      }

      // Escape searchText for regex
      const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escapedSearchText) {
        preElement.textContent = originalContent; // Restore original if search is empty after escape
        return;
      }
      const regex = new RegExp(`(${escapedSearchText})`, 'gi');

      // Create highlighted HTML
      const highlightedHtml = originalContent.replace(
        regex,
        (match) => `<mark style="background-color: yellow; color: black;">${match}</mark>`
      );

      // Set innerHTML (use with caution, but source.content is generally controlled)
      preElement.innerHTML = highlightedHtml;

      // Scroll to the first highlight
      // Use setTimeout to ensure the browser has rendered the marks
      setTimeout(() => {
        const highlightedElement = preElement.querySelector('mark');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // 100ms delay might need adjustment

    }
  }, [searchText, source.content]); // Rerun when searchText or source content changes

  return (
    <div className={cn("p-4", className)}>
      <pre ref={textContentRef} className="whitespace-pre-wrap text-sm">
        {/* Initial render with original content, highlighting is done via useEffect */}
        {source.content || "No content available."}
      </pre>
    </div>
  );
}
