/**
 * Regression tests for the self-entry in the `rated_by` URL param.
 *
 * `auth.users.raw_user_meta_data.username` is stamped at signup and goes stale
 * when the user renames themselves; `profiles.username` is canonical. The
 * library-mode RPCs match `rated_by` against `profiles.username`, so writing
 * the stale JWT copy made My Library return zero rows for renamed users
 * (7 of 18 prod accounts at the time of the fix).
 */
import { describe, it, expect } from 'vitest';
import { buildRatedByParam } from './ratedByParam';

const base = {
  profileUsername: null as string | null,
  profileLoading: false,
  includeSelf: false,
  contactUsernames: [] as string[],
  isLoadingRatedBy: false,
  existingParam: null as string | null,
};

describe('buildRatedByParam', () => {
  it('adds self by profile username in library mode', () => {
    expect(
      buildRatedByParam({ ...base, includeSelf: true, profileUsername: 'real_profile_name' }),
    ).toBe('real_profile_name');
  });

  it('omits self while the profile has no username yet (library still works via auth.uid())', () => {
    expect(buildRatedByParam({ ...base, includeSelf: true })).toBeNull();
  });

  it('preserves a deep-linked param while the profile is loading', () => {
    expect(
      buildRatedByParam({
        ...base,
        includeSelf: true,
        profileLoading: true,
        existingParam: 'some_friend',
      }),
    ).toBe('some_friend');
  });

  it('preserves a deep-linked param while rated_by profiles are resolving', () => {
    expect(
      buildRatedByParam({
        ...base,
        isLoadingRatedBy: true,
        existingParam: 'some_friend',
      }),
    ).toBe('some_friend');
  });

  it('clears the param once loading settles with no self and no contacts', () => {
    expect(buildRatedByParam({ ...base, existingParam: 'stale_leftover' })).toBeNull();
  });

  it('unions self with selected contacts, deduplicated', () => {
    expect(
      buildRatedByParam({
        ...base,
        includeSelf: true,
        profileUsername: 'me',
        contactUsernames: ['friend1', 'me', 'friend2'],
      }),
    ).toBe('me,friend1,friend2');
  });

  it('keeps contacts even when self is unavailable', () => {
    expect(
      buildRatedByParam({ ...base, includeSelf: true, contactUsernames: ['friend1'] }),
    ).toBe('friend1');
  });
});
