import React, { useState } from 'react';
import { Source } from '@/types/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  source: Source;
  className?: string;
}

export function ImageViewer({ source, className }: ImageViewerProps) {
  const [isImageOpen, setIsImageOpen] = useState(false);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    // Attempt to prevent infinite loop if placeholder also fails, though unlikely
    if (!img.src.endsWith('/placeholder.svg')) { 
      img.src = '/placeholder.svg'; 
    }
  };

  return (
    <>
      <div className={cn("h-full w-full flex items-center justify-center p-4", className)}>
        <img
          src={source.fileDataUrl || source.content} // Use fileDataUrl first if available
          alt={source.name}
          className="max-h-full max-w-full cursor-pointer object-contain"
          onClick={() => setIsImageOpen(true)}
          onError={handleImageError}
        />
      </div>
      <AlertDialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <AlertDialogContent
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto p-0 bg-transparent border-none shadow-none flex items-center justify-center" // Adjusted styles for better centering and less intrusion
        >
          {/* Close button positioned relative to the content area */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-50 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white" // Improved styling
            onClick={() => setIsImageOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
          {/* Image container */}
          <div className="flex items-center justify-center w-full h-full p-0"> 
            <img
              src={source.fileDataUrl || source.content}
              alt={source.name}
              className="block max-h-[90vh] max-w-[90vw] object-contain" // Ensure image scales correctly
              onError={handleImageError}
            />
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
