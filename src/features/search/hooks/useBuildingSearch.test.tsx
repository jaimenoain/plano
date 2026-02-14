import { describe, it, expect, vi } from 'vitest';

// Mock dependencies to avoid side effects during import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({}),
}));
vi.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => ({}),
}));
vi.mock('@/hooks/useUserBuildingStatuses', () => ({
  useUserBuildingStatuses: () => ({}),
}));

import { filterBuildingIds } from './useBuildingSearch';

describe('filterBuildingIds', () => {
  const user = { id: 'me' };
  const friend1 = { id: 'friend1', username: 'friend1' };
  const friend2 = { id: 'friend2', username: 'friend2' };
  const selectedContacts = [friend1];

  it('should apply INTERSECTION when ratedByMe and hasSpecificContacts are true', () => {
    // Data:
    // b1: me, friend1 (match)
    // b2: me (no match)
    // b3: friend1 (no match - must be me AND friend)
    // b4: me, friend2 (no match - friend2 not selected)
    const userBuildings = [
      { building_id: 'b1', user_id: 'me' },
      { building_id: 'b1', user_id: 'friend1' },
      { building_id: 'b2', user_id: 'me' },
      { building_id: 'b3', user_id: 'friend1' },
      { building_id: 'b4', user_id: 'me' },
      { building_id: 'b4', user_id: 'friend2' },
    ];

    const result = filterBuildingIds(
      userBuildings,
      user as any,
      selectedContacts as any,
      true, // ratedByMe
      true // hasSpecificContacts
    );

    expect(result.size).toBe(1);
    expect(result.has('b1')).toBe(true);
  });

  it('should apply UNION when ratedByMe is false (Discover Mode)', () => {
    // Data:
    // b1: friend1
    // b3: friend1
    // b4: friend2 (not in selected contacts but maybe in query results if we queried all?)
    // But assuming userBuildings contains what we queried.
    const userBuildings = [
      { building_id: 'b1', user_id: 'friend1' },
      { building_id: 'b3', user_id: 'friend1' },
    ];

    const result = filterBuildingIds(
      userBuildings,
      user as any,
      selectedContacts as any,
      false, // ratedByMe=false
      true // hasSpecificContacts=true
    );

    expect(result.size).toBe(2);
    expect(result.has('b1')).toBe(true);
    expect(result.has('b3')).toBe(true);
  });

  it('should apply UNION when hasSpecificContacts is false (My Library Mode)', () => {
    const userBuildings = [
      { building_id: 'b2', user_id: 'me' },
    ];

    const result = filterBuildingIds(
      userBuildings,
      user as any,
      [] as any,
      true, // ratedByMe
      false // hasSpecificContacts
    );

    expect(result.size).toBe(1);
    expect(result.has('b2')).toBe(true);
  });

  it('should handle multiple contacts intersection correctly', () => {
    // "My Library" + "Friend1, Friend2"
    // Interpretation: (Me) AND (Friend1 OR Friend2)
    // Logic: hasMe && (hasFriend1 || hasFriend2)

    const contacts = [friend1, friend2];

    // b1: me, friend1 -> Match
    // b2: me, friend2 -> Match
    // b3: me -> No match
    // b4: friend1 -> No match
    const userBuildings = [
        { building_id: 'b1', user_id: 'me' },
        { building_id: 'b1', user_id: 'friend1' },
        { building_id: 'b2', user_id: 'me' },
        { building_id: 'b2', user_id: 'friend2' },
        { building_id: 'b3', user_id: 'me' },
        { building_id: 'b4', user_id: 'friend1' },
    ];

    const result = filterBuildingIds(
      userBuildings,
      user as any,
      contacts as any,
      true, // ratedByMe
      true // hasSpecificContacts
    );

    expect(result.size).toBe(2);
    expect(result.has('b1')).toBe(true);
    expect(result.has('b2')).toBe(true);
    expect(result.has('b3')).toBe(false);
  });
});
