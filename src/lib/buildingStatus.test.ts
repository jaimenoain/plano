import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXCLUDED_CONSTRUCTION_STATUSES,
  SHOW_LOST_EXCLUDED_CONSTRUCTION_STATUSES,
  formatBuildingStatusForDisplay,
  getShowLostFromUrlParams,
  isLostStatus,
  normalizeConstructionStatus,
  normalizeConstructionStatuses,
  resolveConstructionStatuses,
} from './buildingStatus';

describe('buildingStatus', () => {
  it('treats Demolished as lost', () => {
    expect(isLostStatus('Lost')).toBe(true);
    expect(isLostStatus('Demolished')).toBe(true);
    expect(isLostStatus('Built')).toBe(false);
  });

  it('normalizes Demolished to Lost', () => {
    expect(normalizeConstructionStatus('Demolished')).toBe('Lost');
    expect(normalizeConstructionStatuses(['Demolished', 'Lost', 'Built'])).toEqual([
      'Lost',
      'Built',
    ]);
  });

  it('formats Demolished for display as Lost', () => {
    expect(formatBuildingStatusForDisplay('Demolished')).toBe('Lost');
  });

  it('reads showLost from legacy showDemolished URL param', () => {
    const params = new URLSearchParams('showDemolished=true');
    expect(getShowLostFromUrlParams((k) => params.get(k))).toBe(true);
    const next = new URLSearchParams('showLost=true');
    expect(getShowLostFromUrlParams((k) => next.get(k))).toBe(true);
  });

  // resolveConstructionStatuses is the SINGLE payload the SERP list
  // (get_buildings_list) and the map pins (get_map_clusters_v3) both send, so the
  // two surfaces stay in parity on Building-status / Show-lost.
  describe('resolveConstructionStatuses', () => {
    it('defaults to excluding non-standing + not-yet-built statuses', () => {
      expect(resolveConstructionStatuses({})).toEqual({
        exclude_construction_statuses: [...DEFAULT_EXCLUDED_CONSTRUCTION_STATUSES],
      });
    });

    it('reveals Lost/Demolished when showLost is on', () => {
      expect(resolveConstructionStatuses({ showLost: true })).toEqual({
        exclude_construction_statuses: [...SHOW_LOST_EXCLUDED_CONSTRUCTION_STATUSES],
      });
    });

    it('switches to strict inclusion when explicit statuses are picked', () => {
      expect(
        resolveConstructionStatuses({ constructionStatuses: ['Under Construction'] }),
      ).toEqual({ construction_statuses: ['Under Construction'] });
    });

    it('explicit picks take precedence over showLost', () => {
      expect(
        resolveConstructionStatuses({ constructionStatuses: ['Lost'], showLost: true }),
      ).toEqual({ construction_statuses: ['Lost'] });
    });
  });
});
