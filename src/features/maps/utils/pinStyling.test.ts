import { describe, it, expect } from 'vitest';
import { getPinStyle, getGlobalTierRank, getPersonalTierRank, getEffectivePinRank } from './pinStyling';
import { ClusterResponse } from '../hooks/useMapData';
import { MAP_MARKER_FILL, ghostFill } from '../constants/mapMarkerFills';

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

describe('MAP_MARKER_FILL', () => {
  // Regression guard. `brandPrimary` used to hold #BEFF00: the constant was written when
  // --brand-primary *was* lime, and it was never updated when the brand flipped to black.
  // Markers are monochrome; lime is rationed to CTA fills, focus rings, the hover arrow
  // and one .accent-tag. See docs/DESIGN_TOKENS.md.
  it('never paints a marker face with brand-accent lime', () => {
    const lime = ['#BEFF00', '#beff00'];
    for (const [key, value] of Object.entries(MAP_MARKER_FILL)) {
      expect(lime, `MAP_MARKER_FILL.${key} is lime`).not.toContain(value);
    }
  });

  it('resolves brandPrimary to the near-black brand token, not lime', () => {
    expect(MAP_MARKER_FILL.brandPrimary).toBe('#171717');
  });

  // The retired `surfaceMuted80` (rgba(245,245,245,0.8)) was the default pin face: on the
  // pale positron basemap it read as nothing at all. De-emphasis belongs in `ghostFill()`
  // or `PinStyle.opacity`, never baked into a face.
  it('keeps every marker face opaque', () => {
    for (const [key, value] of Object.entries(MAP_MARKER_FILL)) {
      expect(value, `MAP_MARKER_FILL.${key} is translucent`).not.toMatch(/rgba|hsla|color-mix/);
    }
  });
});

describe('getGlobalTierRank', () => {
  it('maps the five percentile bands to ranks 5..1', () => {
    expect(getGlobalTierRank('Top 1%')).toBe(5);
    expect(getGlobalTierRank('Top 5%')).toBe(4);
    expect(getGlobalTierRank('Top 10%')).toBe(3);
    expect(getGlobalTierRank('Top 20%')).toBe(2);
    expect(getGlobalTierRank('Standard')).toBe(1);
    expect(getGlobalTierRank(null)).toBe(1);
    expect(getGlobalTierRank(undefined)).toBe(1);
  });

  it("tolerates the retired 'Top 25%' band as rank 2 (nearest band, not Rest)", () => {
    expect(getGlobalTierRank('Top 25%')).toBe(2);
  });
});

describe('getPersonalTierRank', () => {
  it('maps points and library status to ranks 5..1', () => {
    expect(getPersonalTierRank(3, 'visited')).toBe(5);
    expect(getPersonalTierRank(2, null)).toBe(4);
    expect(getPersonalTierRank(1, 'none')).toBe(3);
    expect(getPersonalTierRank(0, 'saved')).toBe(2);
    expect(getPersonalTierRank(null, 'visited')).toBe(2);
    // Prop-fed surfaces still pass the raw user_buildings 'pending' status
    expect(getPersonalTierRank(0, 'pending')).toBe(2);
    expect(getPersonalTierRank(0, 'none')).toBe(1);
    expect(getPersonalTierRank(null, null)).toBe(1);
  });
});

describe('getEffectivePinRank', () => {
  // Task 4.3: a cluster's max_tier is built by aggregating this function over its
  // points, so it must agree with the rank getPinStyle would give each point on
  // its own — otherwise a cluster full of black pins could render white.
  it('reports an itinerary stop as rank 5, regardless of its own rating', () => {
    expect(
      getEffectivePinRank({
        rating: null,
        status: null,
        tier_rank_label: null,
        color: null,
        itinerary_sequence: 2,
        itinerary_day_index: 0,
      }),
    ).toBe(5);
  });

  it('maps a colour-override face back onto the ladder', () => {
    const base = { rating: null, status: null, tier_rank_label: null, itinerary_sequence: undefined, itinerary_day_index: undefined };
    expect(getEffectivePinRank({ ...base, color: MAP_MARKER_FILL.brandPrimary })).toBe(5);
    expect(getEffectivePinRank({ ...base, color: MAP_MARKER_FILL.white })).toBe(3);
    expect(getEffectivePinRank({ ...base, color: MAP_MARKER_FILL.surfaceMuted })).toBe(2);
  });

  it('falls back to the mode-selected ladder code when there is no override', () => {
    const point = { rating: 3, status: 'visited', tier_rank_label: null, color: null, itinerary_sequence: undefined, itinerary_day_index: undefined };
    expect(getEffectivePinRank(point, { mode: 'library' })).toBe(5);
    expect(getEffectivePinRank({ ...point, tier_rank_label: 'Top 5%' })).toBe(4);
  });

  it('agrees with getPinStyle on every ladder rank (pin and cluster can never diverge)', () => {
    for (const label of ['Top 1%', 'Top 5%', 'Top 10%', 'Top 20%', 'Standard'] as const) {
      const item = createMockBuilding({ tier_rank_label: label });
      expect(getEffectivePinRank(item)).toBe(getPinStyle(item).rank);
    }
  });
});

describe('getPinStyle', () => {
  describe('Suite 1: Global code (discover / default mode)', () => {
    it("renders rank 5 (30px solid black face, white ring) for 'Top 1%'", () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 1%' }));
      expect(style.rank).toBe(5);
      expect(style.size).toBe(30);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      // The ring inverts with the fill — a black ring on a black face is invisible.
      expect(style.ringClasses).toContain('border-white');
      expect(style.classes).toContain('text-brand-primary-foreground');
      expect(style.zIndex).toBe(36);
    });

    it("renders rank 4 (26px white, black 2px ring) for 'Top 5%'", () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 5%' }));
      expect(style.rank).toBe(4);
      expect(style.size).toBe(26);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.ringClasses).toContain('border-text-primary');
      expect(style.ringClasses).toContain('border-2');
      expect(style.zIndex).toBe(32);
    });

    it("renders rank 3 (22px white, black hairline ring) for 'Top 10%'", () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 10%' }));
      expect(style.rank).toBe(3);
      expect(style.size).toBe(22);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.ringClasses).toContain('border-text-primary');
      expect(style.ringClasses).not.toContain('border-2');
      expect(style.zIndex).toBe(28);
    });

    it("renders rank 2 (19px white, secondary ring) for 'Top 20%' and legacy 'Top 25%'", () => {
      for (const label of ['Top 20%', 'Top 25%']) {
        const style = getPinStyle(createMockBuilding({ tier_rank_label: label }));
        expect(style.rank, label).toBe(2);
        expect(style.size, label).toBe(19);
        expect(style.backgroundColor, label).toBe(MAP_MARKER_FILL.white);
        expect(style.ringClasses, label).toContain('border-text-secondary');
      }
    });

    it("renders rank 1 (16px white, strong ring) for 'Standard' / unknown", () => {
      for (const label of ['Standard', null, undefined]) {
        const style = getPinStyle(createMockBuilding({ tier_rank_label: label }));
        expect(style.rank).toBe(1);
        expect(style.size).toBe(16);
        expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
        expect(style.ringClasses).toContain('border-border-strong');
        expect(style.zIndex).toBe(5);
      }
    });

    // The bug this whole ladder was rebuilt for: the DEFAULT pin (everything outside the
    // Top 20%) was a 14px translucent near-white disc with an #E5E5E5 hairline, invisible
    // on the positron basemap. Every rank must now be opaque and at least 16px.
    it('never renders a translucent or sub-16px face at any rank', () => {
      for (const label of ['Top 1%', 'Top 5%', 'Top 10%', 'Top 20%', null]) {
        const style = getPinStyle(createMockBuilding({ tier_rank_label: label }));
        expect(style.backgroundColor, `${label}`).not.toMatch(/rgba|color-mix/);
        expect(style.opacity, `${label}`).toBe(1);
        expect(style.size, `${label}`).toBeGreaterThanOrEqual(16);
        expect(style.ringClasses, `${label}`).not.toContain('border-border-default');
      }
    });

    it('never renders rating dots in the global code', () => {
      const style = getPinStyle(
        createMockBuilding({ tier_rank_label: 'Top 1%', rating: 3, status: 'visited' }),
      );
      expect(style.dots).toBe(0);
    });
  });

  describe('Suite 2: saved mark (global code)', () => {
    it('marks saved / visited / pending / rated buildings', () => {
      for (const overrides of [
        { status: 'saved' },
        { status: 'visited' },
        { status: 'pending' },
        { rating: 2, status: 'none' },
      ]) {
        const style = getPinStyle(createMockBuilding(overrides as Partial<ClusterResponse>));
        expect(style.savedMark, JSON.stringify(overrides)).toBe(true);
      }
    });

    it('does not mark unsaved buildings', () => {
      const style = getPinStyle(createMockBuilding({ status: 'none', rating: 0 }));
      expect(style.savedMark).toBe(false);
    });

    it('inverts the mark colour on the rank-5 black face', () => {
      const onBlack = getPinStyle(
        createMockBuilding({ tier_rank_label: 'Top 1%', status: 'saved' }),
      );
      expect(onBlack.savedMark).toBe(true);
      expect(onBlack.innerMarkColor).toBe(MAP_MARKER_FILL.white);

      const onLight = getPinStyle(
        createMockBuilding({ tier_rank_label: 'Top 5%', status: 'saved' }),
      );
      expect(onLight.innerMarkColor).toBe(MAP_MARKER_FILL.brandPrimary);
    });

    it('suppresses the mark for candidates and custom markers (no stacked dots)', () => {
      expect(
        getPinStyle(createMockBuilding({ status: 'saved', is_candidate: true })).savedMark,
      ).toBe(false);
      expect(
        getPinStyle(createMockBuilding({ status: 'saved', is_custom_marker: true })).savedMark,
      ).toBe(false);
    });

    it('does not let library state change the global rank (mode decides the code)', () => {
      // A building the user rated 1 pt that is globally Top 1% stays rank 5 in discover.
      const style = getPinStyle(
        createMockBuilding({ tier_rank_label: 'Top 1%', rating: 1, status: 'visited' }),
      );
      expect(style.rank).toBe(5);
      expect(style.savedMark).toBe(true);
    });
  });

  describe('Suite 3: Personal code (library mode)', () => {
    const library = { mode: 'library' as const };

    it('renders 3 pts as rank 5 with 3 white dots', () => {
      const style = getPinStyle(
        createMockBuilding({ rating: 3, status: 'visited' }),
        library,
      );
      expect(style.rank).toBe(5);
      expect(style.size).toBe(30);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(style.dots).toBe(3);
      expect(style.innerMarkColor).toBe(MAP_MARKER_FILL.white);
      expect(style.savedMark).toBe(false);
    });

    it('renders 2 pts as rank 4 with 2 black dots', () => {
      const style = getPinStyle(createMockBuilding({ rating: 2 }), library);
      expect(style.rank).toBe(4);
      expect(style.size).toBe(26);
      expect(style.dots).toBe(2);
      expect(style.innerMarkColor).toBe(MAP_MARKER_FILL.brandPrimary);
    });

    it('renders 1 pt as rank 3 with 1 dot', () => {
      const style = getPinStyle(createMockBuilding({ rating: 1 }), library);
      expect(style.rank).toBe(3);
      expect(style.size).toBe(22);
      expect(style.dots).toBe(1);
    });

    it('renders saved/visited unrated as rank 2 without dots', () => {
      for (const overrides of [
        { rating: 0, status: 'saved' },
        { rating: null, status: 'visited' },
      ]) {
        const style = getPinStyle(
          createMockBuilding(overrides as Partial<ClusterResponse>),
          library,
        );
        expect(style.rank).toBe(2);
        expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
        expect(style.ringClasses).toContain('border-text-secondary');
        expect(style.dots).toBe(0);
      }
    });

    it('renders unsaved as rank 1 (quietest), ignoring the global percentile', () => {
      // A globally Top 1% building the user never saved is Rest in library mode.
      const style = getPinStyle(
        createMockBuilding({ tier_rank_label: 'Top 1%', rating: 0, status: 'none' }),
        library,
      );
      expect(style.rank).toBe(1);
      expect(style.size).toBe(16);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.dots).toBe(0);
      expect(style.savedMark).toBe(false);
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

  describe('Suite 5: Cluster Logic (max_tier mirrors the pin ladder)', () => {
    const cluster = (max_tier: number | undefined) =>
      createMockBuilding({ is_cluster: true, max_tier, count: 10 });

    it('renders a rank-5 cluster solid black with inverted numeral', () => {
      const style = getPinStyle(cluster(5));
      expect(style.rank).toBe(5);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(style.classes).toContain('text-white');
      expect(style.ringClasses).toContain('border-white');
      expect(style.ringClasses).toContain('border-2');
      expect(style.zIndex).toBe(36);
    });

    it('renders a rank-4 cluster white with a black 2px ring', () => {
      const style = getPinStyle(cluster(4));
      expect(style.rank).toBe(4);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.ringClasses).toContain('border-text-primary');
      expect(style.ringClasses).toContain('border-2');
    });

    it('renders a rank-3 cluster white with a black hairline ring', () => {
      const style = getPinStyle(cluster(3));
      expect(style.rank).toBe(3);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.ringClasses).toContain('border-text-primary');
      expect(style.ringClasses).not.toContain('border-2');
    });

    it('renders ranks 2 and 1 white with a secondary ring — never translucent', () => {
      for (const rank of [2, 1]) {
        const style = getPinStyle(cluster(rank));
        expect(style.rank, `rank ${rank}`).toBe(rank);
        expect(style.backgroundColor, `rank ${rank}`).toBe(MAP_MARKER_FILL.white);
        expect(style.ringClasses, `rank ${rank}`).toContain('border-text-secondary');
      }
    });

    // The count used to inherit whatever font-size the ambient page happened to set.
    it('sizes the count label to the disc that holds it', () => {
      const label = (count: number) =>
        getPinStyle(createMockBuilding({ is_cluster: true, max_tier: 1, count })).classes;
      expect(label(10)).toContain('text-2xs');
      expect(label(500)).toContain('text-xs');
      expect(label(2000)).toContain('text-sm');
      expect(label(10)).toContain('tabular-nums');
    });

    it('defaults to rank 1 when max_tier is missing and clamps out-of-range values', () => {
      expect(getPinStyle(cluster(undefined)).rank).toBe(1);
      expect(getPinStyle(cluster(0)).rank).toBe(1);
      expect(getPinStyle(cluster(9)).rank).toBe(5);
    });

    it('sizes clusters by count, not rank', () => {
      expect(getPinStyle(createMockBuilding({ is_cluster: true, max_tier: 5, count: 10 })).size).toBe(32);
      expect(getPinStyle(createMockBuilding({ is_cluster: true, max_tier: 1, count: 500 })).size).toBe(48);
      expect(getPinStyle(createMockBuilding({ is_cluster: true, max_tier: 1, count: 2000 })).size).toBe(64);
    });
  });

  describe('Suite 6: Construction Status Treatment', () => {
    // A ghost fades the FACE only. The blanket `opacity-50` this replaced took the ring,
    // the dots and the icon with it, and a lost rank-1 pin simply left the map.
    it('ghosts the face of Lost pins (and legacy Demolished) without touching the ring', () => {
      for (const status of ['Lost', 'Demolished']) {
        const style = getPinStyle(createMockBuilding({ construction_status: status }));
        expect(style.backgroundColor, status).toBe(ghostFill(MAP_MARKER_FILL.white));
        expect(style.opacity, status).toBe(1);
        expect(style.ringClasses, status).toBe(
          getPinStyle(createMockBuilding({})).ringClasses,
        );
      }
    });

    it('gives Unbuilt and Under Construction a legible 2px dashed ring', () => {
      for (const status of ['Unbuilt', 'Under Construction']) {
        const style = getPinStyle(createMockBuilding({ construction_status: status }));
        // Replaced, not appended: Tailwind would otherwise arbitrate `border` vs
        // `border-2` by stylesheet order.
        expect(style.ringClasses, status).toBe('border-text-primary border-2 border-dashed');
        expect(style.backgroundColor, status).toBe(MAP_MARKER_FILL.white);
      }
    });

    it('keeps the dashed ring white on a dark face', () => {
      const style = getPinStyle(
        createMockBuilding({ tier_rank_label: 'Top 1%', construction_status: 'Unbuilt' }),
      );
      expect(style.ringClasses).toBe('border-white border-2 border-dashed');
    });

    it('leaves standing / Temporary / unknown pins unmodified', () => {
      const base = getPinStyle(createMockBuilding({}));
      for (const status of ['Built', 'Temporary', null]) {
        const style = getPinStyle(createMockBuilding({ construction_status: status }));
        expect(style.ringClasses, `${status}`).toBe(base.ringClasses);
        expect(style.backgroundColor, `${status}`).toBe(base.backgroundColor);
      }
    });

    it('preserves the underlying rank when ghosting (rated Lost building keeps rank 5)', () => {
      const style = getPinStyle(
        createMockBuilding({ rating: 3, status: 'visited', construction_status: 'Lost' }),
        { mode: 'library' },
      );
      expect(style.rank).toBe(5);
      expect(style.size).toBe(30);
      expect(style.dots).toBe(3);
      expect(style.backgroundColor).toBe(ghostFill(MAP_MARKER_FILL.brandPrimary));
    });

    it('never modifies clusters, even with a construction status present', () => {
      const style = getPinStyle(createMockBuilding({ is_cluster: true, max_tier: 5, count: 12, construction_status: 'Lost' }));
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(style.ringClasses).not.toContain('border-dashed');
    });

    it('does not apply the treatment in photography-gap mode', () => {
      const style = getPinStyle(createMockBuilding({ construction_status: 'Lost' }), { photographyGaps: true });
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.feedbackDestructive);
    });
  });

  describe('Suite 7: Custom-colour override (standalone markers + categorised buildings)', () => {
    // A light face (the quietest muted step every standalone marker gets, and the
    // "not visited"/"unrated" categorisation buckets) needs a DARK ring + dark
    // content, or it disappears on the light positron basemap. Regression guard for
    // the near-invisible "Other markers" pins.
    it('gives a light face a dark ring and dark inner content', () => {
      const style = getPinStyle(createMockBuilding({ color: MAP_MARKER_FILL.surfaceMuted }));
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted);
      expect(style.ringClasses).toContain('border-text-primary');
      expect(style.classes).toContain('text-brand-primary');
      expect(style.ringClasses).not.toContain('border-white');
      expect(style.innerMarkColor).toBe(MAP_MARKER_FILL.brandPrimary);
    });

    it('keeps the white ring and white content on the solid dark face', () => {
      const style = getPinStyle(createMockBuilding({ color: MAP_MARKER_FILL.brandPrimary }));
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(style.ringClasses).toContain('border-white');
      expect(style.classes).toContain('text-white');
      expect(style.innerMarkColor).toBe(MAP_MARKER_FILL.white);
    });

    // Member-chosen collection colours go through the same ghost, so the expression has
    // to hold for an arbitrary CSS colour, not just our ladder hexes.
    it('ghosts an arbitrary member colour when the building is lost', () => {
      const style = getPinStyle(
        createMockBuilding({ color: MAP_MARKER_FILL.surfaceMuted, construction_status: 'Lost' }),
      );
      expect(style.backgroundColor).toBe(ghostFill(MAP_MARKER_FILL.surfaceMuted));
      expect(style.backgroundColor).toBe('rgba(245, 245, 245, 0.55)');
    });
  });

  describe('Suite 8: Discovery layer (collection map)', () => {
    // Discovery pins are buildings the collection does NOT contain. They must
    // read as background: faded, no library marks, and always under a collection
    // pin — the lowest collection rank sits at z=5.
    it('fades a discovery pin and drops it below the whole pin ladder', () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 1%', is_discovery: true }));
      expect(style.rank).toBe(5);
      expect(style.opacity).toBe(0.6);
      expect(style.zIndex).toBeLessThan(5);
    });

    // Lost + discovery used to emit `opacity-50 opacity-60` in one class string, with the
    // winner decided by Tailwind's stylesheet order rather than by us. The two axes are
    // now independent: the ghost is in the fill, the dim is a number.
    it('composes with the ghost treatment deterministically', () => {
      const style = getPinStyle(
        createMockBuilding({ is_discovery: true, construction_status: 'Lost' }),
      );
      expect(style.opacity).toBe(0.6);
      expect(style.backgroundColor).toContain('rgba');
    });

    it('keeps discovery pins ordered among themselves', () => {
      const top = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 1%', is_discovery: true }));
      const rest = getPinStyle(createMockBuilding({ tier_rank_label: null, is_discovery: true }));
      expect(top.zIndex).toBeGreaterThan(rest.zIndex);
      expect(rest.zIndex).toBeGreaterThanOrEqual(1);
    });

    it('never shows the saved mark on a discovery pin', () => {
      const style = getPinStyle(createMockBuilding({ status: 'saved', rating: 3, is_discovery: true }));
      expect(style.savedMark).toBe(false);
      expect(style.dots).toBe(0);
    });

    it('leaves ordinary pins untouched', () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 1%' }));
      expect(style.opacity).toBe(1);
      expect(style.zIndex).toBe(36);
    });
  });
});
