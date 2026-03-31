import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import type { ReactElement, ReactNode } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface TestWrapperOptions {
  initialRoute?: string;
  queryClient?: QueryClient;
}

function createWrapper(options: TestWrapperOptions = {}) {
  const {
    initialRoute = "/",
    queryClient = createTestQueryClient(),
  } = options;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function renderWithProviders(
  ui: ReactElement,
  options: TestWrapperOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  const { initialRoute, queryClient: explicitClient, ...renderOptions } =
    options;
  const queryClient = explicitClient ?? createTestQueryClient();
  const wrapper = createWrapper({ initialRoute, queryClient });
  return {
    ...render(ui, { wrapper, ...renderOptions }),
    queryClient,
  };
}

export { renderWithProviders, createTestQueryClient, createWrapper };
