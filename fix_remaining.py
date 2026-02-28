import re

with open("src/features/maps/components/FilterDrawer.tsx", "r") as f:
    content = f.read()

# Replace currentCollectionIds with currentCollections.map(c => c.id) since useBuildingSearch exports the objects.
# Actually, wait, useBuildingSearch exports selectedCollections as an array of objects.

content = content.replace("currentCollectionIds.length", "currentCollections.length")
content = content.replace("currentFolderIds.length", "currentFolders.length")
content = content.replace("currentCollectionIds,", "currentCollections,\n      currentFolders,")
content = content.replace("currentFolderIds,", "")

content = content.replace("selectedCollectionIds={currentCollectionIds}", "selectedCollectionIds={currentCollections.map(c => c.id)}")
content = content.replace("selectedFolderIds={currentFolderIds}", "selectedFolderIds={currentFolders.map(c => c.id)}")

with open("src/features/maps/components/FilterDrawer.tsx", "w") as f:
    f.write(content)
