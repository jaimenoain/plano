import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.test.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// There's a problem with my multiline string, let's use a normal string and avoid template literal shenanigans that might be breaking it.

content = `import * as AccordionPrimitive from "@radix-ui/react-accordion";

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
import * as BuildingSearch from '@/features/search/hooks/useBuildingSearch';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

vi.mock('@/features/search/hooks/useBuildingSearch', () => ({
  useBuildingSearch: vi.fn(),
}));

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
      setMode: vi.fn(),
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

    (BuildingSearch.useBuildingSearch as Mock).mockReturnValue({
      statusFilters: [],
      setStatusFilters: vi.fn(),
      hideVisited: false,
      setHideVisited: vi.fn(),
      hideSaved: false,
      setHideSaved: vi.fn(),
      filterContacts: false,
      setFilterContacts: vi.fn(),
      personalMinRating: 0,
      setPersonalMinRating: vi.fn(),
      contactMinRating: 0,
      setContactMinRating: vi.fn(),
      selectedArchitects: [],
      setSelectedArchitects: vi.fn(),
      selectedCollections: [],
      setSelectedCollections: vi.fn(),
      selectedFolders: [],
      setSelectedFolders: vi.fn(),
      selectedCategory: null,
      setSelectedCategory: vi.fn(),
      selectedTypologies: [],
      setSelectedTypologies: vi.fn(),
      selectedAttributes: [],
      setSelectedAttributes: vi.fn(),
      selectedContacts: [],
      setSelectedContacts: vi.fn(),
    });
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
`;

fs.writeFileSync(FILE_PATH, content);
