import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatPanel } from '@/components/notebook/chat-panel'; // Import the actual component
import { ChatMessage, AIModel, Source, AIMode } from '@/types/types'; // Import necessary types, Added AIMode

// Mock child components or dependencies if they have complex logic or side effects
vi.mock('@/components/ui/chat-input', () => ({
  ChatInput: ({ onSendMessage, isLoading }: { onSendMessage: (msg: string) => void; isLoading: boolean }) => (
    <div>
      <input type="text" placeholder="Mock Chat Input" disabled={isLoading} />
      <button onClick={() => onSendMessage('test message')} disabled={isLoading}>Send</button>
    </div>
  ),
}));

vi.mock('@/components/ui/model-selector', () => ({
  ModelSelector: () => <div>Mock Model Selector</div>,
}));

vi.mock('@/components/ui/chat-message', () => ({
  ChatMessage: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`message-${message.id}`}>{message.role}: {message.content}</div>
  ),
}));

describe('ChatPanel Component', () => {
  const mockMessages: ChatMessage[] = [
    { id: 'm1', role: 'user', content: 'User message 1', timestamp: new Date() },
    { id: 'm2', role: 'assistant', content: 'Assistant response 1', timestamp: new Date() },
  ];
  const mockAvailableModels: AIModel[] = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai', capabilities: { text: true, image: false, audio: false, computerUse: false }, requiresApiKey: true },
  ];
  const mockSelectedModel = mockAvailableModels[0];
  const mockSources: Source[] = [
    { id: 's1', name: 'Source 1', type: 'text', content: 'Source content', dateAdded: new Date() },
  ];
  const mockOnSendMessage = vi.fn();
  const mockOnSelectModel = vi.fn();
  const mockOnCitationClick = vi.fn();
  const mockOnGenerateWorkAid = vi.fn();
  // Add mocks for new props
  const mockSetViewMode = vi.fn();
  const mockOnSelectAIMode = vi.fn();
  const mockOnGenerateFAQ = vi.fn();
  const mockOnGenerateBriefing = vi.fn();
  const mockOnGenerateTimeline = vi.fn();


  const defaultProps = {
    messages: mockMessages,
    onSendMessage: mockOnSendMessage,
    availableModels: mockAvailableModels,
    selectedModel: mockSelectedModel,
    onSelectModel: mockOnSelectModel,
    onCitationClick: mockOnCitationClick,
    sources: mockSources,
    isGenerating: false, // Changed from isLoading
    onGenerateWorkAid: mockOnGenerateWorkAid,
    // Add new props to defaultProps
    viewMode: 'normal' as const, // Provide a default viewMode
    setViewMode: mockSetViewMode,
    selectedAIMode: 'chat' as AIMode, // Provide a default AIMode
    onSelectAIMode: mockOnSelectAIMode,
    selectedSourceIds: new Set<string>(mockSources.map(s => s.id)), // Default to all sources selected
    onGenerateFAQ: mockOnGenerateFAQ,
    onGenerateBriefing: mockOnGenerateBriefing,
    onGenerateTimeline: mockOnGenerateTimeline,
  };

  it('should render the panel title, model selector, and chat input', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Mock Model Selector')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mock Chat Input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('should display chat messages', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByTestId('message-m1')).toHaveTextContent('user: User message 1');
    expect(screen.getByTestId('message-m2')).toHaveTextContent('assistant: Assistant response 1');
  });

  it('should render the "Generate Work Aid" button', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /generate work aid/i })).toBeInTheDocument();
  });

  it('should call onGenerateWorkAid when the button is clicked', () => {
    render(<ChatPanel {...defaultProps} />);
    const generateButton = screen.getByRole('button', { name: /generate work aid/i });
    fireEvent.click(generateButton);
    expect(mockOnGenerateWorkAid).toHaveBeenCalledTimes(1);
  });
 
   it('should disable the "Generate Work Aid" button when isGenerating is true', () => {
     // Corrected prop name from isLoading to isGenerating
     render(<ChatPanel {...defaultProps} isGenerating={true} />); 
     const generateButton = screen.getByRole('button', { name: /generate work aid/i });
     expect(generateButton).toBeDisabled();
  });

  it('should disable the "Generate Work Aid" button when sources array is empty', () => {
    render(<ChatPanel {...defaultProps} sources={[]} />);
    const generateButton = screen.getByRole('button', { name: /generate work aid/i });
    expect(generateButton).toBeDisabled();
  });

  it('should show empty state message when no messages are present', () => {
    render(<ChatPanel {...defaultProps} messages={[]} />);
    expect(screen.getByText('Ask a question about your sources')).toBeInTheDocument(); // Assuming sources are present
  });

  it('should show different empty state message when no sources are present', () => {
     render(<ChatPanel {...defaultProps} messages={[]} sources={[]} />);
     expect(screen.getByText('Add sources to begin')).toBeInTheDocument();
  });

  // Test scrolling behavior might require more complex setup (e.g., mocking scroll properties)
});
