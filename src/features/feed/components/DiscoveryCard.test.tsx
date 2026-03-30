// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoveryCard } from './DiscoveryCard';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, loading: false }),
}));

vi.mock('@/hooks/useBuildingImages', () => ({
  useBuildingImages: () => ({ data: [] }),
}));

vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({ isVisible: true, containerRef: { current: null } }),
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
  const mockBuilding = {
    id: 'b1',
    name: 'Test Building',
    city: 'Test City',
    country: 'Test Country',
    slug: 'test-building',
    main_image_url: 'test.jpg',
    architects: [{ name: 'Test Architect' }],
    contact_interactions: [],
  } as any;

  it('renders correctly', () => {
    render(
      <BrowserRouter>
        <DiscoveryCard building={mockBuilding} />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Building')).toBeTruthy();
    expect(screen.getByText('Test City, Test Country')).toBeTruthy();
    expect(screen.getByText('Test Architect')).toBeTruthy();
  });
});
