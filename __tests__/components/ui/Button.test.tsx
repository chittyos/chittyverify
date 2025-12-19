import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { Button, buttonVariants } from '../../../client/src/components/ui/button.jsx';

describe('Button Component', () => {
  it('renders button with default variant and size', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'h-10', 'px-4', 'py-2');
  });

  it('renders different button variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive', 'text-destructive-foreground');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border', 'border-input', 'bg-background');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary', 'text-secondary-foreground');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground');

    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-primary', 'underline-offset-4');
  });

  it('renders different button sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-9', 'px-3');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11', 'px-8');

    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('inline-flex'); // Should still have base classes
  });

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button with ref</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('accepts all button HTML attributes', () => {
    render(
      <Button
        type="submit"
        form="test-form"
        data-testid="test-button"
        aria-label="Submit form"
      >
        Submit
      </Button>
    );

    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('form', 'test-form');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
  });
});

describe('buttonVariants', () => {
  it('generates correct class names for variants', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('bg-primary');
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-destructive');
    expect(buttonVariants({ variant: 'outline' })).toContain('border');
    expect(buttonVariants({ variant: 'secondary' })).toContain('bg-secondary');
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-accent');
    expect(buttonVariants({ variant: 'link' })).toContain('text-primary');
  });

  it('generates correct class names for sizes', () => {
    expect(buttonVariants({ size: 'default' })).toContain('h-10');
    expect(buttonVariants({ size: 'sm' })).toContain('h-9');
    expect(buttonVariants({ size: 'lg' })).toContain('h-11');
    expect(buttonVariants({ size: 'icon' })).toContain('h-10 w-10');
  });

  it('combines variant and size classes', () => {
    const classes = buttonVariants({ variant: 'outline', size: 'lg' });
    expect(classes).toContain('border');
    expect(classes).toContain('h-11');
  });

  it('includes base classes', () => {
    const classes = buttonVariants();
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('rounded-md');
    expect(classes).toContain('text-sm');
    expect(classes).toContain('font-medium');
  });
});