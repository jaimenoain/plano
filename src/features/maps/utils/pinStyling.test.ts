import { describe, it, expect } from 'vitest';
import { getPinStyle } from './pinStyling';
import { ClusterResponse } from '../hooks/useMapData';

// Helper to create mock items
const createMockBuilding = (overrides: Partial<ClusterResponse>): ClusterResponse => ({
  id: '1',
  lat: 0,
  lng: 0,
  is_cluster: false,
  count: 1,
  rating: null,
  status: 'none',
  tier_rank: null,
  ...overrides
} as ClusterResponse);

describe('getPinStyle', () => {
  describe('Suite 1: Library Logic (User Ratings)', () => {
    it('returns Tier S (Lime, Size 44px) for rating 3', () => {
      const item = createMockBuilding({ rating: 3, status: 'visited' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('S');
      expect(style.size).toBe(44);
      expect(style.classes).toContain('bg-lime-high');
    });

    it('returns Tier A (White, Lime Dot) for rating 2', () => {
      const item = createMockBuilding({ rating: 2 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('A');
      expect(style.classes).toContain('bg-white');
      expect(style.showDot).toBe(true);
    });

    it('returns Tier B (Gray) for rating 1', () => {
      const item = createMockBuilding({ rating: 1 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('B');
      expect(style.classes).toContain('bg-muted-foreground');
    });

    it('returns Tier C (Ghost) for saved item (rating 0/null)', () => {
      // Case 1: Rating 0, Status 'saved'
      const savedItem = createMockBuilding({ rating: 0, status: 'saved' });
      let style = getPinStyle(savedItem);
      expect(style.tier).toBe('C');
      expect(style.classes).toContain('bg-muted/80');
      expect(style.classes).toContain('border-gray-600');

      // Case 2: Rating null, Status 'saved'
      const savedItemNull = createMockBuilding({ rating: null, status: 'saved' });
      style = getPinStyle(savedItemNull);
      expect(style.tier).toBe('C');
      expect(style.classes).toContain('bg-muted/80');
      expect(style.classes).toContain('border-gray-600');
    });
  });

  describe('Suite 2: Discover Logic (Global Ranking)', () => {
    it("returns Tier S for 'Top 1%'", () => {
      const item = createMockBuilding({ tier_rank: 'Top 1%' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('S');
    });

    it("returns Tier A for 'Top 10%'", () => {
      const item = createMockBuilding({ tier_rank: 'Top 10%' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('A');
    });

    it("returns Tier B for 'Top 20%'", () => {
      const item = createMockBuilding({ tier_rank: 'Top 20%' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('B');
    });

    it('returns Tier C for other ranks', () => {
      const item = createMockBuilding({ tier_rank: 'Standard' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('C');
    });
  });

  describe('Suite 3: Hierarchy/Hybrid Logic (Override Check)', () => {
    it('returns Tier B style when User Rating 1 overrides Global Tier S (Top 1%)', () => {
      // Scenario: A building is "Top 1%" (Global Tier S) BUT the user rated it "1 Star" (Personal Tier B).
      const item = createMockBuilding({
        tier_rank: 'Top 1%',
        rating: 1,
        status: 'visited' // Implicitly visited if rated, or explicitly status
      });
      const style = getPinStyle(item);

      // Expectation: The function MUST return Tier B style. Personal rating always overrides global rank.
      expect(style.tier).toBe('B');
    });

    it('returns Tier C style when User Saved (Unrated) overrides Global Tier S (Top 1%)', () => {
      // Scenario: "Top 1%" but user saved it (rating 0/null).
      const item = createMockBuilding({
        tier_rank: 'Top 1%',
        rating: 0,
        status: 'saved'
      });
      const style = getPinStyle(item);

      expect(style.tier).toBe('C');
    });
  });

  describe('Suite 4: Shape Logic', () => {
    it("sets shape: 'circle' when location_approximate: true", () => {
      const item = createMockBuilding({ location_approximate: true });
      const style = getPinStyle(item);
      expect(style.shape).toBe('circle');
    });

    it("sets shape: 'pin' when location_approximate: false", () => {
      const item = createMockBuilding({ location_approximate: false });
      const style = getPinStyle(item);
      expect(style.shape).toBe('pin');
    });

    it("defaults to shape: 'pin' when location_approximate is undefined", () => {
      const item = createMockBuilding({}); // location_approximate undefined
      const style = getPinStyle(item);
      expect(style.shape).toBe('pin');
    });
  });
});
