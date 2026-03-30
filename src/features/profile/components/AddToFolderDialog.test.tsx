
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { AddToFolderDialog } from './AddToFolderDialog';

expect.extend(matchers);

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: { id: 'new-folder-id', name: 'New Folder' }, error: null })
        })),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      insert: vi.fn(() => ({
         select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-folder-id', name: 'New Folder' }, error: null })
         })),
      })),
      delete: vi.fn(() => ({
          eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ error: null })
          }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null })
      })),
    })),
  },
}));

// Mock Toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('AddToFolderDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    collectionId: 'col-123',
    userId: 'user-123',
  };

  it('renders correctly', () => {
    render(<AddToFolderDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Add to Folder' })).toBeInTheDocument();
    // Use getAllByText for duplicate text or select more specifically
    expect(screen.getAllByText('Create New Folder').length).toBeGreaterThan(0);
  });

  it('switches to create folder view', async () => {
    render(<AddToFolderDialog {...defaultProps} />);

    // Find the button specifically
    const createBtn = screen.getByRole('button', { name: /Create New Folder/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: 'New Folder' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Travel Ideas')).toBeInTheDocument();
  });
});
