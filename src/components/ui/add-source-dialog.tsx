import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload, FileText, LinkIcon, ExternalLink, AlertTriangle, Loader2, Info } from "lucide-react";
import { detectLargeFile, splitFileContent, FileSplit } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { extractTextFromPdf } from "@/lib/pdf-worker"; // Import PDF extractor
import { crawlWebsiteContent, WebCrawlError } from "@/lib/web-crawler"; // Import web crawler and error type
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating IDs

// Define the structure for processed sources (original files or split parts)
export interface ProcessedSourceData {
  name: string;
  content: string;
  type: string;
  originalFile: File; // Keep reference to the original file
  part?: number;      // Part number if split
  totalParts?: number;// Total parts if split
  originalId?: string; // ID linking parts of a split document
}

interface AddSourceDialogProps {
  onSourcesAdd: (sources: ProcessedSourceData[]) => void; // Renamed and updated prop
  onTextAdd: (text: string, title: string) => void;
  onLinkAdd: (url: string, title: string) => void;
  open: boolean; // Add open prop
  onOpenChange: (open: boolean) => void; // Add onOpenChange prop
}

export function AddSourceDialog({
  onSourcesAdd,
  onTextAdd,
  onLinkAdd,
  open, // Destructure new props
  onOpenChange // Destructure new props
}: AddSourceDialogProps) {
  // Remove internal state: const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [largeFileWarning, setLargeFileWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Add processing state
  const [isCrawling, setIsCrawling] = useState(false); // Add crawling state for websites
  const [crawlError, setCrawlError] = useState<{message: string, type: string} | null>(null); // New state for crawl errors

  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };


  // Function to process selected/dropped files
  const processFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setLargeFileWarning(null); // Reset warning
    const processedSources: ProcessedSourceData[] = [];
    let largeFileDetected = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isTextBased = file.type.startsWith('text/') ||
                          file.name.endsWith('.md') ||
                          file.name.endsWith('.txt') ||
                          file.name.endsWith('.csv') ||
                          file.name.endsWith('.json');
      const isPdf = file.type === 'application/pdf';
      // Add checks for other types like DOCX if specific extraction is needed

      if (isTextBased) {
        // --- Handle Text-Based Files ---
        try {
          const content = await readFileAsText(file);
          const { isLarge, message, lineCount } = detectLargeFile(content); // Default maxLines is 500

          if (isLarge) {
            largeFileDetected = true;
            const fileOriginalId = uuidv4(); // Generate ID for the original file being split
            setLargeFileWarning(prev => prev ? `${prev}\n${message}` : message); // Append warnings
            console.log(`Splitting large file: ${file.name} (${lineCount} lines), originalId: ${fileOriginalId}`);
            const parts: FileSplit[] = splitFileContent(content, file.name); // Use default maxLines
            parts.forEach(part => {
              processedSources.push({
                name: part.path.split('/').pop() || part.path, // Use the generated part name
                content: part.content,
                type: file.type,
                originalFile: file,
                part: part.part,
                totalParts: part.totalParts,
                originalId: fileOriginalId, // Assign the same originalId to all parts
              });
            });
          } else {
            // File is not large, add as a single source (no originalId needed unless we want consistency)
            // Let's add originalId = own id for non-split files for potential future use? Or keep undefined? Keep undefined for now.
            processedSources.push({
              name: file.name,
              content: content,
              type: file.type,
              originalFile: file,
              part: 1,
              totalParts: 1,
              // originalId: undefined // Explicitly undefined
            });
          }
        } catch (error) {
          console.error(`Error reading or processing text file ${file.name}:`, error);
           processedSources.push({ // Add with error message
              name: file.name,
              content: `Error reading text file: ${error instanceof Error ? error.message : String(error)}`,
              type: file.type,
              originalFile: file,
              part: 1,
              totalParts: 1,
          });
        }
      } else if (isPdf) {
          // --- Handle PDF Files ---
          try {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            console.log(`Processing PDF: ${file.name}`);
            const extractedContent = await extractTextFromPdf(arrayBuffer);
            console.log(`Extracted ${extractedContent.length} characters from ${file.name}`);

            // Now check the *extracted text* for size and split if needed
            const { isLarge, message, lineCount } = detectLargeFile(extractedContent); // Check extracted content
            console.log(`PDF ${file.name}: Extracted lines = ${lineCount}, Is large = ${isLarge}`);

            if (isLarge) {
              largeFileDetected = true;
              const pdfOriginalId = uuidv4(); // Generate ID for the original PDF being split
              setLargeFileWarning(prev => prev ? `${prev}\n${message}` : message);
              console.log(`Splitting large PDF (extracted text): ${file.name} (${lineCount} lines), originalId: ${pdfOriginalId}`);
              // Split the *extracted content*, using the original PDF filename for part naming
              const parts: FileSplit[] = splitFileContent(extractedContent, file.name); // Use default maxLines (500)
              console.log(`Split PDF ${file.name} into ${parts.length} parts.`);
              parts.forEach((part, index) => {
                 console.log(`Adding part ${index + 1}/${parts.length} for ${file.name}`);
                 processedSources.push({
                  name: part.path.split('/').pop() || part.path,
                  content: part.content,
                  type: file.type, // Keep original PDF type
                  originalFile: file,
                  part: part.part,
                  totalParts: part.totalParts,
                  originalId: pdfOriginalId, // Assign the same originalId to all parts
                });
              });
            } else {
              // PDF text is not large, add as a single source
              // Add originalId = own id for non-split files for potential future use? Or keep undefined? Keep undefined for now.
              processedSources.push({
                name: file.name,
                content: extractedContent, // Store extracted text
                type: file.type, // Keep original PDF type
                originalFile: file,
                part: 1,
                totalParts: 1,
                // originalId: undefined // Explicitly undefined
              });
            }
          } catch(error) {
             console.error(`Error extracting text from PDF file ${file.name}:`, error);
             // Set specific content indicating extraction failure, suggest possible reasons
             const extractionErrorMsg = error instanceof Error ? error.message : String(error);
             processedSources.push({
                name: file.name,
                content: `[PDF Text Extraction Failed: ${extractionErrorMsg}. The PDF might be image-only or corrupted.]`,
                type: file.type,
                originalFile: file,
                part: 1,
                totalParts: 1,
            });
          }
      } else {
         // --- Handle Other File Types (Images, Audio, DOCX etc.) ---
         // For now, add them without attempting content extraction here.
         // Content extraction/handling for these types might happen later or in viewers.
         // We pass an empty string or placeholder for content.
         // DOCX extraction could be added here similarly to PDF if needed upfront.
          processedSources.push({
            name: file.name,
            content: `[${file.type} content - view in viewer]`, // Placeholder content
            type: file.type,
            originalFile: file,
            part: 1,
            totalParts: 1,
          });
      }
    }

    if (processedSources.length > 0) {
      onSourcesAdd(processedSources); // Call the updated prop
    }

    setIsProcessing(false);
    if (!largeFileDetected) { // Only close if no warning needs to be shown potentially
        onOpenChange(false); // Use the prop to signal closing
    }
    // If largeFileDetected is true, the warning will be displayed, leave dialog open.
  };


  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      // Assign dropped files to the input for consistency if needed, though not strictly necessary
      // if (fileInputRef.current) {
      //   fileInputRef.current.files = files;
      // }
      processFiles(files); // Process the dropped files
    }
  };


  const handleTextContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setTextContent(content);
    
    // Check if text content is large and show warning
    const { isLarge, message } = detectLargeFile(content);
    if (isLarge) {
      setLargeFileWarning(message);
    } else {
      setLargeFileWarning(null);
    }
  };

  // New function to process website URL and extract content
  const handleAddWebsiteLink = async () => {
    if (!url.trim()) return;
    
    // Reset previous errors
    setCrawlError(null);
    
    try {
      setIsCrawling(true);
      
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      
      // Extract hostname for the title (validation is now handled in crawlWebsiteContent)
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname;
      
      console.log(`Crawling website: ${normalizedUrl}`);
      
      // Fetch and extract website content with a timeout of 45 seconds
      const websiteContent = await crawlWebsiteContent(normalizedUrl, { timeout: 45000 });
      
      console.log(`Extracted ${websiteContent.length} characters from ${normalizedUrl}`);
      
      // Check if content is large
      const { isLarge, message, lineCount } = detectLargeFile(websiteContent);
      
      if (isLarge) {
        const websiteOriginalId = uuidv4();
        setLargeFileWarning(message);
        
        // Split large website content
        const parts = splitFileContent(websiteContent, `${hostname}.txt`);
        const processedSources: ProcessedSourceData[] = parts.map(part => ({
          name: part.path.split('/').pop() || part.path,
          content: part.content,
          type: 'text/plain',
          originalFile: new File([part.content], part.path.split('/').pop() || part.path, { type: 'text/plain' }),
          part: part.part,
          totalParts: part.totalParts,
          originalId: websiteOriginalId, // The generated ID that connects all parts
        }));
        
        onSourcesAdd(processedSources);
      } else {
        // Use the onSourcesAdd directly for consistency
        const processedSource: ProcessedSourceData = {
          name: `${hostname}.txt`,
          content: websiteContent,
          type: 'text/plain',
          originalFile: new File([websiteContent], `${hostname}.txt`, { type: 'text/plain' }),
          part: 1,
          totalParts: 1,
          originalId: uuidv4(), // Add originalId for consistency with large files
        };
        
        onSourcesAdd([processedSource]);
        onOpenChange(false); // Use the prop to signal closing
      }

      // Clear URL input
      setUrl('');
    } catch (error) {
      console.error('Error crawling website:', error);
      
      // Format error message and type based on WebCrawlError information
      let errorMessage = 'Unknown error occurred while crawling the website';
      let errorType = 'UNKNOWN';
      
      if (error instanceof WebCrawlError) {
        errorType = error.errorType;
        errorMessage = error.message;
        
        // Set specific error display message for common error types
        setCrawlError({
          message: errorMessage,
          type: errorType
        });
      } else {
        setCrawlError({
          message: `Error crawling website: ${error instanceof Error ? error.message : String(error)}`,
          type: 'UNKNOWN'
        });
      }
      
      // Get a clean domain name for the error source
      const domainName = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      
      // Create error source with detailed diagnostics to show in the list
      const errorSource: ProcessedSourceData = {
        name: `${domainName}_error.txt`,
        content: `Website Crawling Error\n` +
                 `------------------\n` +
                 `URL: ${url}\n` +
                 `Error Type: ${errorType}\n` +
                 `Message: ${errorMessage}\n\n` +
                 `Original Error: ${error instanceof Error ? error.message : String(error)}\n\n` + // Include original error message
                 `Troubleshooting Tips:\n` +
                 (errorType === 'NETWORK' ? '- Check if the website is accessible in your browser\n- The site may be down or have connectivity issues\n- Try again later' : '') +
                 (errorType === 'HTTP_ERROR' ? '- The website returned an error status code\n- The page might require authentication\n- The requested page might not exist' : '') +
                 (errorType === 'CORS' ? '- The website blocks external access to its content\n- This is a security measure implemented by many websites\n- Try a different website' : '') +
                 (errorType === 'TIMEOUT' ? '- The website took too long to respond\n- Try again later when the site may be less busy\n- Consider using a different website' : '') +
                 (errorType === 'CONTENT_EXTRACTION' ? '- Could not extract readable content from the page\n- The page might be mostly images or require JavaScript' : '') +
                 (errorType === 'UNKNOWN' ? '- This is an unexpected error\n- Check your internet connection\n- Try a different website' : ''),
        type: 'text/plain',
        originalFile: new File(
          [`Website crawling error (${errorType}): ${errorMessage}`], 
          `${domainName}_error.txt`, 
          { type: 'text/plain' }
        ),
        part: 1,
        totalParts: 1,
      };
      
      onSourcesAdd([errorSource]);
    } finally {
      setIsCrawling(false);
    }
  };

  // Remove DialogTrigger, the dialog is now controlled externally
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* <DialogTrigger asChild> ... </DialogTrigger> removed */}
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add sources</DialogTitle>
          <DialogDescription>
            Based on the sources, the AI can consider the information most important to you in its answers.
          </DialogDescription>
        </DialogHeader>
        
        {largeFileWarning && (
          <Alert className="bg-yellow-50 border-yellow-300 text-yellow-800 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Large File Warning</AlertTitle>
            <AlertDescription>{largeFileWarning}</AlertDescription>
          </Alert>
        )}
        
        {crawlError && (
          <Alert className="bg-red-50 border-red-300 text-red-800 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Website Crawling Error: {crawlError.type}</AlertTitle>
            <AlertDescription>{crawlError.message}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="upload" disabled={isProcessing}>Upload file</TabsTrigger>
            <TabsTrigger value="link" disabled={isProcessing}>Link</TabsTrigger>
            <TabsTrigger value="text" disabled={isProcessing}>Enter text</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-secondary/50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">{isProcessing ? "Processing..." : "Drag and drop files here"}</p>
                <p className="text-xs text-muted-foreground">or</p>
                <Button size="sm" onClick={handleButtonClick} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Select files"}
                </Button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
                disabled={isProcessing}
                aria-label="file-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supported file types: PDF, TXT, CSV, MD, JSON, DOCX, Audio, Images
            </p>
             {/* The warning alert now handles the dynamic message */}
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Enter URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="url" 
                  placeholder="https://example.com/document" 
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    // Clear error when input changes
                    if (crawlError) setCrawlError(null);
                  }}
                  disabled={isCrawling}
                  aria-label="Enter URL"
                  data-testid="url-input"
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => {
                    try {
                      const urlToOpen = url.startsWith('http') ? url : `https://${url}`;
                      window.open(urlToOpen, '_blank');
                    } catch (error) {
                      console.error('Invalid URL:', error);
                    }
                  }}
                  disabled={!url || isCrawling}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">About Website Crawling</p>
                  <p>This feature extracts text content from websites for use with the AI. Some limitations:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Not all websites allow their content to be crawled</li>
                    <li>Content requiring login cannot be accessed</li>
                    <li>Dynamic content loaded with JavaScript may not be captured</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCrawling}>Cancel</Button> {/* Use onOpenChange */}
              <Button
                onClick={handleAddWebsiteLink}
                disabled={!url || !url.trim() || isCrawling}
                className="min-w-[100px]"
              >
                {isCrawling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Crawling...
                  </>
                ) : "Add"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                placeholder="Document title" 
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                aria-label="title"
                data-testid="title-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea 
                id="content" 
                className="w-full min-h-[200px] rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Paste your text here..."
                value={textContent}
                onChange={handleTextContentChange}
                aria-label="content"
                data-testid="content-textarea"
              />
            </div>
            <div className="pt-4 flex justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button> {/* Use onOpenChange */}
              <Button
                onClick={() => {
                  if (!textTitle || !textContent) return;
                  // Note: onTextAdd likely needs similar processing/splitting logic
                  // For now, assuming it handles large text appropriately or needs update separately.
                  onTextAdd(textContent, textTitle);
                  onOpenChange(false); // Use the prop to signal closing
                  setTextTitle('');
                  setTextContent('');
                  setLargeFileWarning(null); // Reset warning on successful add
                }}
                disabled={!textTitle || !textContent || isProcessing}
              >
                {isProcessing ? "Processing..." : "Add"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
