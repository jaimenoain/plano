import fs from 'fs';

const FILE_PATH = 'src/features/maps/components/FilterDrawer.test.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// Ensure useBuildingSearch is mocked correctly
const updatedBeforeEach = `  beforeEach(() => {
    vi.clearAllMocks();
    (Taxonomy.useTaxonomy as Mock).mockReturnValue(defaultTaxonomy);
    (useUserSearch as Mock).mockReturnValue({ users: [], isLoading: false });

    // We mocked the module using vi.mock, but need to mock the implementation
    const useBuildingSearchMock = await import('@/features/search/hooks/useBuildingSearch');
    (useBuildingSearchMock.useBuildingSearch as Mock).mockReturnValue({
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
  });`;

content = content.replace(/  beforeEach\(\) \{[\s\S]*?\}\);/, updatedBeforeEach);

// Because of async await in beforeEach we make it async
content = content.replace('beforeEach(() => {', 'beforeEach(async () => {');

fs.writeFileSync(FILE_PATH, content);
