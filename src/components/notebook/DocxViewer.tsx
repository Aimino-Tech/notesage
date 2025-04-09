import React, { useState, useEffect } from 'react';
import { Source } from '@/types/types';
import mammoth from "mammoth";
import { cn } from '@/lib/utils';

interface DocxViewerProps {
  source: Source;
  className?: string;
}

export function DocxViewer({ source, className }: DocxViewerProps) {
  const [docxContent, setDocxContent] = useState<string>("");
  const [docxError, setDocxError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (source.fileDataUrl) {
      setIsLoading(true);
      setDocxError(null); // Clear previous errors
      const loadDocx = async () => {
        try {
          // Check if content is already available (e.g., from previous extraction)
          if (source.content && source.content !== '[DOCX Content Placeholder]') {
             console.log("Using pre-extracted DOCX content from source object.");
             // Assuming source.content holds the HTML string here
             setDocxContent(source.content); 
          } else if (source.fileDataUrl) {
            console.log("Fetching and converting DOCX...");
            const response = await fetch(source.fileDataUrl);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocxContent(result.value);
          } else {
             throw new Error("No fileDataUrl available to load DOCX.");
          }
        } catch (error) {
          console.error("Error loading DOCX:", error);
          setDocxError("Failed to load DOCX file");
          setDocxContent(""); // Clear content on error
        } finally {
          setIsLoading(false);
        }
      };
      loadDocx();
    } else {
        setDocxError("Source does not have a fileDataUrl for DOCX viewing.");
        setDocxContent("");
    }
  }, [source.fileDataUrl, source.content]); // Rerun if fileDataUrl or content changes

  return (
    <div className={cn("p-4", className)}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">Loading DOCX...</div>
      ) : docxError ? (
        <div className="flex items-center justify-center h-full text-red-500">{docxError}</div>
      ) : (
        <div
          className="prose max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: docxContent }}
        />
      )}
    </div>
  );
}
