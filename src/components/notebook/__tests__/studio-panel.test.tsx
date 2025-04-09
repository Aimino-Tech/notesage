import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioPanel, StudioPanelProps } from '../studio-panel'; // Import StudioPanelProps
import { AIModel, GenerationType, Note } from '@/types/types'; // Assuming types are here
import { useToast } from '@/hooks/use-toast'; // Import useToast for vi.mocked scope
import { TooltipProvider } from '@/components/ui/tooltip'; // Import TooltipProvider

// Mock the useToast hook and expose the mock toast function
const mockToastFn = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToastFn, // Use the exposed mock function
    dismiss: vi.fn(),
    toasts: [],
  }),
}));


// Mock child components if they interfere or are complex
// vi.mock('@/components/ui/tooltip', () => ({
//   Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
// }));
// vi.mock('@/components/ui/button', () => ({
//   Button: (props: any) => <button {...props} />,
// }));
// vi.mock('@/components/ui/scroll-area', () => ({
//   ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
// }));
// vi.mock('@/components/ui/card', () => ({
//   Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   CardTitle: ({ children }: { children: React.ReactNode }) => <h5>{children}</h5>,
//   CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
// }));
// vi.mock('@/components/ui/dropdown-menu', () => ({
//   DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
//   DropdownMenuSeparator: () => <hr />,
// }));
// vi.mock('lucide-react', async (importOriginal) => {
//   const original = await importOriginal<typeof import('lucide-react')>();
//   return {
//     ...original,
//     FileText: () => <span>FileText</span>,
//     MessageSquare: () => <span>MessageSquare</span>,
//     Calendar: () => <span>Calendar</span>,
//     Plus: () => <span>Plus</span>,
//     MoreVertical: () => <span>MoreVertical</span>,
//     Settings: () => <span>Settings</span>,
//     Loader2: () => <span>Loader2</span>,
//   };
// });


describe('StudioPanel', () => {
  const mockNotes: Note[] = [];
  const mockOnAddNote = vi.fn();
  const mockOnNoteClick = vi.fn();
  const mockOnDeleteNote = vi.fn();
  const mockOnRenameNote = vi.fn();
  const mockOnDownloadNote = vi.fn();
  const mockOnGenerate = vi.fn();
  // Add missing properties to AIModel mock
  const mockSelectedModel: AIModel = { 
    id: 'test-model-id', 
    name: 'Test Model', 
    provider: 'openai', 
    // Adjust capabilities to match expected type structure
    capabilities: { text: true, image: false, audio: false, computerUse: false }, 
    requiresApiKey: true 
  }; 

  const defaultProps = {
    notes: mockNotes,
    onAddNote: mockOnAddNote,
    onNoteClick: mockOnNoteClick,
    onDeleteNote: mockOnDeleteNote,
    onRenameNote: mockOnRenameNote,
    onDownloadNote: mockOnDownloadNote,
    onGenerate: mockOnGenerate,
    isGeneratingContent: false, // Renamed from isGenerating
    selectedModel: mockSelectedModel,
    hasValidApiKey: true,
  };

  // Helper function to render with provider
  const renderWithProvider = (props: Partial<StudioPanelProps> = {}) => {
    // Ensure notes is always an array, even if props overrides it with undefined
    const finalProps: StudioPanelProps = {
      ...defaultProps,
      ...props,
      notes: props.notes ?? defaultProps.notes, // Explicitly ensure notes is an array
    };
    return render(
      <TooltipProvider>
        <StudioPanel {...finalProps} />
      </TooltipProvider>
    );
  };

  it("should call onGenerate with 'work_aid' when Work Aid button is clicked and model/key are valid", async () => {
    renderWithProvider(defaultProps);

    const workAidButton = screen.getByRole('button', { name: /Work Aid/i });
    await userEvent.click(workAidButton);

    expect(mockOnGenerate).toHaveBeenCalledTimes(1);
    expect(mockOnGenerate).toHaveBeenCalledWith('work_aid' as GenerationType);
  });

  // Add more tests here based on the plan...

  it('should disable Work Aid button if no model is selected', () => {
    renderWithProvider({ ...defaultProps, selectedModel: null });
    const workAidButton = screen.getByRole('button', { name: /Work Aid/i });
    expect(workAidButton).toBeDisabled();
  });

  it('should disable Work Aid button if API key is invalid', () => {
    renderWithProvider({ ...defaultProps, hasValidApiKey: false });
    const workAidButton = screen.getByRole('button', { name: /Work Aid/i });
    expect(workAidButton).toBeDisabled();
  });

  it('should disable Work Aid button if isGeneratingContent is true', () => { // Renamed test description
    renderWithProvider({ ...defaultProps, isGeneratingContent: true }); // Renamed prop
    const workAidButton = screen.getByRole('button', { name: /Work Aid/i });
    expect(workAidButton).toBeDisabled();
  });

  // Removed incorrect tests that expected a toast after clicking a disabled button.
  // The disabled state itself is tested above.

});
