// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CollectionMembershipAction } from './CollectionMembershipAction';
import type { ClusterResponse } from '../hooks/useMapData';

const cluster = {
  id: 'building-1',
  lat: 40.4,
  lng: -3.7,
  is_cluster: false,
  count: 1,
  rating: null,
  status: null,
  construction_status: null,
  name: 'Casa Mila',
} as ClusterResponse;

afterEach(() => cleanup());

describe('CollectionMembershipAction', () => {
  it('offers Remove — and only Remove — for a building already in the collection', () => {
    const onRemove = vi.fn();
    const onAdd = vi.fn();
    render(
      <CollectionMembershipAction
        cluster={cluster}
        inCollection
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );

    expect(screen.queryByText('Add to this collection')).toBeNull();
    fireEvent.click(screen.getByText('Remove from collection'));
    expect(onRemove).toHaveBeenCalledWith('building-1');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('offers Add — and only Add — for a building that is not in the collection', () => {
    const onRemove = vi.fn();
    const onAdd = vi.fn();
    render(
      <CollectionMembershipAction
        cluster={cluster}
        inCollection={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );

    expect(screen.queryByText('Remove from collection')).toBeNull();
    fireEvent.click(screen.getByText('Add to this collection'));
    expect(onAdd).toHaveBeenCalledWith(cluster);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('renders nothing for a viewer who cannot edit the collection', () => {
    const { container, rerender } = render(
      <CollectionMembershipAction cluster={cluster} inCollection />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<CollectionMembershipAction cluster={cluster} inCollection={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the drawer is closed', () => {
    const { container } = render(
      <CollectionMembershipAction
        cluster={null}
        inCollection={false}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
