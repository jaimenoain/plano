// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanRouteDialog } from './PlanRouteDialog';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import React from 'react';

expect.extend(matchers);

// Mock Supabase
const { mockUpdate, mockEq, mockInvoke, mockToast } = vi.hoisted(() => {
  return {
    mockUpdate: vi.fn(),
    mockEq: vi.fn(),
    mockInvoke: vi.fn(),
    mockToast: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: mockUpdate
    }),
    functions: {
      invoke: mockInvoke
    }
  }
}));

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock ItineraryGenerationOverlay
vi.mock('./ItineraryGenerationOverlay', () => ({
  ItineraryGenerationOverlay: () => <div data-testid="overlay" />
}));

// Mock Dialog components from shadcn/ui
vi.mock('@/components/ui/dialog', () => {
  return {
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div>{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  };
});

describe('PlanRouteDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    collectionId: '123',
    onPlanGenerated: vi.fn(),
    hasItinerary: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({
      eq: mockEq.mockResolvedValue({ error: null })
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly', () => {
    render(<PlanRouteDialog {...defaultProps} />);
    expect(screen.getByText('✨ Plan Route')).toBeInTheDocument();
    expect(screen.getByText('Generate Itinerary')).toBeInTheDocument();
    expect(screen.queryByText('Remove Itinerary')).not.toBeInTheDocument();
  });

  it('shows remove button when hasItinerary is true', () => {
    render(<PlanRouteDialog {...defaultProps} hasItinerary={true} />);
    expect(screen.getByText('Remove Itinerary')).toBeInTheDocument();
  });

  it('calls delete logic when remove button is clicked', async () => {
    render(<PlanRouteDialog {...defaultProps} hasItinerary={true} />);

    const removeButton = screen.getByText('Remove Itinerary');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ itinerary: null });
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Itinerary Removed'
      }));
      expect(defaultProps.onPlanGenerated).toHaveBeenCalledWith('removed');
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('calls generation logic when form is submitted', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });
    render(<PlanRouteDialog {...defaultProps} />);

    const generateButton = screen.getByText('Generate Itinerary');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('generate-itinerary', expect.objectContaining({
        body: expect.objectContaining({
          collection_id: '123',
          days: 3, // default value
          transportMode: 'walking' // default value
        })
      }));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Itinerary Generated'
      }));
      expect(defaultProps.onPlanGenerated).toHaveBeenCalledWith('created');
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('handles delete error', async () => {
    const mockEqError = vi.fn().mockResolvedValue({ error: { message: 'Failed' } });
    mockUpdate.mockReturnValue({
      eq: mockEqError
    });

    render(<PlanRouteDialog {...defaultProps} hasItinerary={true} />);

    const removeButton = screen.getByText('Remove Itinerary');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        variant: 'destructive'
      }));
    });
  });
});
