import { useState, useEffect } from "react";
import { Shield, Info, Zap } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKeys } from "@/hooks/useApiKeys"; // Updated import path
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiKeyTestResult } from "@/shared/api";

interface ApiKeyConfigDialogProps {
  provider: string;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get provider-specific info (could be moved to a config file)
const getProviderInfo = (provider: string) => {
  switch (provider) {
    case 'google':
      return { name: 'Google', keyUrl: 'https://makersuite.google.com/app/apikey' };
    case 'openai':
      return { name: 'OpenAI', keyUrl: 'https://platform.openai.com/api-keys' };
    case 'anthropic':
      return { name: 'Anthropic', keyUrl: 'https://console.anthropic.com/account/keys', inputType: 'key' };
    case 'ollama':
      // Ollama needs a host URL, not an API key
      return { name: 'Ollama', keyUrl: null, note: 'Enter the URL of your running Ollama server (e.g., http://localhost:11434).', inputType: 'url' };
    case 'deepseek':
      return { name: 'Deepseek', keyUrl: 'https://platform.deepseek.com/api_keys', inputType: 'key' }; // Add Deepseek info
    default:
      return { name: provider, keyUrl: null, note: 'Configuration not specified for this provider.', inputType: 'unknown' };
  }
};

export function ApiKeyConfigDialog({ provider, isOpen, onClose }: ApiKeyConfigDialogProps) {
  const { getApiKey, setApiKey, testApiKey } = useApiKeys();
  const [settingValue, setSettingValue] = useState(""); // Renamed state for clarity (can be key or URL)
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);

  const providerInfo = getProviderInfo(provider);
  const isOllama = provider === 'ollama';

  // Load the existing setting (key or URL) when the dialog opens or provider changes
  useEffect(() => {
    if (isOpen && provider) {
      const savedValue = getApiKey(provider); // getApiKey now gets the setting string
      setSettingValue(savedValue);
      setTestResult(null); // Reset test result when opening
    }
  }, [isOpen, provider, getApiKey]);

  const handleSaveAndClose = () => {
    // Save the setting (key or URL)
    setApiKey(provider, settingValue); // setApiKey now sets the setting string
    onClose(); // Call the callback provided by the parent
  };

  const handleCancel = () => {
    onClose(); // Just close without saving
  };

  const handleTestConnection = async () => {
    if (!provider || !settingValue) return;

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Pass the current setting value (key or URL) to the test function
      const result = await testApiKey(provider, settingValue);
      setTestResult(result);
      // If test is successful, save the setting right away
      if (result.isValid) {
        setApiKey(provider, settingValue);
      }
    } catch (error) {
      console.error(`API testing error for ${provider}:`, error);
      setTestResult({
        isValid: false,
        message: error instanceof Error ? error.message : "An error occurred while testing the connection."
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Determine if the provider requires a setting input (key or URL)
  const requiresInput = providerInfo.inputType === 'key' || providerInfo.inputType === 'url';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="capitalize">{providerInfo.name} API Configuration</DialogTitle>
          <DialogDescription>
            Configure the API key for the {providerInfo.name} provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {requiresInput ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {isOllama ? "Ollama Host URL" : "API Key"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="settingValue">{isOllama ? "Host URL" : "API Key"}</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                {isOllama
                                  ? "The URL of your running Ollama server. Stored locally."
                                  : "Your API key is stored locally. It is only used for making API requests from this application."}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="space-y-2">
                        <Input
                          id="settingValue"
                          type={isOllama ? "text" : "password"} // Show URL as text
                          value={settingValue}
                          onChange={(e) => setSettingValue(e.target.value)}
                          placeholder={isOllama ? "e.g., http://localhost:11434" : `Enter your ${providerInfo.name} API key...`}
                          className={isOllama ? "" : "font-mono tracking-widest"}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={!settingValue || isTestingConnection || (!isOllama && settingValue.length < 5)} // Basic validation
                          onClick={handleTestConnection}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {isTestingConnection ? "Testing..." : "Test Connection"}
                        </Button>

                        {testResult && (
                          <Alert variant={testResult.isValid ? "default" : "destructive"} className="mt-2">
                            <AlertDescription>
                              {testResult.message}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      {(providerInfo.keyUrl || providerInfo.note) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {providerInfo.keyUrl && `Get your key from ${providerInfo.keyUrl}`}
                          {providerInfo.keyUrl && providerInfo.note && <br />}
                          {providerInfo.note}
                        </p>
                      )}
                    </div>
                  </div>
              </CardContent>
            </Card>
          ) : (
            // Render if no input is required (or provider type is unknown)
            <Alert>
              <AlertDescription>
                Configuration for this provider ({providerInfo.name}) is not specified or does not require user input here. {providerInfo.note}
              </AlertDescription>
            </Alert>
          )}
          {/* The CardContent and Card tags are closed within the requiresInput block above */}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveAndClose}>
            Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
