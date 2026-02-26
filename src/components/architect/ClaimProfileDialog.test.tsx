// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ClaimProfileDialog } from './ClaimProfileDialog';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

// Mocks
const mocks = vi.hoisted(() => {
  return {
    insert: vi.fn(),
    user: { id: 'user-123', email: 'test@example.com' },
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
  }),
}));

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: (table: string) => ({
        insert: mocks.insert,
      }),
    },
  };
});

describe('ClaimProfileDialog', () => {
  const defaultProps = {
    architectId: 'arch-123',
    architectName: 'Test Architect',
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly when open', () => {
    render(<ClaimProfileDialog {...defaultProps} />);
    expect(screen.getByText('Claim Test Architect')).toBeInTheDocument();
    expect(screen.getByLabelText(/professional email/i)).toBeInTheDocument();
  });

  it('validates email input', async () => {
    const user = userEvent.setup();
    render(<ClaimProfileDialog {...defaultProps} />);

    const input = screen.getByLabelText(/professional email/i);
    const submitBtn = screen.getByRole('button', { name: /submit claim/i });

    // Invalid email
    await user.type(input, 'invalid-email');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid professional email address/i)).toBeInTheDocument();
    });

    // Valid email clears error (conceptually, though react-hook-form handles this)
    await user.clear(input);
    await user.type(input, 'valid@studio.com');
    // Error should disappear on submit or blur depending on config, but let's just check validation logic blocks submit
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('submits successfully', async () => {
    const user = userEvent.setup();
    render(<ClaimProfileDialog {...defaultProps} />);

    const input = screen.getByLabelText(/professional email/i);
    await user.type(input, 'architect@studio.com');

    const submitBtn = screen.getByRole('button', { name: /submit claim/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mocks.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        architect_id: 'arch-123',
        proof_email: 'architect@studio.com',
        status: 'pending',
      });
    });

    // Should show success state
    await waitFor(() => {
      expect(screen.getByText('Claim Request Sent')).toBeInTheDocument();
    });

    // Should call onSuccess after delay (mock timers if needed, or wait)
    // The component has 2000ms delay. We should use fake timers.
  });

  it('handles submission error', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'DB Error' } });
    const user = userEvent.setup();
    render(<ClaimProfileDialog {...defaultProps} />);

    const input = screen.getByLabelText(/professional email/i);
    await user.type(input, 'architect@studio.com');

    const submitBtn = screen.getByRole('button', { name: /submit claim/i });
    await user.click(submitBtn);

    await waitFor(() => {
        expect(screen.getByText(/failed to submit claim/i)).toBeInTheDocument();
    });
  });
});
