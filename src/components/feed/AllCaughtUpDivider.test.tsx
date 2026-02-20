// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllCaughtUpDivider } from './AllCaughtUpDivider';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, className, style, ...props }: any) => (
        <div className={className} style={style} {...props} data-testid="motion-div">
          {children}
        </div>
      ),
    },
  };
});

describe('AllCaughtUpDivider', () => {
  it('renders correctly', () => {
    render(<AllCaughtUpDivider />);

    expect(screen.getByText("You're all caught up!")).toBeTruthy();
    expect(screen.getByText("Here's some inspiration from the community.")).toBeTruthy();

    // Check for the motion div wrapper
    const container = screen.getByTestId('motion-div');
    expect(container).toBeTruthy();
    expect(container.className).toContain('flex flex-col items-center justify-center');
  });
});
