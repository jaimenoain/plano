// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lazyWithRetry } from './lazyWithRetry';
import { render, screen, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock component
const MockComponent = () => <div>Loaded!</div>;

describe('lazyWithRetry', () => {
  const originalLocation = window.location;
  const mockReload = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();

    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: mockReload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('should load component normally if import succeeds', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: MockComponent });
    const LazyComponent = lazyWithRetry(importFn);

    render(
      <Suspense fallback="Loading...">
        <LazyComponent />
      </Suspense>
    );

    await waitFor(() => expect(screen.getByText('Loaded!')).toBeInTheDocument());
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('should reload page if chunk load error occurs and not refreshed recently', async () => {
    const error = new Error('Failed to fetch dynamically imported module');
    error.name = 'ChunkLoadError';
    const importFn = vi.fn().mockRejectedValue(error);
    const LazyComponent = lazyWithRetry(importFn);

    class ErrorBoundary extends React.Component<any, any> {
      state = { hasError: false };
      static getDerivedStateFromError() { return { hasError: true }; }
      render() { return this.state.hasError ? <div>Error!</div> : this.props.children; }
    }

    render(
      <ErrorBoundary>
        <Suspense fallback="Loading...">
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>
    );

    await waitFor(() => expect(mockReload).toHaveBeenCalled());
    expect(sessionStorage.getItem('last-force-refresh-timestamp')).toBeTruthy();
  });

  it('should NOT reload page if chunk load error occurs but ALREADY refreshed recently', async () => {
    // Set timestamp to now
    sessionStorage.setItem('last-force-refresh-timestamp', Date.now().toString());

    const error = new Error('Failed to fetch dynamically imported module');
    error.name = 'ChunkLoadError';
    const importFn = vi.fn().mockRejectedValue(error);
    const LazyComponent = lazyWithRetry(importFn);

    class ErrorBoundary extends React.Component<any, any> {
      state = { hasError: false };
      static getDerivedStateFromError() { return { hasError: true }; }
      render() { return this.state.hasError ? <div>Error!</div> : this.props.children; }
    }

    render(
      <ErrorBoundary>
        <Suspense fallback="Loading...">
          <LazyComponent />
        </Suspense>
      </ErrorBoundary>
    );

    await waitFor(() => expect(screen.getByText('Error!')).toBeInTheDocument());
    expect(mockReload).not.toHaveBeenCalled();
  });
});
