import { useState } from "react";
import { AIModel } from "@/types/types";
// Select imports are now used inside the dialog, keeping them
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup, // Keep SelectGroup
  SelectLabel  // Keep SelectLabel
} from "@/components/ui/select";
import { Shield, Info, Settings, Check, X, Zap } from "lucide-react"; // Keep Settings for now, might remove later if button is removed
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Keep Card for details display
import { Separator } from "@/components/ui/separator"; // Keep Separator
import { Badge } from "@/components/ui/badge"; // Keep Badge for details display
// SelectGroup and SelectLabel already imported above
import { useApiKeys } from "@/hooks/useApiKeys";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Keep Alert for test results
import { DialogTrigger } from "@/components/ui/dialog"; // Added DialogTrigger
import { ApiKeyTestResult } from "@/shared/api";
import { apiProviders, sponsoredModelId } from '@/config'; // Import config data

interface ModelSelectorProps {
  selectedModel: AIModel | null;
  onSelectModel: (model: AIModel) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const { getApiKey, setApiKey, testApiKey, isApiKeyValid } = useApiKeys();
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Renamed from isConfigOpen

  // State for selections *within* the dialog
  const [dialogSelectedProvider, setDialogSelectedProvider] = useState<string | null>(null);
  const [dialogSelectedModelId, setDialogSelectedModelId] = useState<string | null>(null);
  const [dialogApiKey, setDialogApiKey] = useState("");

  // State for API key testing within the dialog
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);

  // Provider display names (keep)
  const providerNames: Record<string, string> = {
    google: 'Google',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    ollama: 'Ollama',
    local: 'Local',
    deepseek: 'DeepSeek'
  };

  // Get all models from the config for lookups and dropdowns
  const allModels = apiProviders.flatMap(p => p.models);

  // Get the current model display information (either selected model or first model from the config)
  const currentModel = selectedModel || (allModels.length > 0 ? allModels[0] : null);

  // Find the details of the model currently selected *in the dialog*
  const dialogSelectedModelDetails = allModels.find(m => m.id === dialogSelectedModelId);
  // Check if the model selected *in the dialog* is the sponsored one
  const isDialogModelSponsored = dialogSelectedModelDetails?.id === sponsoredModelId;

  // Function to open the dialog and initialize its state
  const handleDialogOpen = () => {
    if (!currentModel) return; // Don't open if no model is selected/available

    // Initialize dialog state based on the currently selected model
    setDialogSelectedProvider(currentModel.provider);
    setDialogSelectedModelId(currentModel.id);
    setDialogApiKey(currentModel.requiresApiKey ? getApiKey(currentModel.provider) : "");
    setTestResult(null); // Clear previous test results
    setIsTestingConnection(false);
    setIsDialogOpen(true);
  };

  // Function to handle saving changes from the dialog
  const handleDialogSave = () => {
    if (!dialogSelectedModelId) return; // Should not happen if validation is correct

    // Use allModels derived from config to find the selected model
    const finalModel = allModels.find(m => m.id === dialogSelectedModelId);
    if (!finalModel) return;

    // Save API key if provided and required *and* it's not the sponsored model
    const isSavingSponsored = finalModel.id === sponsoredModelId;
    if (finalModel.requiresApiKey && !isSavingSponsored && dialogApiKey) {
      setApiKey(finalModel.provider, dialogApiKey);
      // Optionally: Re-validate or trust the test result? For now, just save.
    }

    // Update the main selection
    onSelectModel(finalModel);
    setIsDialogOpen(false);
  };

  // Handle provider change within the dialog
  const handleDialogProviderChange = (provider: string) => {
    setDialogSelectedProvider(provider);
    // Reset model and API key for the new provider
    setDialogSelectedModelId(null);
    setDialogApiKey(getApiKey(provider)); // Load existing key for this provider
    setTestResult(null);
    setIsTestingConnection(false);
  };

  // Handle model change within the dialog
  const handleDialogModelChange = (modelId: string) => {
    setDialogSelectedModelId(modelId);
    // Potentially clear test results if model change affects API key validity?
    // setTestResult(null);
  };


  const handleTestConnection = async () => {
    // Use dialog state for testing
    if (!dialogSelectedProvider || !dialogApiKey) return;

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Use the real API testing functionality with dialog state
      const result = await testApiKey(dialogSelectedProvider, dialogApiKey);
      setTestResult(result);

      // If test is successful, save the API key right away (within dialog state context)
      // Note: Actual saving to persistent storage happens on Dialog Save
      if (result.isValid) {
         // Maybe update the main hook state here too? Or wait for save?
         // setApiKey(dialogSelectedProvider, dialogApiKey);
         // For now, just reflect success in the dialog
      }
    } catch (error) {
      console.error("API testing error:", error);
      setTestResult({
        isValid: false,
        message: error instanceof Error ? error.message : "An error occurred while testing the connection."
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Removed getModelIcon as it's not used in the new display format

  const getModelTokenLimit = (model: AIModel) => {
    return model.maxTokens ? `${model.maxTokens.toLocaleString()} tokens` : "Unknown";
  };

  const CapabilityIndicator = ({ enabled, label }: { enabled: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {enabled ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  if (!currentModel) {
    return (
      <div className="text-muted-foreground">No AI models available</div>
    );
  }

  // Unique list of providers from the config
  const uniqueProviders = apiProviders.map(p => p.id);

  // Check if the *currently selected* model (outside the dialog) is sponsored
  const isCurrentModelSponsored = currentModel?.id === sponsoredModelId;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {/* This is the clickable element in the header */}
        <Button variant="outline" className="w-[250px] justify-start truncate">
          {currentModel ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-medium">{providerNames[currentModel.provider] || currentModel.provider}</span>
              <span className="text-muted-foreground">/</span>
              <span className="truncate">{currentModel.name}</span>
              {/* Show sponsored badge or needs key badge */}
              {isCurrentModelSponsored ? (
                <Badge variant="secondary" className="ml-auto flex-shrink-0">
                  Sponsored
                </Badge>
              ) : currentModel.requiresApiKey && !isApiKeyValid(currentModel.provider) ? (
                <Badge variant="outline" className="ml-auto text-amber-500 flex-shrink-0">
                  Needs key
                </Badge>
              ) : null}
            </div>
          ) : (
            "Select Model..."
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg"> {/* Increased width slightly */}
        <DialogHeader>
          <DialogTitle>Configure AI Model</DialogTitle>
          <DialogDescription>
            Select a provider, configure API keys if needed, and choose a model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider-select">API Provider</Label>
            <Select
              value={dialogSelectedProvider ?? ""}
              onValueChange={handleDialogProviderChange}
            >
              <SelectTrigger id="provider-select">
                <SelectValue placeholder="Select a provider..." />
              </SelectTrigger>
              <SelectContent>
                {uniqueProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {providerNames[provider] || provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key Section (Conditional based on selected model in dialog) */}
          {dialogSelectedModelDetails && dialogSelectedModelDetails.requiresApiKey && !isDialogModelSponsored && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="dialogApiKey">API Key for {providerNames[dialogSelectedModelDetails.provider] || dialogSelectedModelDetails.provider}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Your API key is stored locally. It is only used for making API requests from this application.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-2">
                <Input
                  id="dialogApiKey"
                  type="password"
                  value={dialogApiKey}
                  onChange={(e) => setDialogApiKey(e.target.value)}
                  placeholder={`Enter your ${providerNames[dialogSelectedProvider] || dialogSelectedProvider} API key...`}
                  className="font-mono tracking-widest"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!dialogApiKey || isTestingConnection || dialogApiKey.length < 5}
                  onClick={handleTestConnection}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {isTestingConnection ? "Testing..." : "Test Connection"}
                </Button>
                {testResult && (
                  <Alert variant={testResult.isValid ? "default" : "destructive"} className="mt-2">
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
               <p className="text-xs text-muted-foreground mt-2">
                  {dialogSelectedProvider === 'google' && 'Get your Google AI Studio API key from https://makersuite.google.com/app/apikey'}
                  {dialogSelectedProvider === 'openai' && 'Get your OpenAI API key from https://platform.openai.com/api-keys'}
                  {dialogSelectedProvider === 'anthropic' && 'Get your Anthropic API key from https://console.anthropic.com/account/keys'}
                  {dialogSelectedProvider === 'ollama' && 'Local Ollama server must be running at http://localhost:11434'}
                </p>
            </div>
          )}

          {/* Model Selection (Conditional on Provider) */}
          {dialogSelectedProvider && (
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              <Select
                value={dialogSelectedModelId ?? ""}
                onValueChange={handleDialogModelChange}
                disabled={!dialogSelectedProvider} // Disable if no provider selected
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  {allModels // Use allModels derived from config
                    .filter(model => model.provider === dialogSelectedProvider)
                    .map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Model Details Section (Conditional on Model selected in dialog) */}
          {dialogSelectedModelDetails && (() => {
            // We already have dialogSelectedModelDetails from above
            const model = dialogSelectedModelDetails;
            return (
              <>
                <Separator />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Model Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <CapabilityIndicator enabled={model.capabilities.text} label="Text" />
                        <CapabilityIndicator enabled={model.capabilities.image} label="Images" />
                        <CapabilityIndicator enabled={model.capabilities.audio} label="Audio" />
                        <CapabilityIndicator enabled={model.capabilities.computerUse || false} label="Computer use" />
                      </div>
                    </div>
                    <div className="pt-2">
                      {model.version && (
                        <Badge variant="outline" className="px-2 py-1 mr-2">
                          Version {model.version}
                        </Badge>
                      )}
                      {model.maxTokens && (
                        <Badge variant="outline" className="px-2 py-1">
                          {getModelTokenLimit(model)}
                        </Badge>
                      )}
                    </div>
                     {/* Add pricing/usage notes here if available in model data */}
                     {model.notes && (
                        <p className="text-xs text-muted-foreground pt-2">{model.notes}</p>
                     )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDialogSave}
            disabled={
              !dialogSelectedModelId || // No model selected
              // Model requires API key, it's NOT sponsored, AND key is missing (from dialog state AND persistent storage)
              (dialogSelectedModelDetails?.requiresApiKey &&
               !isDialogModelSponsored &&
               !dialogApiKey &&
               !getApiKey(dialogSelectedProvider ?? ''))
            }
          >
            Save & Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
