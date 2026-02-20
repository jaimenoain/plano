// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { SuggestedContentBlock } from './SuggestedContentBlock';

afterEach(() => {
  cleanup();
});

describe('SuggestedContentBlock', () => {
  it('renders children directly when isSuggested is false', () => {
    render(
      <SuggestedContentBlock isSuggested={false}>
        <div data-testid="child">Child Content</div>
      </SuggestedContentBlock>
    );

    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.queryByText('Suggested')).toBeNull();
  });

  it('renders suggested header when isSuggested is true', () => {
    render(
      <SuggestedContentBlock isSuggested={true} suggestionReason="Because you liked X">
        <div data-testid="child">Child Content</div>
      </SuggestedContentBlock>
    );

    expect(screen.getByTestId('child')).toBeTruthy();
    // Using a regex to match text that might be split across elements or contain other text
    expect(screen.getAllByText(/Suggested/)).toBeTruthy();
    expect(screen.getAllByText(/Because you liked X/)).toBeTruthy();
  });
});
