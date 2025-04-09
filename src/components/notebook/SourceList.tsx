import React from 'react';
import { Source } from "@/types/types";
import { SourceItem } from "@/components/ui/source-item";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SourceListProps {
  sources: Source[]; // Expects already filtered sources
  selectedSourceIds: Set<string>;
  activeSourceId: string | null;
  searchQuery: string; // Needed for empty state message
  onCheckboxChange: (sourceId: string, checked: boolean | 'indeterminate') => void;
  onSourceClick: (source: Source) => void;
  onRenameSource?: (sourceId: string, newName: string) => void;
  onDownloadSource?: (source: Source) => void;
  onDeleteSource?: (sourceId: string) => void;
}

export function SourceList({
  sources,
  selectedSourceIds,
  activeSourceId,
  searchQuery,
  onCheckboxChange,
  onSourceClick,
  onRenameSource,
  onDownloadSource,
  onDeleteSource,
}: SourceListProps) {

  if (sources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        {searchQuery ? (
          <>
            <p className="text-muted-foreground mb-2">No results found</p>
            <p className="text-sm text-muted-foreground">Try a different search.</p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mb-2">No sources available</p>
            <p className="text-sm text-muted-foreground">Add sources using the button above.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="px-4 py-2 space-y-1">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center gap-2">
            <Checkbox
              id={`select-${source.id}`}
              checked={selectedSourceIds.has(source.id)}
              onCheckedChange={(checked) => onCheckboxChange(source.id, checked)}
              aria-label={`Select ${source.name}`}
            />
            <SourceItem
              source={source}
              isActive={source.id === activeSourceId}
              onClick={() => onSourceClick(source)}
              onRename={onRenameSource}
              onDownload={onDownloadSource}
              onDelete={onDeleteSource}
              className="flex-grow"
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
