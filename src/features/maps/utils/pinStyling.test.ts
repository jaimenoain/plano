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
  tier_rank_label: null,
  tier_rank: 1,
  ...overrides
} as ClusterResponse);

describe('getPinStyle', () => {
  describe('Suite 1: Library Logic (User Ratings)', () => {
    it('returns Tier S (Lime) for rating 3', () => {
      const item = createMockBuilding({ rating: 3, status: 'visited' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('S');
      expect(style.size).toBe(44);
      expect(style.classes).toContain('bg-lime-high');
      expect(style.classes).toContain('text-black');
    });

    it('returns Tier A (White, No Dot) for rating 2', () => {
      const item = createMockBuilding({ rating: 2 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('A');
      expect(style.classes).toContain('bg-white');
      expect(style.showDot).toBe(false);
    });

    it('returns Tier B (Ghost Style) for rating 1', () => {
      const item = createMockBuilding({ rating: 1 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('B');
      expect(style.size).toBe(28);
      expect(style.classes).toContain('bg-muted/80');
      expect(style.classes).toContain('border-gray-600');
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
    it("returns Tier S (Lime) for 'Top 1%'", () => {
      const item = createMockBuilding({ tier_rank_label: 'Top 1%' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('S');
      expect(style.classes).toContain('bg-lime-high');
    });

    it("returns Tier A for 'Top 10%'", () => {
      const item = createMockBuilding({ tier_rank_label: 'Top 10%' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('A');
    });

    it("returns Tier B for 'Top 20%'", () => {
      const item = createMockBuilding({ tier_rank_label: 'Top 20%' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('B');
    });

    it('returns Tier C for other ranks', () => {
      const item = createMockBuilding({ tier_rank_label: 'Standard' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('C');
    });
  });

  describe('Suite 3: Hierarchy/Hybrid Logic (Override Check)', () => {
    it('returns Tier B style when User Rating 1 overrides Global Tier S (Top 1%)', () => {
      // Scenario: A building is "Top 1%" (Global Tier S) BUT the user rated it "1 Star" (Personal Tier B).
      const item = createMockBuilding({
        tier_rank_label: 'Top 1%',
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
        tier_rank_label: 'Top 1%',
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

  describe('Suite 5: Cluster Logic', () => {
    it('returns high opacity lime mix for Tier 3 clusters', () => {
      const item = createMockBuilding({ is_cluster: true, max_tier: 3, count: 10 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('Cluster');
      expect(style.classes).toContain('bg-[#F6FFA0]/90');
      expect(style.classes).toContain('border-lime-high');
      expect(style.classes).toContain('border-2');
    });

    it('returns high opacity white for Tier 2 clusters', () => {
      const item = createMockBuilding({ is_cluster: true, max_tier: 2, count: 10 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('Cluster');
      expect(style.classes).toContain('bg-white/90');
      expect(style.classes).toContain('border-white');
      expect(style.classes).toContain('border-2');
    });

    it('returns standard style for Tier 1 clusters', () => {
      const item = createMockBuilding({ is_cluster: true, max_tier: 1, count: 10 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('Cluster');
      expect(style.classes).toContain('bg-[#f5f5f5]');
      expect(style.classes).toContain('border-gray-600');
      expect(style.classes).toContain('border');
      expect(style.classes).not.toContain('border-2');
    });
  });
});
