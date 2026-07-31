/** Public surface of the mymap feature (the /map route + its shared hooks). */
// The stats masthead belongs to library mode, not to /map — the search page's
// My map tab renders it too (ADR 0025). Deliberately not re-exporting MyMapPage:
// it imports the search shell, and this barrel is imported from inside it.
export { MyMapChrome } from "./components/MyMapChrome";
export { useLibraryEntries } from "./hooks/useLibraryEntries";
export { computeLibraryStats, type LibraryStats } from "./utils/libraryStats";
