// @vitest-environment happy-dom
import { render, screen, cleanup } from '@testing-library/react';
import { BuildingHeader } from './BuildingHeader';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, afterEach } from 'vitest';
import type { BuildingCreditWithEntities } from '@/features/credits/types';

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
        expect(subtitle.tagName).toBe('P');
        expect(subtitle.className).toContain('text-lg');
        expect(subtitle.className).toContain('text-text-secondary');
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

    it('renders primary credits as person and company links', () => {
        const primaryCredits: BuildingCreditWithEntities[] = [
            {
                id: 'c1',
                buildingId: '123',
                personId: 'p1',
                companyId: 'co1',
                role: 'design_architecture',
                roleCustom: null,
                creditTier: 'primary',
                isLead: true,
                contributionNotes: null,
                yearFrom: null,
                yearTo: null,
                projectUrl: null,
                status: 'active',
                flagReason: null,
                flagNotes: null,
                flaggedAt: null,
                flaggedFromStatus: null,
                flaggedByUserId: null,
                addedByUserId: null,
                displayOrder: 0,
                createdAt: '',
                updatedAt: '',
                person: { id: 'p1', name: 'Jane Architect', slug: 'jane-architect' },
                company: { id: 'co1', name: 'Studio Co', slug: 'studio-co' },
            },
        ];
        render(
            <MemoryRouter>
                <BuildingHeader
                    building={mockBuilding}
                    primaryCredits={primaryCredits}
                    showEditLink={false}
                />
            </MemoryRouter>
        );
        const personLink = screen.getByRole('link', { name: 'Jane Architect' });
        expect(personLink.getAttribute('href')).toBe('/person/jane-architect');
        const companyLink = screen.getByRole('link', { name: 'Studio Co' });
        expect(companyLink.getAttribute('href')).toBe('/company/studio-co');

        const attribution = screen.getByRole('link', { name: 'Jane Architect' }).parentElement;
        expect(attribution?.textContent).toMatch(/Jane Architect\s*@\s*Studio Co/);
        expect(attribution?.textContent).not.toMatch(
            new RegExp('/' + 'architect' + '/'),
        );
    });

    it('primary credit hrefs use person or company paths only', () => {
        const primaryCredits: BuildingCreditWithEntities[] = [
            {
                id: 'c-person',
                buildingId: '123',
                personId: 'p1',
                companyId: null,
                role: 'design_architecture',
                roleCustom: null,
                creditTier: 'primary',
                isLead: true,
                contributionNotes: null,
                yearFrom: null,
                yearTo: null,
                projectUrl: null,
                status: 'active',
                flagReason: null,
                flagNotes: null,
                flaggedAt: null,
                flaggedFromStatus: null,
                flaggedByUserId: null,
                addedByUserId: null,
                displayOrder: 0,
                createdAt: '',
                updatedAt: '',
                person: { id: 'p1', name: 'Solo Person', slug: 'solo-person' },
                company: null,
            },
            {
                id: 'c-co',
                buildingId: '123',
                personId: null,
                companyId: 'co1',
                role: 'structural_engineering',
                roleCustom: null,
                creditTier: 'primary',
                isLead: false,
                contributionNotes: null,
                yearFrom: null,
                yearTo: null,
                projectUrl: null,
                status: 'active',
                flagReason: null,
                flagNotes: null,
                flaggedAt: null,
                flaggedFromStatus: null,
                flaggedByUserId: null,
                addedByUserId: null,
                displayOrder: 1,
                createdAt: '',
                updatedAt: '',
                person: null,
                company: { id: 'co1', name: 'Solo Co', slug: 'solo-co' },
            },
        ];
        render(
            <MemoryRouter>
                <BuildingHeader
                    building={mockBuilding}
                    primaryCredits={primaryCredits}
                    showEditLink={false}
                />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: 'Solo Person' })).toHaveAttribute(
            'href',
            '/person/solo-person',
        );
        expect(screen.getByRole('link', { name: 'Solo Co' })).toHaveAttribute('href', '/company/solo-co');
        const links = screen.getAllByRole('link');
        for (const a of links) {
            const href = a.getAttribute('href') ?? '';
            expect(href).not.toMatch(new RegExp('/' + 'architect' + '/'));
        }
    });
});
