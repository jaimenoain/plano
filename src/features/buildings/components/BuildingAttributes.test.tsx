import { render, screen, cleanup } from '@testing-library/react';
import { BuildingAttributes, BuildingAttributesData } from './BuildingAttributes';
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest'; // Import matchers

describe('BuildingAttributes Component', () => {
  afterEach(() => {
    cleanup();
  });

  const emptyBuilding: BuildingAttributesData = {
    typology: null,
    materials: null,
    styles: null,
    context: null,
    intervention: null,
    category: null,
    year_completed: null,
    status: null,
  };

  const fullBuilding: BuildingAttributesData = {
    typology: ['Residential', 'Commercial'],
    materials: ['Concrete', 'Glass'],
    styles: [{ name: 'Modern' }],
    context: 'Urban',
    intervention: 'New Build',
    category: 'Mixed Use',
    year_completed: 2023,
    status: 'Built',
  };

  const minimalBuilding: BuildingAttributesData = {
    typology: ['Private'],
    materials: null,
    styles: null,
    context: null,
    intervention: null,
    category: null,
    year_completed: null,
    status: null,
  };

  it('does not render when all fields are empty', () => {
    const { container } = render(<BuildingAttributes building={emptyBuilding} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly with minimal data', () => {
    render(<BuildingAttributes building={minimalBuilding} />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('renders correctly with full data', () => {
    render(<BuildingAttributes building={fullBuilding} />);

    expect(screen.getByText('Residential, Commercial')).toBeInTheDocument();
    expect(screen.getByText('Concrete, Glass')).toBeInTheDocument();
    expect(screen.getByText('Modern')).toBeInTheDocument();
    expect(screen.getByText('Urban')).toBeInTheDocument();
    expect(screen.getByText('New Build')).toBeInTheDocument();
    expect(screen.getByText('Mixed Use')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Built')).toBeInTheDocument();
  });

  it('handles array of strings and objects correctly', () => {
    render(<BuildingAttributes building={fullBuilding} />);

    // Typology (string array)
    expect(screen.getByText('Residential, Commercial')).toBeInTheDocument();

    // Styles (object array)
    expect(screen.getByText('Modern')).toBeInTheDocument();
  });
});
