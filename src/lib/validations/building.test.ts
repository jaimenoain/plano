import { describe, it, expect } from 'vitest';
import { buildingSchema } from './building';

describe('buildingSchema', () => {
    const validBaseData = {
        name: 'Test Building',
        year_completed: 2020,
        architects: [{ id: '123', name: 'John Doe', type: 'individual' as const }],
        functional_typology_ids: ['e1e8b2c2-8094-4322-a9ad-4e6f4705cb8f'],
    };

    it('accepts valid enum values for access_level', () => {
        const validLevels = ['public', 'private', 'restricted', 'commercial'] as const;

        validLevels.forEach(level => {
            const result = buildingSchema.safeParse({ ...validBaseData, access_level: level });
            expect(result.success).toBe(true);
        });
    });

    it('rejects invalid enum values for access_level', () => {
        const result = buildingSchema.safeParse({ ...validBaseData, access_level: 'unknown_level' });
        expect(result.success).toBe(false);
    });

    it('accepts valid enum values for access_logistics', () => {
        const validLogistics = ['walk-in', 'booking_required', 'tour_only', 'exterior_only'] as const;

        validLogistics.forEach(logistics => {
            const result = buildingSchema.safeParse({ ...validBaseData, access_logistics: logistics });
            expect(result.success).toBe(true);
        });
    });

    it('rejects invalid enum values for access_logistics', () => {
        const result = buildingSchema.safeParse({ ...validBaseData, access_logistics: 'jump-in' });
        expect(result.success).toBe(false);
    });

    it('accepts valid enum values for access_cost', () => {
        const validCosts = ['free', 'paid', 'customers_only'] as const;

        validCosts.forEach(cost => {
            const result = buildingSchema.safeParse({ ...validBaseData, access_cost: cost });
            expect(result.success).toBe(true);
        });
    });

    it('rejects invalid enum values for access_cost', () => {
        const result = buildingSchema.safeParse({ ...validBaseData, access_cost: 'expensive' });
        expect(result.success).toBe(false);
    });

    it('accepts access_notes under 500 characters', () => {
        const notes = 'A'.repeat(499);
        const result = buildingSchema.safeParse({ ...validBaseData, access_notes: notes });
        expect(result.success).toBe(true);
    });

    it('accepts access_notes exactly 500 characters', () => {
        const notes = 'A'.repeat(500);
        const result = buildingSchema.safeParse({ ...validBaseData, access_notes: notes });
        expect(result.success).toBe(true);
    });

    it('rejects access_notes over 500 characters', () => {
        const notes = 'A'.repeat(501);
        const result = buildingSchema.safeParse({ ...validBaseData, access_notes: notes });
        expect(result.success).toBe(false);
        if (!result.success) {
             const issue = result.error.issues.find(i => i.path[0] === 'access_notes');
             expect(issue).toBeDefined();
             expect(issue?.message).toBe('Notes must be less than 500 characters');
        }
    });

    it('accepts null or undefined for optional access fields', () => {
        const result = buildingSchema.safeParse({
            ...validBaseData,
            access_level: null,
            access_logistics: undefined,
            access_cost: null,
            access_notes: undefined
        });
        expect(result.success).toBe(true);
    });
});
