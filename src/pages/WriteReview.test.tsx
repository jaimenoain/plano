// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WriteReview from './WriteReview';
import { BrowserRouter } from 'react-router-dom';

// Hoist mocks
const { mockInvoke, mockSupabaseFrom } = vi.hoisted(() => {
  return {
    mockInvoke: vi.fn(),
    mockSupabaseFrom: vi.fn(),
  };
});

// Mock Modules
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: 'b1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/utils/video-compression', () => ({
  VideoCompressionService: {
    compressVideo: vi.fn(),
  }
}));

vi.mock('@/lib/image-compression', () => ({
  resizeImage: vi.fn(),
}));

vi.mock('@/components/profile/CollectionSelector', () => ({
  CollectionSelector: () => <div>CollectionSelector</div>
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
    functions: {
      invoke: mockInvoke,
    },
    storage: {
        from: vi.fn(() => ({
            upload: vi.fn(),
            getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
        }))
    }
  },
}));

describe('WriteReview Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseFrom.mockImplementation((table: string) => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        upsert: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null })
      };

      if (table === 'buildings') {
        queryBuilder.single.mockResolvedValue({
          data: { id: 'b1', name: 'Test Building', slug: 'test-building', short_id: 123 },
          error: null
        });
        delete queryBuilder.then;
      } else if (table === 'user_buildings') {
         queryBuilder.maybeSingle.mockResolvedValue({
           data: null,
           error: null
         });
         delete queryBuilder.then;
      } else if (table === 'collection_items') {
         // keep thenable
      }
      return queryBuilder;
    });
  });

  it('fetches and populates link title on URL blur', async () => {
    mockInvoke.mockResolvedValue({
      data: { title: 'Example Domain' },
      error: null
    });

    render(
      <BrowserRouter>
        <WriteReview />
      </BrowserRouter>
    );

    // Wait for building name to load
    await waitFor(() => {
      expect(screen.getByText('Test Building')).toBeTruthy();
    });

    // Find and click "Add link" button
    const addLinkBtn = await screen.findByText(/Add link/i);
    fireEvent.click(addLinkBtn);

    // Find URL input
    const urlInput = await screen.findByPlaceholderText('https://...') as HTMLInputElement;
    const titleInput = screen.getByPlaceholderText('Title (optional)') as HTMLInputElement;

    // Type URL
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });

    // Blur URL input to trigger fetch
    fireEvent.blur(urlInput);

    // Verify fetch was called
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('fetch-url-metadata', {
        body: { url: 'https://example.com' }
      });
    });

    // Verify title is populated
    await waitFor(() => {
      expect(titleInput.value).toBe('Example Domain');
    });
  });

  it('does not fetch title if title field is not empty', async () => {
    mockInvoke.mockResolvedValue({
      data: { title: 'New Title' },
      error: null
    });

    render(
      <BrowserRouter>
        <WriteReview />
      </BrowserRouter>
    );

    await waitFor(() => {
        expect(screen.getByText('Test Building')).toBeTruthy();
    });

    // Check if input exists already
    if (!screen.queryByPlaceholderText('https://...')) {
        const addLinkBtn = await screen.findByText(/Add link/i);
        fireEvent.click(addLinkBtn);
    }

    const urlInput = await screen.findByPlaceholderText('https://...') as HTMLInputElement;
    const titleInput = screen.getByPlaceholderText('Title (optional)') as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: 'My Custom Title' } });
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.blur(urlInput);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockInvoke).not.toHaveBeenCalled();

    expect(titleInput.value).toBe('My Custom Title');
  });
});
