import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BuildingAttributes, BuildingAttributesData } from './BuildingAttributes';
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest'; // Import matchers

describe('BuildingAttributes Component', () => {
  afterEach(() => {
    cleanup();
  });

  const emptyBuilding: BuildingAttributesData = {
    access_type: null,
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
    access_type: 'Public',
    typology: ['Residential'],
    materials: ['Concrete', 'Glass'],
    styles: [{ name: 'Modern' }],
    context: 'Urban',
    intervention: 'New Build',
    category: 'Apartment',
    year_completed: 2023,
    status: 'Built',
  };

  const minimalBuilding: BuildingAttributesData = {
    access_type: 'Private',
    typology: null,
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

  it('renders correctly with minimal data (under threshold)', () => {
    render(<BuildingAttributes building={minimalBuilding} />);

    expect(screen.getByText('Access')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();

    // Should not show "Show all details" button
    expect(screen.queryByText('Show all details')).not.toBeInTheDocument();
  });

  it('renders correctly with full data (over threshold)', () => {
    render(<BuildingAttributes building={fullBuilding} />);

    // Check initial visible fields (threshold is 4)
    // The order in component is: access_type, typology, materials, styles, context, intervention, category, year_completed, status
    // So visible: Access, Typology, Materials, Style

    expect(screen.getByText('Access')).toBeInTheDocument();
    expect(screen.getByText('Typology')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();

    // Hidden fields initially
    expect(screen.queryByText('Context')).not.toBeInTheDocument();

    // Button should be present
    expect(screen.getByText('Show all details')).toBeInTheDocument();
  });

  it('toggles "Show all details" button', () => {
    render(<BuildingAttributes building={fullBuilding} />);

    const toggleButton = screen.getByText('Show all details');
    fireEvent.click(toggleButton);

    // Now all fields should be visible
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('Intervention')).toBeInTheDocument();

    // Button text changes
    expect(screen.getByText('Show less')).toBeInTheDocument();

    // Toggle back
    fireEvent.click(screen.getByText('Show less'));

    expect(screen.queryByText('Context')).not.toBeInTheDocument();
    expect(screen.getByText('Show all details')).toBeInTheDocument();
  });

  it('handles array of strings and objects correctly', () => {
    render(<BuildingAttributes building={fullBuilding} />);

    // Typology (string array)
    expect(screen.getByText('Residential')).toBeInTheDocument();

    // Styles (object array)
    expect(screen.getByText('Modern')).toBeInTheDocument();
  });
});
