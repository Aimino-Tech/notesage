import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFoundPage from "./pages/NotFoundPage";
import NotebookDetailPage from "./pages/NotebookDetail";
import { ApiKeyProvider } from "./lib/api-key-context";
import { ModelProvider } from "./lib/model-context";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ApiKeyProvider>
      <ModelProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename="/notesage">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/notebook/:id" element={<NotebookDetailPage />} /> {/* Changed component usage */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ModelProvider>
    </ApiKeyProvider>
  </QueryClientProvider>
);

export default App;
