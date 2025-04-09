import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, MessageSquare, Calendar } from "lucide-react";
import { GenerationType, AIModel } from "@/types/types";
import { useToast } from "@/hooks/use-toast";

interface GenerateButtonsProps {
  onGenerate: (type: GenerationType) => void;
  isGeneratingContent?: boolean;
  selectedModel?: AIModel | null;
  hasValidApiKey?: boolean;
}

export function GenerateButtons({
  onGenerate,
  isGeneratingContent = false,
  selectedModel = null,
  hasValidApiKey = false,
}: GenerateButtonsProps) {
  const { toast } = useToast();

  const handleGenerateClick = (type: GenerationType) => {
    if (!selectedModel) {
      toast({
        title: "No Model Selected",
        description: "Please select an AI model in the settings first.",
        variant: "destructive",
      });
      return;
    }
    if (!hasValidApiKey) {
      toast({
        title: "Invalid API Key",
        description: `Please configure a valid API key for ${selectedModel.provider}.`,
        variant: "destructive",
      });
      return;
    }
    onGenerate(type);
  };

  const commonButtonProps = {
    variant: "outline" as const,
    size: "sm" as const,
    className: "justify-start w-full",
    disabled: isGeneratingContent || !selectedModel || !hasValidApiKey,
  };

  const renderIcon = (IconComponent: React.ElementType) => {
    return isGeneratingContent ? (
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    ) : (
      <IconComponent className="h-4 w-4 mr-2" />
    );
  };

  const getTooltipContent = (actionText: string) => {
    if (!selectedModel) {
      return <p>Please select an AI model in settings first</p>;
    }
    if (!hasValidApiKey) {
      return <p>Please configure a valid API key for {selectedModel.provider}</p>;
    }
    return <p>{actionText}</p>;
  };

  return (
    <TooltipProvider> {/* Added TooltipProvider */}
      <div className="p-4 grid grid-cols-2 gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...commonButtonProps} onClick={() => handleGenerateClick("work_aid")}>
              {renderIcon(FileText)}
              Work Aid
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent("Generate a work aid document from your sources")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...commonButtonProps} onClick={() => handleGenerateClick("faq")}>
              {renderIcon(MessageSquare)}
              FAQs
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent("Generate FAQs from your sources")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...commonButtonProps} onClick={() => handleGenerateClick("briefing")}>
              {renderIcon(FileText)}
              Briefing Document
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent("Generate a briefing document from your sources")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...commonButtonProps} onClick={() => handleGenerateClick("timeline")}>
              {renderIcon(Calendar)}
              Timeline
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {getTooltipContent("Generate a timeline from your sources")}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
