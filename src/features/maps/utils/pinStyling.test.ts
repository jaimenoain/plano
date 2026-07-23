import { describe, it, expect } from 'vitest';
import { getPinStyle, getGlobalTierRank, getPersonalTierRank } from './pinStyling';
import { ClusterResponse } from '../hooks/useMapData';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';

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

describe('getPinStyle', () => {
  describe('Suite 1: Global code (discover / default mode)', () => {
    it("renders rank 5 (30px solid black face, white ring) for 'Top 1%'", () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 1%' }));
      expect(style.rank).toBe(5);
      expect(style.size).toBe(30);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      // The ring inverts with the fill — a black ring on a black face is invisible.
      expect(style.classes).toContain('border-white');
      expect(style.classes).toContain('text-brand-primary-foreground');
      expect(style.zIndex).toBe(36);
    });

    it("renders rank 4 (26px white, black ring) for 'Top 5%'", () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 5%' }));
      expect(style.rank).toBe(4);
      expect(style.size).toBe(26);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.classes).toContain('border-text-primary');
      expect(style.classes).toContain('border-2');
      expect(style.zIndex).toBe(32);
    });

    it("renders rank 3 (22px white, strong border) for 'Top 10%'", () => {
      const style = getPinStyle(createMockBuilding({ tier_rank_label: 'Top 10%' }));
      expect(style.rank).toBe(3);
      expect(style.size).toBe(22);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.classes).toContain('border-border-strong');
      expect(style.zIndex).toBe(28);
    });

    it("renders rank 2 (18px muted) for 'Top 20%' and legacy 'Top 25%'", () => {
      for (const label of ['Top 20%', 'Top 25%']) {
        const style = getPinStyle(createMockBuilding({ tier_rank_label: label }));
        expect(style.rank, label).toBe(2);
        expect(style.size, label).toBe(18);
        expect(style.backgroundColor, label).toBe(MAP_MARKER_FILL.surfaceMuted);
        expect(style.classes, label).toContain('border-border-strong');
      }
    });

    it("renders rank 1 (14px quietest) for 'Standard' / unknown", () => {
      for (const label of ['Standard', null, undefined]) {
        const style = getPinStyle(createMockBuilding({ tier_rank_label: label }));
        expect(style.rank).toBe(1);
        expect(style.size).toBe(14);
        expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
        expect(style.classes).toContain('border-border-default');
        expect(style.zIndex).toBe(5);
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
        expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted);
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
      expect(style.size).toBe(14);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
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
      expect(style.classes).toContain('border-white');
      expect(style.classes).toContain('border-2');
      expect(style.zIndex).toBe(36);
    });

    it('renders a rank-4 cluster white with a black ring', () => {
      const style = getPinStyle(cluster(4));
      expect(style.rank).toBe(4);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.classes).toContain('border-text-primary');
      expect(style.classes).toContain('border-2');
    });

    it('renders a rank-3 cluster white with a strong border', () => {
      const style = getPinStyle(cluster(3));
      expect(style.rank).toBe(3);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.white);
      expect(style.classes).toContain('border-border-strong');
      expect(style.classes).not.toContain('border-2');
    });

    it('renders a rank-2 cluster muted', () => {
      const style = getPinStyle(cluster(2));
      expect(style.rank).toBe(2);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted);
      expect(style.classes).toContain('border-border-strong');
    });

    it('renders a rank-1 cluster quietest', () => {
      const style = getPinStyle(cluster(1));
      expect(style.rank).toBe(1);
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
      expect(style.classes).toContain('border-border-default');
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
    it('fades Lost pins (and legacy Demolished)', () => {
      expect(getPinStyle(createMockBuilding({ construction_status: 'Lost' })).classes).toContain('opacity-50');
      expect(getPinStyle(createMockBuilding({ construction_status: 'Demolished' })).classes).toContain('opacity-50');
    });

    it('dashes Unbuilt and Under Construction pins', () => {
      expect(getPinStyle(createMockBuilding({ construction_status: 'Unbuilt' })).classes).toContain('border-dashed');
      expect(getPinStyle(createMockBuilding({ construction_status: 'Under Construction' })).classes).toContain('border-dashed');
    });

    it('leaves standing / Temporary / unknown pins unmodified', () => {
      const base = getPinStyle(createMockBuilding({})).classes;
      expect(getPinStyle(createMockBuilding({ construction_status: 'Built' })).classes).toBe(base);
      expect(getPinStyle(createMockBuilding({ construction_status: 'Temporary' })).classes).toBe(base);
      expect(getPinStyle(createMockBuilding({ construction_status: null })).classes).toBe(base);
    });

    it('preserves the underlying rank when fading (rated Lost building keeps rank 5)', () => {
      const style = getPinStyle(
        createMockBuilding({ rating: 3, status: 'visited', construction_status: 'Lost' }),
        { mode: 'library' },
      );
      expect(style.rank).toBe(5);
      expect(style.classes).toContain('opacity-50');
    });

    it('never modifies clusters, even with a construction status present', () => {
      const style = getPinStyle(createMockBuilding({ is_cluster: true, max_tier: 5, count: 12, construction_status: 'Lost' }));
      expect(style.classes).not.toContain('opacity-50');
      expect(style.classes).not.toContain('border-dashed');
    });

    it('does not apply the treatment in photography-gap mode', () => {
      const style = getPinStyle(createMockBuilding({ construction_status: 'Lost' }), { photographyGaps: true });
      expect(style.classes).not.toContain('opacity-50');
    });
  });

  describe('Suite 7: Custom-colour override (standalone markers + categorised buildings)', () => {
    // A light face (the quietest muted step every standalone marker gets, and the
    // "not visited"/"unrated" categorisation buckets) needs a DARK ring + dark
    // content, or it disappears on the light positron basemap. Regression guard for
    // the near-invisible "Other markers" pins.
    it('gives a light face a dark ring and dark inner content', () => {
      const style = getPinStyle(createMockBuilding({ color: MAP_MARKER_FILL.surfaceMuted80 }));
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.surfaceMuted80);
      expect(style.classes).toContain('border-text-primary');
      expect(style.classes).toContain('text-brand-primary');
      expect(style.classes).not.toContain('border-white');
      expect(style.innerMarkColor).toBe(MAP_MARKER_FILL.brandPrimary);
    });

    it('keeps the white ring and white content on the solid dark face', () => {
      const style = getPinStyle(createMockBuilding({ color: MAP_MARKER_FILL.brandPrimary }));
      expect(style.backgroundColor).toBe(MAP_MARKER_FILL.brandPrimary);
      expect(style.classes).toContain('border-white');
      expect(style.classes).toContain('text-white');
      expect(style.innerMarkColor).toBe(MAP_MARKER_FILL.white);
    });
  });
});
