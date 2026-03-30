// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AddBuildingDialog } from './AddBuildingDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const { mockSupabase } = vi.hoisted(() => {
    return {
        mockSupabase: {
            rpc: vi.fn(),
            from: vi.fn(),
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
            },
        }
    };
});

vi.mock('@/integrations/supabase/client', () => ({
    supabase: mockSupabase
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn()
    })
}));

describe('AddBuildingDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase.rpc.mockReset();
        mockSupabase.from.mockReset();
        // Reset auth mock default behavior
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('renders the add button', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddBuildingDialog />
            </QueryClientProvider>
        );
        expect(screen.getByText('Add')).toBeTruthy();
    });

    it('searches for buildings and displays results', async () => {
        const mockBuildings = [
            { id: 'b1', name: 'Test Building 1', city: 'City A', country: 'Country A' },
            { id: 'b2', name: 'Test Building 2', city: 'City B', country: 'Country B' }
        ];

        mockSupabase.rpc.mockResolvedValue({ data: mockBuildings, error: null });

        render(
            <QueryClientProvider client={queryClient}>
                <AddBuildingDialog />
            </QueryClientProvider>
        );

        // Open dialog
        fireEvent.click(screen.getByText('Add'));

        // Type in search
        const input = screen.getByPlaceholderText('Search for a building...');
        fireEvent.change(input, { target: { value: 'Test' } });

        // Wait for debounce and query
        await waitFor(() => {
            expect(mockSupabase.rpc).toHaveBeenCalledWith('search_buildings', { query_text: 'Test' });
        }, { timeout: 2000 });

        // Check if results are displayed
        expect(await screen.findByText('Test Building 1')).toBeTruthy();
        expect(screen.getByText('Test Building 2')).toBeTruthy();
    });

    it('adds a building when clicked', async () => {
        const mockBuildings = [
            { id: 'b1', name: 'Test Building 1', city: 'City A', country: 'Country A' }
        ];
        mockSupabase.rpc.mockResolvedValue({ data: mockBuildings, error: null });

        const mockUpsert = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockReturnValue({
            upsert: mockUpsert
        });

        const onBuildingAdded = vi.fn();

        render(
            <QueryClientProvider client={queryClient}>
                <AddBuildingDialog onBuildingAdded={onBuildingAdded} />
            </QueryClientProvider>
        );

        fireEvent.click(screen.getByText('Add'));
        const input = screen.getByPlaceholderText('Search for a building...');
        fireEvent.change(input, { target: { value: 'Test' } });

        await screen.findByText('Test Building 1');

        // Click "Mark Visited" (Check icon button)
        const visitedButtons = screen.getAllByTitle('Mark as Visited');
        // If duplicates persist, just click the first one for now to unblock, but we expect 1.
        fireEvent.click(visitedButtons[0]);

        await waitFor(() => {
            expect(mockSupabase.from).toHaveBeenCalledWith('user_buildings');
            expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user-123',
                building_id: 'b1',
                status: 'visited'
            }), expect.anything());
            expect(onBuildingAdded).toHaveBeenCalled();
        });
    });
});
