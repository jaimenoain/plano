import { describe, it, expect } from 'vitest';
import { synthesizeAccess } from './accessSynthesis';
import { Unlock, Ticket, Eye, Lock, DoorOpen, Store, Search } from 'lucide-react';

describe('synthesizeAccess', () => {
    // 1. Private & Restrictive States
    it('returns Private (Exterior Only) with Eye icon', () => {
        const result = synthesizeAccess('private', 'exterior_only', null);
        expect(result.label).toBe('Private (Exterior Only)');
        expect(result.icon).toBe(Eye);
        expect(result.variant).toBe('secondary');
    });

    it('returns Private with Lock icon when only level is private', () => {
        const result = synthesizeAccess('private', null, null);
        expect(result.label).toBe('Private');
        expect(result.icon).toBe(Lock);
        expect(result.variant).toBe('secondary');
    });

    it('returns Exterior Only with Eye icon when only logistics is exterior_only', () => {
        const result = synthesizeAccess(null, 'exterior_only', null);
        expect(result.label).toBe('Exterior Only');
        expect(result.icon).toBe(Eye);
        expect(result.variant).toBe('secondary');
    });

    it('returns Restricted (Booking Required) with Ticket icon', () => {
        const result = synthesizeAccess('restricted', 'booking_required', null);
        expect(result.label).toBe('Restricted (Booking Required)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('warning');
    });

    it('returns Restricted (Tour Only) with Ticket icon', () => {
        const result = synthesizeAccess('restricted', 'tour_only', null);
        expect(result.label).toBe('Restricted (Tour Only)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('warning');
    });

    it('returns Restricted Access with Lock icon', () => {
        const result = synthesizeAccess('restricted', null, null);
        expect(result.label).toBe('Restricted Access');
        expect(result.icon).toBe(Lock);
        expect(result.variant).toBe('warning');
    });

    // 2. Commercial Spaces
    it('returns Commercial (Customers Only) with Store icon', () => {
        const result = synthesizeAccess('commercial', null, 'customers_only');
        expect(result.label).toBe('Commercial (Customers Only)');
        expect(result.icon).toBe(Store);
        expect(result.variant).toBe('outline');
    });

    it('returns Commercial (Paid Entry) with Ticket icon', () => {
        const result = synthesizeAccess('commercial', null, 'paid');
        expect(result.label).toBe('Commercial (Paid Entry)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('outline');
    });

    it('returns Commercial (Booking Required) with Ticket icon', () => {
        const result = synthesizeAccess('commercial', 'booking_required', null);
        expect(result.label).toBe('Commercial (Booking Required)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('outline');
    });

    it('returns Commercial Access with DoorOpen icon', () => {
        const result = synthesizeAccess('commercial', null, null);
        expect(result.label).toBe('Commercial Access');
        expect(result.icon).toBe(DoorOpen);
        expect(result.variant).toBe('outline');
    });

    // 3. Public Spaces
    it('returns Public (Booking Required) with Ticket icon', () => {
        const result = synthesizeAccess('public', 'booking_required', null);
        expect(result.label).toBe('Public (Booking Required)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('default');
    });

    it('returns Public (Tour Only) with Ticket icon', () => {
        const result = synthesizeAccess('public', 'tour_only', null);
        expect(result.label).toBe('Public (Tour Only)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('default');
    });

    it('returns Free Public Access with Unlock icon', () => {
        const result = synthesizeAccess('public', null, 'free');
        expect(result.label).toBe('Free Public Access');
        expect(result.icon).toBe(Unlock);
        expect(result.variant).toBe('default');
    });

    it('returns Public (Paid) with Ticket icon', () => {
        const result = synthesizeAccess('public', null, 'paid');
        expect(result.label).toBe('Public (Paid)');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('default');
    });

    it('handles partial data gracefully (only level is public)', () => {
        const result = synthesizeAccess('public', null, null);
        expect(result.label).toBe('Public Access');
        expect(result.icon).toBe(Unlock);
        expect(result.variant).toBe('default');
    });

    // 4. Incomplete data fallbacks based on logistics or cost
    it('returns Free Walk-in with Unlock icon', () => {
        const result = synthesizeAccess(null, 'walk-in', 'free');
        expect(result.label).toBe('Free Walk-in');
        expect(result.icon).toBe(Unlock);
        expect(result.variant).toBe('default');
    });

    it('returns Paid Walk-in with Ticket icon', () => {
        const result = synthesizeAccess(null, 'walk-in', 'paid');
        expect(result.label).toBe('Paid Walk-in');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('default');
    });

    it('handles partial data gracefully (only logistics is walk-in)', () => {
        const result = synthesizeAccess(null, 'walk-in', null);
        expect(result.label).toBe('Walk-in Access');
        expect(result.icon).toBe(DoorOpen);
        expect(result.variant).toBe('default');
    });

    it('returns Booking Required with Ticket icon', () => {
        const result = synthesizeAccess(null, 'booking_required', null);
        expect(result.label).toBe('Booking Required');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('outline');
    });

    it('returns Tour Only with Ticket icon', () => {
        const result = synthesizeAccess(null, 'tour_only', null);
        expect(result.label).toBe('Tour Only');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('outline');
    });

    it('handles partial data gracefully (only cost is free)', () => {
        const result = synthesizeAccess(null, null, 'free');
        expect(result.label).toBe('Free Access');
        expect(result.icon).toBe(Unlock);
        expect(result.variant).toBe('default');
    });

    it('returns Paid Access with Ticket icon', () => {
        const result = synthesizeAccess(null, null, 'paid');
        expect(result.label).toBe('Paid Access');
        expect(result.icon).toBe(Ticket);
        expect(result.variant).toBe('outline');
    });

    it('returns Customers Only with Store icon', () => {
        const result = synthesizeAccess(null, null, 'customers_only');
        expect(result.label).toBe('Customers Only');
        expect(result.icon).toBe(Store);
        expect(result.variant).toBe('outline');
    });

    // 5. Default
    it('returns Access Unknown with Search icon for fully null input', () => {
        const result = synthesizeAccess(null, null, null);
        expect(result.label).toBe('Access Unknown');
        expect(result.icon).toBe(Search);
        expect(result.variant).toBe('secondary');
    });

    // 6. Edge cases and conflicting combinations
    it('prioritizes private level over walk-in logistics', () => {
        const result = synthesizeAccess('private', 'walk-in', null);
        expect(result.label).toBe('Private');
        expect(result.icon).toBe(Lock);
        expect(result.variant).toBe('secondary');
    });

    it('prioritizes exterior_only logistics even without level', () => {
        const result = synthesizeAccess(null, 'exterior_only', 'free');
        expect(result.label).toBe('Exterior Only');
        expect(result.icon).toBe(Eye);
        expect(result.variant).toBe('secondary');
    });

    it('handles commercial with free cost by returning generic Commercial Access', () => {
        const result = synthesizeAccess('commercial', null, 'free');
        // Because level is commercial and cost is free, it falls through to generic
        expect(result.label).toBe('Commercial Access');
        expect(result.icon).toBe(DoorOpen);
        expect(result.variant).toBe('outline');
    });
});
