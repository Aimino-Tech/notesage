import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event'; // Use userEvent for better simulation
import { describe, it, expect, vi } from 'vitest';
import { EditableMarkdown } from '../editable-markdown'; // Adjust path if needed

describe('EditableMarkdown', () => {
  const initialValue = '# Hello\n\nThis is initial markdown.';
  const newValue = '# Updated\n\nThis is new content.';

  it('should render initial value in view mode', () => {
    render(<EditableMarkdown initialValue={initialValue} onSave={vi.fn()} />);

    // Check for rendered markdown content (might need specific selectors based on markdown renderer)
    // For simplicity, check if part of the text is present
    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByText(/initial markdown/i)).toBeInTheDocument();
    // Check that the textarea (edit mode) is not present initially
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should switch to edit mode on click', async () => {
    const user = userEvent.setup();
    render(<EditableMarkdown initialValue={initialValue} onSave={vi.fn()} />);

    // Find the view container (might need a data-testid or specific class)
    // Assuming the parent div receives the click to switch
    const viewContainer = screen.getByText(/Hello/i).closest('div'); // Adjust selector as needed
    expect(viewContainer).toBeInTheDocument();

    await user.click(viewContainer!);

    // Check if textarea is now visible and contains the initial value
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(initialValue);
    // Check if save/cancel buttons are visible
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should call onSave with updated value when save button is clicked', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    render(<EditableMarkdown initialValue={initialValue} onSave={handleSave} />);

    // Switch to edit mode
    const viewContainer = screen.getByText(/Hello/i).closest('div');
    await user.click(viewContainer!);

    // Edit the textarea
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, newValue);
    expect(textarea).toHaveValue(newValue);

    // Click save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Check if onSave was called with the new value
    expect(handleSave).toHaveBeenCalledOnce();
    expect(handleSave).toHaveBeenCalledWith(newValue);

    // Check if it switched back to view mode (textarea gone)
    await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
    // Check if the new value is displayed (might need adjustment based on markdown rendering)
    expect(screen.getByText(/Updated/i)).toBeInTheDocument();
    expect(screen.getByText(/new content/i)).toBeInTheDocument();
  });

  it('should revert to initial value when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();
    render(<EditableMarkdown initialValue={initialValue} onSave={handleSave} />);

    // Switch to edit mode
    const viewContainer = screen.getByText(/Hello/i).closest('div');
    await user.click(viewContainer!);

    // Edit the textarea
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, newValue);
    expect(textarea).toHaveValue(newValue);

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Check if onSave was NOT called
    expect(handleSave).not.toHaveBeenCalled();

    // Check if it switched back to view mode (textarea gone)
     await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
    // Check if the initial value is displayed again
    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByText(/initial markdown/i)).toBeInTheDocument();
    expect(screen.queryByText(/Updated/i)).not.toBeInTheDocument();
  });

  // Add tests for className props if needed
});
