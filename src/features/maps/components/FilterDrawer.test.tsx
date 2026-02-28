import * as AccordionPrimitive from "@radix-ui/react-accordion";

vi.mock("@radix-ui/react-accordion", () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FilterDrawer } from './FilterDrawer';
import * as MapContext from '../providers/MapContext';
import * as Taxonomy from '@/hooks/useTaxonomy';
import { useUserSearch } from '@/features/search/hooks/useUserSearch';

// Mock dependencies
vi.mock('../providers/MapContext', async () => ({
  useMapContext: vi.fn(),
}));

vi.mock('@/hooks/useTaxonomy', async () => ({
  useTaxonomy: vi.fn(),
}));

vi.mock('@/features/search/hooks/useUserSearch', async () => ({
    useUserSearch: vi.fn(),
    UserSearchResult: {},
}));


// Mock UI components that might cause issues in shallow render or aren't focus of test
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-trigger">{children}</div>,
}));

vi.mock('./filters/QualityRatingFilter', () => ({
    QualityRatingFilter: () => <div data-testid="quality-rating-filter"></div>
}));

vi.mock('./filters/CollectionMultiSelect', () => ({
    CollectionMultiSelect: () => <div data-testid="collection-multi-select"></div>
}));

vi.mock('./filters/FolderAndCollectionMultiSelect', () => ({
    FolderAndCollectionMultiSelect: () => <div data-testid="folder-collection-multi-select"></div>
}));

vi.mock('@/features/search/components/ArchitectSelect', () => ({
    ArchitectSelect: () => <div data-testid="architect-select"></div>
}));

vi.mock('@/features/search/components/ContactPicker', () => ({
    ContactPicker: () => <div data-testid="contact-picker">ContactPicker Mock</div>
}));


describe('FilterDrawer', () => {
  const defaultMapContext = {
    state: {
      mode: 'discover',
      filters: {},
    },
    methods: {
      setFilter: vi.fn(),
      setMapState: vi.fn(),
    },
  };

  const defaultTaxonomy = {
    functionalCategories: [],
    functionalTypologies: [],
    materialityAttributes: [],
    contextAttributes: [],
    styleAttributes: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (Taxonomy.useTaxonomy as Mock).mockReturnValue(defaultTaxonomy);
    (useUserSearch as Mock).mockReturnValue({ users: [], isLoading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders "Curators & Friends" section in Discover mode', () => {
    (MapContext.useMapContext as Mock).mockReturnValue(defaultMapContext);

    render(<FilterDrawer />);

    expect(screen.getByText('Curators & Friends')).toBeDefined();
    expect(screen.getByTestId('contact-picker')).toBeDefined();
  });

  it('hides "Curators & Friends" section in Library mode', () => {
    (MapContext.useMapContext as Mock).mockReturnValue({
      ...defaultMapContext,
      state: {
        ...defaultMapContext.state,
        mode: 'library',
      },
    });

    render(<FilterDrawer />);

    expect(screen.queryByText('Curators & Friends')).toBeNull();
    expect(screen.queryByTestId('contact-picker')).toBeNull();
  });
});
