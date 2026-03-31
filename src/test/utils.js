import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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
function createWrapper(options = {}) {
    const { initialRoute = "/", queryClient = createTestQueryClient(), } = options;
    return function Wrapper({ children }) {
        return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(MemoryRouter, { initialEntries: [initialRoute], children: children }) }));
    };
}
function renderWithProviders(ui, options = {}) {
    const { initialRoute, queryClient: explicitClient, ...renderOptions } = options;
    const queryClient = explicitClient ?? createTestQueryClient();
    const wrapper = createWrapper({ initialRoute, queryClient });
    return {
        ...render(ui, { wrapper, ...renderOptions }),
        queryClient,
    };
}
export { renderWithProviders, createTestQueryClient, createWrapper };
