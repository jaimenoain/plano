import { describe, it, expect } from 'vitest';
import { synthesizeAccess } from './accessSynthesis';
import { Unlock, Ticket, Eye, Lock, DoorOpen, Store, Search } from 'lucide-react';

describe('synthesizeAccess', () => {
    it('returns Free Public Access with Unlock icon', () => {
        const result = synthesizeAccess('public', null, 'free');
        expect(result.label).toBe('Free Public Access');
        expect(result.icon).toBe(Unlock);
    });

    it('returns Restricted (Booking Required) with Ticket icon', () => {
        const result = synthesizeAccess('restricted', 'booking_required', null);
        expect(result.label).toBe('Restricted (Booking Required)');
        expect(result.icon).toBe(Ticket);
    });

    it('returns Private (Exterior Only) with Eye icon', () => {
        const result = synthesizeAccess('private', 'exterior_only', null);
        expect(result.label).toBe('Private (Exterior Only)');
        expect(result.icon).toBe(Eye);
    });

    it('returns Private with Lock icon when only level is private', () => {
        const result = synthesizeAccess('private', null, null);
        expect(result.label).toBe('Private');
        expect(result.icon).toBe(Lock);
    });

    it('returns Exterior Only with Eye icon when only logistics is exterior_only', () => {
        const result = synthesizeAccess(null, 'exterior_only', null);
        expect(result.label).toBe('Exterior Only');
        expect(result.icon).toBe(Eye);
    });

    it('handles partial data gracefully (only level is public)', () => {
        const result = synthesizeAccess('public', null, null);
        expect(result.label).toBe('Public Access');
        expect(result.icon).toBe(Unlock);
    });

    it('handles partial data gracefully (only logistics is walk-in)', () => {
        const result = synthesizeAccess(null, 'walk-in', null);
        expect(result.label).toBe('Walk-in Access');
        expect(result.icon).toBe(DoorOpen);
    });

    it('handles partial data gracefully (only cost is free)', () => {
        const result = synthesizeAccess(null, null, 'free');
        expect(result.label).toBe('Free Access');
        expect(result.icon).toBe(Unlock);
    });

    it('returns Access Unknown with Search icon for fully null input', () => {
        const result = synthesizeAccess(null, null, null);
        expect(result.label).toBe('Access Unknown');
        expect(result.icon).toBe(Search);
    });
});
