import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SourcePanel } from "@/components/notebook/source-panel";
import { ChatPanel } from "@/components/notebook/chat-panel";
import { StudioPanel } from "@/components/notebook/studio-panel";
import { WorkspacePanel } from "@/components/notebook/workspace-panel"; // Added WorkspacePanel import
import { supportedModels } from "@/types/types"; // Changed from mockModels
import { ArrowLeft, Settings, Maximize2, Minimize2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels"; // Restore PanelHandle type
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotebookData } from "@/hooks/useNotebookData"; // Import new data hook
import { useNotebookActions } from "@/hooks/useNotebookActions"; // Import remaining actions hook
import { useSourceActions } from "@/hooks/useSourceActions"; // Import source actions hook
import { useNoteActions } from "@/hooks/useNoteActions"; // Import new note actions hook
import { useApiKeys } from "@/hooks/useApiKeys"; // Import usseApiKeys hook
import { Source, Citation, DocumentSummary, Note, SourceStatus, SourceType } from "@/types/types"; // Added Note type import, SourceStatus, SourceType
import { FileViewer } from "@/components/notebook/file-viewer";
import { NoteViewer } from "@/components/notebook/NoteViewer"; // Import NoteViewer
import { AddSourceDialog, ProcessedSourceData } from "@/components/ui/add-source-dialog"; // Import AddSourceDialog and the processed data type
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating IDs

const NotebookDetail = () => {
  const { id } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const [viewingSource, setViewingSource] = useState<Source | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null); // State for viewing a note
  const [searchText, setSearchText] = useState<string | undefined>(undefined);
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined); // State for target page number
  const [activeTab, setActiveTab] = useState<string>("sources");
  type ViewMode = 'normal' | 'chatMaximized' | 'leftPanelMaximized';
  const [viewMode, setViewMode] = useState<ViewMode>('normal'); // Restore viewMode for desktop layout
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false); // State for initial add source dialog
  const leftPanelRef = useRef<ImperativePanelHandle>(null); // Restore Left Panel ref
  const rightPanelRef = useRef<ImperativePanelHandle>(null); // Restore Right Panel ref

  // Use the custom hooks
  const {
    notebook,
    sources,
    setSources,
    messages,
    setMessages,
    notes,
    setNotes,
    selectedModel,
    setSelectedModel,
    selectedAIMode, // Get AI mode state
    setSelectedAIMode, // Get AI mode setter
    // isLoading, // Removed unused state
    // setIsLoading, // Removed unused state setter
    saveNotebookToLocalStorage,
    selectedSourceIds, // Get selected IDs from hook
    setSelectedSourceIds, // Get setter from hook
  } = useNotebookData(id);

  const handleClearHistory = () => {
    setMessages([]);
  };

  // Effect to show Add Source dialog for new notebooks without sources (once per session)
  useEffect(() => {
    if (notebook && sources && sources.length === 0 && id !== 'create') {
      const storageKey = `addSourceDialogShown_${notebook.id}`;
      const alreadyShown = sessionStorage.getItem(storageKey);

      if (!alreadyShown) {
        console.log(`Notebook ${notebook.id} has no sources, showing AddSourceDialog.`);
        setIsAddSourceDialogOpen(true);
        sessionStorage.setItem(storageKey, 'true'); // Mark as shown for this session
      }
    }
  }, [notebook, sources, id]); // Depend on notebook, sources, and id

  // Effect to handle collapsible panel behavior
  useEffect(() => {
    if (!isMobile) {
      if (viewMode === 'normal') {
        rightPanelRef.current?.resize(35);
        leftPanelRef.current?.resize(65);
      } else if (viewMode === 'chatMaximized') {
        rightPanelRef.current?.resize(100);
        leftPanelRef.current?.resize(0);
      } else if (viewMode === 'leftPanelMaximized') {
        rightPanelRef.current?.resize(0);
        leftPanelRef.current?.resize(100);
      }
    }
  }, [viewMode, isMobile]);


  // Removed local handleSourceSelectionChange handler

  // Get API key status
  const { isApiKeyValid } = useApiKeys(); // Correct function name
  const hasValidApiKey = selectedModel ? isApiKeyValid(selectedModel.provider) : false; // Use correct function

  // Function to update the summary of the currently viewing source
  const handleUpdateViewingSourceSummary = (updatedSummary: DocumentSummary | null) => {
    if (!viewingSource) return;
    setSources(prevSources =>
      prevSources.map(s =>
        s.id === viewingSource.id ? { ...s, summary: updatedSummary } : s
      )
    );
    // Optionally trigger saveNotebookToLocalStorage here if needed immediately
    // saveNotebookToLocalStorage(); // Consider performance implications
  };

  // Custom handler for citation clicks
  const handleCitationClick = (citation: Citation) => {
    const source = sources.find(s => s.id === citation.sourceId);
    if (source && citation.pageNumber !== undefined) {
      setViewingSource(source);
      setSearchText(citation.searchText); // Keep search text for potential highlighting
      setTargetPage(citation.pageNumber); // Set the target page number
      setActiveTab("sources"); // Switch to sources tab
    } else if (source) {
      // Fallback if page number is missing
      setViewingSource(source);
      setSearchText(citation.searchText);
      setTargetPage(undefined); // Ensure target page is reset
      setActiveTab("sources");
      console.warn("Citation clicked, but page number is missing:", citation);
    }
  };

  // Reset targetPage when viewingSource changes (e.g., viewer closed or different source opened)
  useEffect(() => {
    if (!viewingSource) {
      setTargetPage(undefined);
    }
    // We might want to reset targetPage even if the source *changes* but isn't closed.
    // Consider if targetPage should persist if user clicks another citation for the *same* open doc.
    // For now, reset whenever viewingSource changes at all.
    // setTargetPage(undefined); // Uncomment this line if page should reset when switching sources directly
  }, [viewingSource]);

  // Get remaining actions (chat, generation) from the main actions hook
  const {
    handleSendMessage,
    // Note actions removed
    handleGenerate,
    // Source actions removed
    isGeneratingContent, // State for specific generation actions
    isSendingMessage, // State for chat message sending
    // handleCitationClick is still returned but not needed here directly, passed to ChatPanel
  } = useNotebookActions({
    sources,
    setSources,
    messages,
    setMessages,
    notes,
    setNotes,
    selectedModel,
    selectedAIMode, // Pass selectedAIMode
    setViewingNote, // Pass the setter
    saveNotebookToLocalStorage,
  });

  // handleSourcesAdded and mapFileTypeToSourceType removed, logic moved to useSourceActions hook

  // Get source-specific actions from the new hook
  const {
    handleAddProcessedSources, // Get the new handler from the hook
    handleRenameSource,
    handleDownloadSource,
    handleDeleteSource,
    handleAddText, // This now uses handleAddProcessedSources internally in the hook
    handleAddLink, // This now uses handleAddProcessedSources internally in the hook
    isProcessingSources, // Get loading state if needed
  } = useSourceActions({
    sources,
    setSources, // Pass setSources so the hook can update state
    selectedModel,
    messages, // Pass messages for saving context
    notes, // Pass notes for saving context
    saveNotebookToLocalStorage,
  });

  // Get note-specific actions from the new hook
  const {
    handleAddNote,
    handleNoteClick,
    handleDeleteNote,
    handleRenameNote,
    handleDownloadNote,
  } = useNoteActions({
    notes,
    setNotes,
    setViewingNote,
    sources, // Pass sources for saving context
    messages, // Pass messages for saving context
    saveNotebookToLocalStorage,
  });

  // Wrapper for handleSendMessage to include selectedSourceIds
  const sendMessageWithSelectedSources = (message: string) => {
    handleSendMessage(message, selectedSourceIds); // Pass the current selectedSourceIds state
  };

  // Loading/Not Found state check
  if (!notebook && id !== "create") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/30">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Notebook not found</h1>
          <p className="text-muted-foreground">
            The requested notebook does not exist or has been deleted.
          </p>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <> {/* Wrap everything in a fragment */}
    <div className="h-screen bg-gradient-to-b from-background to-secondary/20 flex flex-col">
      <header className="border-b bg-background/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-semibold truncate">{notebook?.title || "Untitled Notebook"}</h1>
          </div>

          {/* Settings button - Maximize buttons moved to panels */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {isMobile ? (
          // Mobile View: Use Tabs, hide content based on viewMode
          <Tabs value={viewMode === 'chatMaximized' ? 'chat' : (viewMode === 'leftPanelMaximized' ? activeTab : activeTab)} onValueChange={setActiveTab} className="h-full flex flex-col">
            {viewMode === 'normal' && ( // Only show tabs list in normal mode
              <TabsList className="grid w-full grid-cols-4 sticky top-[65px] z-10 bg-background border-b rounded-none"> {/* Changed grid-cols-3 to grid-cols-4 */}
                <TabsTrigger value="sources">Sources</TabsTrigger>
                <TabsTrigger value="workspace">Workspace</TabsTrigger> {/* Added Workspace Trigger */}
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="studio">Studio</TabsTrigger>
              </TabsList>
            )}
            {/* Sources Tab Content */}
            <TabsContent value="sources" className={`flex-1 ${viewMode === 'chatMaximized' ? 'hidden' : ''}`}>
              {/* TODO: Add Maximize button for left panel here if needed for mobile */}
              {viewingSource ? (
                <FileViewer
                  source={viewingSource}
                  searchText={searchText}
                  targetPage={targetPage} // Pass targetPage prop
                  onClose={() => {
                    setViewingSource(null);
                    setSearchText(undefined);
                    // Target page is reset via useEffect on viewingSource change
                  }}
                  className="h-full"
                  // Pass the update handler
                  onUpdateSummary={handleUpdateViewingSourceSummary}
                  // TODO: Implement retry logic if needed
                  // onRetryProcessing={() => { /* ... */ }}
                />
                ) : (
                  <SourcePanel
                    sources={sources}
                    onSourceSelect={setViewingSource}
                    // onFilesAdded={handleAddFiles} // Remove old prop
                    onSourcesAdded={handleAddProcessedSources} // Use the handler from the hook
                    onTextAdded={handleAddText}
                    onLinkAdded={handleAddLink}
                  onRenameSource={handleRenameSource}
                  onDownloadSource={handleDownloadSource}
                  onDeleteSource={handleDeleteSource}
                  // Pass selection state and handler from hook
                  selectedSourceIds={selectedSourceIds}
                  onSelectionChange={setSelectedSourceIds} // Pass setter directly
                    />
                  )}
                </TabsContent>
                {/* Chat Tab Content */}
            <TabsContent value="chat" className={`flex-1 overflow-auto ${viewMode === 'leftPanelMaximized' ? 'hidden' : ''}`}>
              <ChatPanel
                messages={messages}
                onSendMessage={sendMessageWithSelectedSources} // Use the wrapper function
                // Pass viewMode and setViewMode to ChatPanel
                viewMode={viewMode}
                setViewMode={setViewMode}
                className="h-full"
                availableModels={supportedModels} // Changed from mockModels
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                 onCitationClick={handleCitationClick}
                 sources={sources}
                 isGenerating={isSendingMessage} // Pass isSendingMessage for chat loading state
                 onGenerateWorkAid={() => handleGenerate('work_aid')}
                 onGenerateFAQ={() => handleGenerate('faq')} // Add FAQ handler
                onGenerateBriefing={() => handleGenerate('briefing')} // Add Briefing handler
                onGenerateTimeline={() => handleGenerate('timeline')} // Add Timeline handler
                // Pass AI Mode props
                selectedAIMode={selectedAIMode}
                onSelectAIMode={setSelectedAIMode}
                // Pass selected source IDs
                selectedSourceIds={selectedSourceIds}
                onClearHistory={handleClearHistory}
              />
            </TabsContent>
            {/* Studio Tab Content */}
            <TabsContent value="studio" className={`flex-1 overflow-y-auto ${viewMode === 'chatMaximized' ? 'hidden' : ''}`}>
              {/* TODO: Add Maximize button for left panel here if needed for mobile */}
              {viewingNote ? (
                <NoteViewer
                  note={viewingNote}
                  onClose={() => setViewingNote(null)}
                  className="h-full"
                />
              ) : (
                <StudioPanel
                  notes={notes}
                  onAddNote={handleAddNote}
                  onNoteClick={handleNoteClick}
                  onDeleteNote={handleDeleteNote}
                  onRenameNote={handleRenameNote}
                  onDownloadNote={handleDownloadNote}
                  onGenerate={handleGenerate}
                  // Pass down model and API key status
                  selectedModel={selectedModel}
                  hasValidApiKey={hasValidApiKey}
                  className="p-4" // Add padding back if needed inside StudioPanel
                />
              )}
            </TabsContent>
            {/* Workspace Tab Content */}
            <TabsContent value="workspace" className={`flex-1 p-4 ${viewMode === 'chatMaximized' ? 'hidden' : ''}`}>
              {/* WorkspacePanel now gets selectedSourceIds from hook */}
              <WorkspacePanel />
            </TabsContent>
          </Tabs>
        ) : (
          // Desktop View: Chat panel on left, other panels on right
          <ResizablePanelGroup direction="horizontal" className="h-full [&>div[data-panel-group-handle]]:hidden">
            {/* Chat Panel */}
            <ResizablePanel
              ref={rightPanelRef}
              defaultSize={35}
              minSize={0}
              maxSize={100}
              collapsedSize={0}
              collapsible={true}
              className={`flex flex-col ${viewMode === 'leftPanelMaximized' ? 'hidden' : ''}`}
            >
              <ChatPanel
                messages={messages}
                onSendMessage={sendMessageWithSelectedSources}
                viewMode={viewMode}
                setViewMode={setViewMode}
                className="h-full"
                availableModels={supportedModels}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                onCitationClick={handleCitationClick}
                sources={sources}
                isGenerating={isSendingMessage}
                onGenerateWorkAid={() => handleGenerate('work_aid')}
                onGenerateFAQ={() => handleGenerate('faq')}
                onGenerateBriefing={() => handleGenerate('briefing')}
                onGenerateTimeline={() => handleGenerate('timeline')}
                selectedAIMode={selectedAIMode}
                onSelectAIMode={setSelectedAIMode}
                selectedSourceIds={selectedSourceIds}
                onClearHistory={handleClearHistory}
              />
            </ResizablePanel>

            {/* Source/Workspace/Studio Panel */}
            <ResizablePanel
              ref={leftPanelRef}
              defaultSize={65}
              minSize={0}
              maxSize={100}
              collapsedSize={0}
              collapsible={true}
              className={`bg-card border-l flex flex-col min-h-0 ${viewMode === 'chatMaximized' ? 'hidden' : ''}`}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  {/* Header for Left Panel Tabs + Maximize Button */}
                  <div className="flex items-center justify-between border-b pr-2">
                  <TabsList className="grid w-full grid-cols-3 bg-background rounded-none border-b-0"> {/* Changed grid-cols-2 to grid-cols-3 */}
                    <TabsTrigger value="sources">Sources</TabsTrigger>
                    <TabsTrigger value="workspace">Workspace</TabsTrigger> {/* Added Workspace Trigger */}
                    <TabsTrigger value="studio">Studio</TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    // Restore onClick to toggle viewMode state
                    onClick={() => setViewMode(viewMode === 'leftPanelMaximized' ? 'normal' : 'leftPanelMaximized')}
                  >
                    {/* Update icon based on viewMode state */}
                    {viewMode === 'leftPanelMaximized' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="sr-only">{viewMode === 'leftPanelMaximized' ? "Minimize Panel" : "Maximize Panel"}</span>
                  </Button>
                </div>
                {/* Sources Content */}
                <TabsContent value="sources" className="flex-1 overflow-y-auto">
                  {viewingSource ? (
                    <FileViewer
                      source={viewingSource}
                      searchText={searchText}
                      targetPage={targetPage} // Pass targetPage prop
                      onClose={() => {
                        setViewingSource(null);
                        setSearchText(undefined);
                        // Target page is reset via useEffect on viewingSource change
                      }}
                      className="h-full"
                      // Pass the update handler
                      onUpdateSummary={handleUpdateViewingSourceSummary}
                      // TODO: Implement retry logic if needed
                      // onRetryProcessing={() => { /* ... */ }}
                    />
                  ) : (
                    <SourcePanel
                      sources={sources}
                      onSourceSelect={setViewingSource}
                      // onFilesAdded={handleAddFiles} // Remove old prop
                      onSourcesAdded={handleAddProcessedSources} // Use the handler from the hook
                      onTextAdded={handleAddText}
                      onLinkAdded={handleAddLink}
                      onRenameSource={handleRenameSource}
                      onDownloadSource={handleDownloadSource}
                      onDeleteSource={handleDeleteSource}
                      // Pass selection state and handler from hook
                      selectedSourceIds={selectedSourceIds}
                      onSelectionChange={setSelectedSourceIds} // Pass setter directly
                    />
                  )}
                </TabsContent>
                <TabsContent value="studio" className="flex-1 p-0 overflow-y-auto">
                  {viewingNote ? (
                    <NoteViewer
                      note={viewingNote}
                      onClose={() => setViewingNote(null)}
                      className="h-full" // Ensure it fills the panel
                    />
                  ) : (
                    <StudioPanel
                      notes={notes}
                      onAddNote={handleAddNote}
                      onNoteClick={handleNoteClick}
                      onDeleteNote={handleDeleteNote}
                      onRenameNote={handleRenameNote}
                      onDownloadNote={handleDownloadNote}
                      onGenerate={handleGenerate}
                      className="p-4" // Add padding back if needed inside StudioPanel
                      // Pass down model and API key status
                      selectedModel={selectedModel}
                      hasValidApiKey={hasValidApiKey}
                    />
                  )}
                </TabsContent>
                  {/* Workspace Content */}
                  <TabsContent value="workspace" className="flex-1 p-0 overflow-y-auto">
                     {/* WorkspacePanel now gets selectedSourceIds from hook */}
                    <WorkspacePanel />
                  </TabsContent>
                </Tabs>
              </ResizablePanel>

          </ResizablePanelGroup>
        )}
      </main>
    </div>

      {/* Initial Add Source Dialog */}
      <AddSourceDialog
        open={isAddSourceDialogOpen} // Correct prop name: open instead of isOpen
        onOpenChange={setIsAddSourceDialogOpen} // Allow closing via overlay click or X button
        onSourcesAdd={(processedSources) => { // Correct prop name: onSourcesAdd
          handleAddProcessedSources(processedSources); // Use the hook's function
          setIsAddSourceDialogOpen(false); // Close dialog after adding
        }}
        onTextAdd={handleAddText} // Pass text handler
        onLinkAdd={handleAddLink} // Pass link handler
      />
    </>
  );
};

export default NotebookDetail;
