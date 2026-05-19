import { describe, expect, it } from 'vitest';
import {
  formatBuildingStatusForDisplay,
  getShowLostFromUrlParams,
  isLostStatus,
  normalizeConstructionStatus,
  normalizeConstructionStatuses,
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
});
