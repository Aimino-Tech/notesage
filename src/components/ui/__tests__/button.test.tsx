import { render, screen } from '@testing-library/react';
import { Button } from '../button'; // Adjust path as necessary
import { describe, it, expect } from 'vitest'; // Explicit import for clarity, though globals are enabled

describe('Button component', () => {
  it('should render the button with default props', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /click me/i });
    expect(buttonElement).toBeInTheDocument();
    // Check for default variant/size classes (might need adjustment based on exact output)
    expect(buttonElement).toHaveClass('bg-primary');
    expect(buttonElement).toHaveClass('h-10');
  });

  it('should render children correctly', () => {
    render(<Button><span>Inner Span</span></Button>);
    expect(screen.getByText(/inner span/i)).toBeInTheDocument();
  });

  it('should apply variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const buttonElement = screen.getByRole('button', { name: /delete/i });
    expect(buttonElement).toHaveClass('bg-destructive');
    expect(buttonElement).not.toHaveClass('bg-primary');
  });

  it('should apply size classes correctly', () => {
    render(<Button size="lg">Large Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /large button/i });
    expect(buttonElement).toHaveClass('h-11');
    expect(buttonElement).not.toHaveClass('h-10');
  });

  it('should render as a different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/home">Go Home</a>
      </Button>
    );
    // Check if it renders as an anchor tag instead of a button
    const linkElement = screen.getByRole('link', { name: /go home/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.tagName).toBe('A');
    // Check if button classes are still applied
    expect(linkElement).toHaveClass('bg-primary');
  });

  it('should be disabled when the disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /disabled button/i });
    expect(buttonElement).toBeDisabled();
    expect(buttonElement).toHaveClass('disabled:opacity-50');
  });
});
