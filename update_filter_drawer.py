import re

with open("src/features/maps/components/FilterDrawer.tsx", "r") as f:
    content = f.read()

# Add import
import_stmt = "import { useBuildingSearch } from '@/features/search/hooks/useBuildingSearch';\n"
if "import { useBuildingSearch }" not in content:
    content = content.replace("import { useMapContext } from '../providers/MapContext';", "import { useMapContext } from '../providers/MapContext';\n" + import_stmt)

# Replace useMapContext destructuring
old_context_destructure = """  const {
    state: { mode, filters },
    methods: { setFilter, setMapState },
  } = useMapContext();"""

new_context_destructure = """  const {
    state: { mode },
    methods: { setMapState },
  } = useMapContext();

  const {
    statusFilters: currentStatus,
    setStatusFilters: setStatus,
    hideSaved,
    setHideSaved,
    hideVisited,
    setHideVisited,
    hideHidden,
    setHideHidden,
    hideWithoutImages,
    setHideWithoutImages,
    filterContacts,
    setFilterContacts,
    personalMinRating: currentPersonalMinRating,
    setPersonalMinRating: setPersonalRating,
    contactMinRating: currentMinRating,
    setContactMinRating: setMinRating,
    selectedCategory: currentCategory,
    setSelectedCategory: setCategory,
    selectedTypologies: currentTypologies,
    setSelectedTypologies: setTypologies,
    selectedAttributes: currentAttributes,
    setSelectedAttributes: setAttributes,
    selectedArchitects: currentArchitects,
    setSelectedArchitects: setArchitects,
    selectedCollections: currentCollections,
    setSelectedCollections: setCollections,
    selectedFolders: currentFolders,
    setSelectedFolders: setFolders,
    selectedContacts: currentContacts,
    setSelectedContacts: setContacts,
  } = useBuildingSearch();"""

content = content.replace(old_context_destructure, new_context_destructure)

with open("src/features/maps/components/FilterDrawer.tsx", "w") as f:
    f.write(content)
