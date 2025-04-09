import { useState } from "react";
import { DocumentSummary } from "@/types/types"; // Corrected import path
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MarkdownSection } from "@/components/ui/markdown-section";

interface DocumentOverviewProps {
  onUpdateSummary?: (summary: DocumentSummary | null) => void; // Allow null update
  summary: DocumentSummary | null;
  onRetry?: () => void;
  isProcessing?: boolean; // Add isProcessing prop
}

export function DocumentOverview({ 
  summary, 
  onRetry, 
  onUpdateSummary, 
  isProcessing = false // Destructure and default isProcessing
}: DocumentOverviewProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summary) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (summary.error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {summary.error}
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isProcessing} // Disable button when processing
              className="ml-2 underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Retrying..." : "Retry"} 
            </button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const handleUpdate = (key: keyof DocumentSummary, value: string) => {
    if (!onUpdateSummary) return;
    onUpdateSummary({
      ...summary,
      [key]: value
    });
  };

  return (
    <Accordion 
      type="single" 
      collapsible 
      className="w-full border-b" 
      defaultValue="overview"
      value={isExpanded ? "overview" : undefined}
      onValueChange={(value) => setIsExpanded(!!value)}
    >
      <AccordionItem value="overview">
        <AccordionTrigger className="px-4">
          Document Overview
        </AccordionTrigger>
        <AccordionContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
              <TabsTrigger value="qa">Q&A</TabsTrigger>
              <TabsTrigger value="todos">TODOs</TabsTrigger> {/* Added TODOs Tab */}
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <MarkdownSection
                content={summary.summary}
                onChange={content => handleUpdate('summary', content)}
              />
            </TabsContent>

            <TabsContent value="outline" className="mt-4">
              <MarkdownSection
                content={summary.outline}
                onChange={content => handleUpdate('outline', content)}
              />
            </TabsContent>

            <TabsContent value="keyPoints" className="mt-4">
              <MarkdownSection
                content={summary.keyPoints}
                onChange={content => handleUpdate('keyPoints', content)}
              />
            </TabsContent>

            <TabsContent value="qa" className="mt-4">
              <MarkdownSection
                // Format QAPair[] into a markdown string
                content={summary.qa.map(pair => `**Q:** ${pair.question}\n**A:** ${pair.answer}`).join('\n\n')}
                // Provide a dummy onChange for Q&A as direct editing is not supported for this structure
                onChange={() => {}}
              />
            </TabsContent>

            {/* Added TODOs Content */}
            <TabsContent value="todos" className="mt-4">
              <MarkdownSection
                content={summary.todos}
                onChange={content => handleUpdate('todos', content)}
              />
            </TabsContent>
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
