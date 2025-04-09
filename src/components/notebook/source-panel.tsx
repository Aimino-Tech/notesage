
import { Source } from "@/types/types";
import { useState, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react"; // Import Plus icon
import { AddSourceDialog, ProcessedSourceData } from "@/components/ui/add-source-dialog"; // Import ProcessedSourceData

// Import the new SourceList component
import { SourceList } from './SourceList';

interface SourcePanelProps {
  sources: Source[];
  selectedSourceIds: Set<string>; // Added prop for selected IDs
  onSelectionChange: (selectedIds: Set<string>) => void; // Added prop for selection changes
  onSourceSelect?: (source: Source) => void;
  // onFilesAdded?: (files: FileList) => void; // Removed old prop
  onSourcesAdded?: (sourcesData: ProcessedSourceData[]) => void; // Added new prop
  onTextAdded?: (content: string, title: string) => void;
  onLinkAdded?: (url: string, title: string) => void;
  onRenameSource?: (sourceId: string, newName: string) => void;
  onDownloadSource?: (source: Source) => void;
  onDeleteSource?: (sourceId: string) => void;
  className?: string;
}

export function SourcePanel({
  sources,
  selectedSourceIds, // Destructure new prop
  onSelectionChange, // Destructure new prop
  onSourceSelect,
  // onFilesAdded, // Removed old prop
  onSourcesAdded, // Added new prop
  onTextAdded,
  onLinkAdded,
  onRenameSource,
  onDownloadSource,
  onDeleteSource,
  className
}: SourcePanelProps) {
  const initialSourceId = sources.length > 0 ? sources[0].id : null;
  const [activeSourceId, setActiveSourceId] = useState<string | null>(initialSourceId);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSourcePanelDialogOpen, setIsSourcePanelDialogOpen] = useState(false); // State for dialog in this panel

  const filteredSources = searchQuery
    ? sources.filter(source =>
        source.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sources;

  const handleSelectAll = () => {
    const allFilteredIds = new Set(filteredSources.map(s => s.id));
    onSelectionChange(allFilteredIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const handleCheckboxChange = (sourceId: string, checked: boolean | 'indeterminate') => {
    const newSelectedIds = new Set(selectedSourceIds);
    if (checked === true) {
      newSelectedIds.add(sourceId);
    } else {
      newSelectedIds.delete(sourceId);
    }
    onSelectionChange(newSelectedIds);
  };

  const handleSourceClick = (source: Source) => {
    setActiveSourceId(source.id);
    onSourceSelect?.(source);
  };

  return (
    // Removed h-full from here
    <div className={`flex flex-col h-full ${className}`}> 
      <div className="flex-shrink-0 p-4 space-y-4 bg-background">
        <h2 className="font-semibold text-lg">Sources</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex justify-between items-center">
          {/* Button to trigger the dialog */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start mr-2" // Added margin-right
            onClick={() => setIsSourcePanelDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add source
          </Button>
          {/* Select/Deselect Buttons */}
          <div className="flex gap-2 flex-shrink-0"> {/* Prevent shrinking */}
            <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={filteredSources.length === 0}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={selectedSourceIds.size === 0}>
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Render the SourceList component */}
      <SourceList
        sources={filteredSources}
        selectedSourceIds={selectedSourceIds}
        activeSourceId={activeSourceId}
        searchQuery={searchQuery} // Pass search query for empty state message
        onCheckboxChange={handleCheckboxChange}
        onSourceClick={handleSourceClick}
        onRenameSource={onRenameSource}
        onDownloadSource={onDownloadSource}
        onDeleteSource={onDeleteSource}
      />

      {/* Render the AddSourceDialog conditionally, passing state and handlers */}
      {onSourcesAdded && onTextAdded && onLinkAdded && (
        <AddSourceDialog
          open={isSourcePanelDialogOpen}
          onOpenChange={setIsSourcePanelDialogOpen}
          onSourcesAdd={onSourcesAdded}
          onTextAdd={onTextAdded}
          onLinkAdd={onLinkAdded}
        />
      )}
    </div>
  );
}
