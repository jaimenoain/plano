import { describe, it, expect } from 'vitest';
import { getPinStyle } from './pinStyling';
import { ClusterResponse } from '../hooks/useMapData';

// Helper to create mock items
const createMockItem = (overrides: Partial<ClusterResponse>): ClusterResponse => ({
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
  describe('Clusters', () => {
    it('returns Cluster tier for clusters', () => {
      const item = createMockItem({ is_cluster: true, count: 50 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('Cluster');
      expect(style.shape).toBe('circle');
      expect(style.zIndex).toBe(10);
      expect(style.classes).toContain('bg-primary');
      expect(style.showContent).toBe(true);
    });

    it('sets size 64 for count > 1000', () => {
      const item = createMockItem({ is_cluster: true, count: 1001 });
      expect(getPinStyle(item).size).toBe(64);
    });

    it('sets size 48 for count > 100', () => {
      const item = createMockItem({ is_cluster: true, count: 101 });
      expect(getPinStyle(item).size).toBe(48);
    });

    it('sets size 32 for small clusters', () => {
      const item = createMockItem({ is_cluster: true, count: 50 });
      expect(getPinStyle(item).size).toBe(32);
    });
  });

  describe('Library Items (Context 1)', () => {
    it('returns Tier S for rating >= 3', () => {
      const item = createMockItem({ rating: 3, status: 'visited' });
      const style = getPinStyle(item);
      expect(style.tier).toBe('S');
      expect(style.zIndex).toBe(100);
      expect(style.classes).toContain('bg-lime-high');
    });

    it('returns Tier A for rating 2', () => {
      const item = createMockItem({ rating: 2 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('A');
      expect(style.zIndex).toBe(50);
      expect(style.classes).toContain('bg-white');
      expect(style.showDot).toBe(true);
    });

    it('returns Tier B for rating 1', () => {
      const item = createMockItem({ rating: 1 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('B');
      expect(style.zIndex).toBe(20);
      expect(style.classes).toContain('bg-muted-foreground');
    });

    it('returns Tier C for rating 0/Saved', () => {
      // Case 1: Saved status
      const savedItem = createMockItem({ rating: 0, status: 'saved' });
      expect(getPinStyle(savedItem).tier).toBe('C');
      expect(getPinStyle(savedItem).zIndex).toBe(5);
      expect(getPinStyle(savedItem).classes).toContain('bg-muted/80');

      // Case 2: Visited status (but rating 0)
      const visitedItem = createMockItem({ rating: 0, status: 'visited' });
      expect(getPinStyle(visitedItem).tier).toBe('C');
    });
  });

  describe('Discovery Items (Context 2)', () => {
    it('returns Tier S for Top 1%', () => {
      const item = createMockItem({ tier_rank: 'Top 1%', status: 'none', rating: 0 });
      const style = getPinStyle(item);
      expect(style.tier).toBe('S');
      expect(style.zIndex).toBe(100);
    });

    it('returns Tier A for Top 5%', () => {
      const item = createMockItem({ tier_rank: 'Top 5%', status: 'none', rating: 0 });
      expect(getPinStyle(item).tier).toBe('A');
      expect(getPinStyle(item).zIndex).toBe(50);
    });

    it('returns Tier A for Top 10%', () => {
      const item = createMockItem({ tier_rank: 'Top 10%', status: 'none', rating: 0 });
      expect(getPinStyle(item).tier).toBe('A');
    });

    it('returns Tier B for Top 20%', () => {
      const item = createMockItem({ tier_rank: 'Top 20%', status: 'none', rating: 0 });
      expect(getPinStyle(item).tier).toBe('B');
      expect(getPinStyle(item).zIndex).toBe(20);
    });

    it('returns Tier C for others', () => {
      const item = createMockItem({ tier_rank: 'Standard', status: 'none', rating: 0 });
      expect(getPinStyle(item).tier).toBe('C');
      expect(getPinStyle(item).zIndex).toBe(5);
    });

    it('returns Tier C for null rank', () => {
      const item = createMockItem({ tier_rank: null, status: 'none', rating: 0 });
      expect(getPinStyle(item).tier).toBe('C');
    });
  });

  describe('Shape Logic', () => {
    it('defaults to pin shape for items', () => {
      const item = createMockItem({});
      expect(getPinStyle(item).shape).toBe('pin');
    });
  });
});
