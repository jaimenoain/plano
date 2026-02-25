import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StatusBadge } from './StatusBadge';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

describe('StatusBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders "Visited" when status is visited', () => {
    render(<StatusBadge status="visited" isOwnProfile={false} onClick={vi.fn()} />);
    expect(screen.getByText('Visited')).toBeInTheDocument();
  });

  it('renders "Saved" when status is pending', () => {
    render(<StatusBadge status="pending" isOwnProfile={false} onClick={vi.fn()} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('calls onClick when clicked and isOwnProfile is true', () => {
    const handleClick = vi.fn();
    render(<StatusBadge status="visited" isOwnProfile={true} onClick={handleClick} />);
    // Select the button specifically by its text content or role+name
    const button = screen.getByRole('button', { name: /visited/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });
});
