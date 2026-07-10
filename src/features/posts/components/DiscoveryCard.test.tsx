// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DiscoveryCard } from './DiscoveryCard';
import { BrowserRouter } from 'react-router';

// Mock dependencies
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, loading: false }),
}));

vi.mock('@/features/buildings/hooks/useBuildingImages', () => ({
  useBuildingImages: () => ({ data: [] }),
}));

vi.mock('@/hooks/useIntersectionObserver', () => ({
  // Real hook returns containerRef as a callback ref (a function), not a RefObject.
  useIntersectionObserver: () => ({ isVisible: true, containerRef: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: () => ({ error: null }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock framer-motion useMotionValue and useTransform
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useMotionValue: (v: any) => ({ get: () => v, set: () => {}, onChange: () => {} }),
    useTransform: (v: any, _input: any, output: any) => {
        // Simple mock returning the initial output value or a function
        return output ? output[Math.floor(output.length / 2)] : 1;
    },
    motion: {
      div: ({ children, className, style, ...props }: any) => (
        <div className={className} style={style} {...props} data-testid="motion-div">
          {children}
        </div>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});


describe('DiscoveryCard', () => {
  // No global testing-library cleanup in this repo — renders would otherwise accumulate
  // and `getByText` would find duplicates across tests.
  afterEach(() => {
    cleanup();
  });

  const mockBuilding = {
    id: 'b1',
    name: 'Test Building',
    city: 'Test City',
    country: 'Test Country',
    slug: 'test-building',
    main_image_url: 'test.jpg',
    credits: [{ id: "123e4567-e89b-12d3-a456-426614174000", name: "Test Designer" }],
    contact_interactions: [],
  } as any;

  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <DiscoveryCard building={mockBuilding} />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Building')).toBeTruthy();
    expect(
      screen.getByText((content) => content.includes('Test City') && content.includes('Test Designer')),
    ).toBeTruthy();
  });

  describe('award overlay', () => {
    // ArrowRight is the keyboard equivalent of the save swipe; it opens the overlay.
    const openOverlay = () => {
      render(
        <BrowserRouter>
          <DiscoveryCard building={mockBuilding} />
        </BrowserRouter>
      );
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    };

    it('names the award tiers instead of numbering them', () => {
      openOverlay();

      expect(screen.getByText('Impressive')).toBeTruthy();
      expect(screen.getByText('Essential')).toBeTruthy();
      expect(screen.getByText('Masterpiece')).toBeTruthy();
      expect(screen.getByText('Save')).toBeTruthy();
    });

    it('never renders a numeric score', () => {
      openOverlay();

      // The old overlay showed bare 1 / 2 / 3 with "1 pt" / "2 pts" / "3 pts" labels —
      // exactly the "X out of 3" reading the award model exists to avoid.
      for (const banned of ['1', '2', '3', '1 pt', '2 pts', '3 pts']) {
        expect(screen.queryByText(banned)).toBeNull();
      }
      expect(screen.queryByText(/points/i)).toBeNull();
    });

    it('renders each tier with its own earned dots, inverted for the black stage', () => {
      openOverlay();

      expect(screen.getByLabelText('1 distinction')).toBeTruthy();
      expect(screen.getByLabelText('2 distinctions')).toBeTruthy();
      const masterpiece = screen.getByLabelText('3 distinctions');
      expect(masterpiece).toBeTruthy();
      // `.rdot.inv` — white dots, never lime, never black-on-black.
      const dot = masterpiece.firstElementChild as HTMLElement;
      expect(dot.className).toContain('bg-text-inverse');
    });
  });
});
