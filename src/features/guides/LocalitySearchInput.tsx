import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Globe } from 'lucide-react';
import { getCountryUrl, getLocalityUrl } from '@/utils/url';
import type { GuidesLocalityRow } from './guidesApi';

interface CitySuggestion {
  type: 'city';
  label: string;
  sublabel: string;
  url: string;
}

interface CountrySuggestion {
  type: 'country';
  label: string;
  sublabel: string;
  url: string;
}

type Suggestion = CitySuggestion | CountrySuggestion;

function buildSuggestions(query: string, localities: GuidesLocalityRow[]): Suggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const citySuggestions: CitySuggestion[] = [];
  const countrySeen = new Set<string>();
  const countrySuggestions: CountrySuggestion[] = [];

  for (const loc of localities) {
    if (loc.city.toLowerCase().includes(q)) {
      citySuggestions.push({
        type: 'city',
        label: loc.city,
        sublabel: loc.country,
        url: getLocalityUrl(loc.countryCode, loc.citySlug),
      });
    }
  }

  for (const loc of localities) {
    if (!countrySeen.has(loc.countryCode) && loc.country.toLowerCase().includes(q)) {
      countrySeen.add(loc.countryCode);
      countrySuggestions.push({
        type: 'country',
        label: loc.country,
        sublabel: 'Country',
        url: getCountryUrl(loc.countryCode),
      });
    }
  }

  return [...citySuggestions.slice(0, 5), ...countrySuggestions.slice(0, 3)];
}

interface LocalitySearchInputProps {
  localities: GuidesLocalityRow[];
  placeholder?: string;
}

export function LocalitySearchInput({
  localities,
  placeholder = 'Search a city or country…',
}: LocalitySearchInputProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => buildSuggestions(query, localities),
    [query, localities],
  );

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleSelect(suggestion: Suggestion) {
    setQuery('');
    setOpen(false);
    navigate(suggestion.url);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex]);
      } else if (suggestions[0]) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          size={15}
          strokeWidth={1.5}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-surface-overlay border border-border-default rounded-sm text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-border-strong transition-colors"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 w-full bg-surface-overlay border border-border-default rounded-sm overflow-hidden"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.type}-${s.url}`}
              role="option"
              aria-selected={i === activeIndex}
              onPointerDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                i === activeIndex
                  ? 'bg-surface-muted'
                  : 'hover:bg-surface-muted'
              }`}
            >
              <span className="shrink-0 text-text-tertiary">
                {s.type === 'city' ? (
                  <MapPin size={13} strokeWidth={1.5} />
                ) : (
                  <Globe size={13} strokeWidth={1.5} />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-sm text-text-primary">{s.label}</span>
                <span className="text-xs text-text-tertiary ml-2">{s.sublabel}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
