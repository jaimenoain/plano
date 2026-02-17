// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { BuildingHeader } from './BuildingHeader';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';

describe('BuildingHeader', () => {
    afterEach(() => {
        cleanup();
    });

    const mockBuilding: any = {
        id: '123',
        name: 'Building Name',
        alt_name: 'Alt Name',
        city: 'City',
        country: 'Country',
        tier_rank: 'Top 1%',
        location: { lat: 0, lng: 0 },
        address: '123 Main St',
        architects: [],
        year_completed: 2020,
        styles: [],
        created_by: 'user1',
        typology: [],
        materials: []
    };

    it('renders name and alt_name when they differ', () => {
        render(
            <MemoryRouter>
                <BuildingHeader building={mockBuilding} showEditLink={false} />
            </MemoryRouter>
        );

        const names = screen.getAllByText('Building Name');
        expect(names).toHaveLength(1);
        expect(screen.getByText('Alt Name')).toBeTruthy();
        const subtitle = screen.getByText('Alt Name');
        expect(subtitle.tagName).toBe('H2');
        expect(subtitle.className).toContain('text-muted-foreground');
    });

    it('does not render alt_name if same as name', () => {
        const building = { ...mockBuilding, alt_name: 'Building Name' };
        render(
            <MemoryRouter>
                <BuildingHeader building={building} showEditLink={false} />
            </MemoryRouter>
        );

        const elements = screen.getAllByText('Building Name');
        expect(elements).toHaveLength(1);

        // Should not find a subtitle H2
        const h2 = screen.queryByRole('heading', { level: 2 });
        expect(h2).toBeNull();
    });

    it('does not render alt_name if missing', () => {
        const building = { ...mockBuilding, alt_name: null };
        render(
            <MemoryRouter>
                <BuildingHeader building={building} showEditLink={false} />
            </MemoryRouter>
        );
        const elements = screen.getAllByText('Building Name');
        expect(elements).toHaveLength(1);

        const h2 = screen.queryByRole('heading', { level: 2 });
        expect(h2).toBeNull();
    });
});
