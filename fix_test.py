with open("src/features/maps/components/FilterDrawer.test.tsx", "r") as f:
    content = f.read()

import_router = "import { MemoryRouter } from 'react-router-dom';\n"
if import_router not in content:
    content = content.replace("import { AuthProvider } from '@/hooks/useAuth';", "import { AuthProvider } from '@/hooks/useAuth';\n" + import_router)

# We need a QueryClientProvider
import_query = "import { QueryClient, QueryClientProvider } from '@tanstack/react-query';\n"
if import_query not in content:
    content = content.replace("import { AuthProvider }", import_query + "import { AuthProvider }")

content = content.replace("render(<AuthProvider><FilterDrawer /></AuthProvider>);", """
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <FilterDrawer />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
""")

with open("src/features/maps/components/FilterDrawer.test.tsx", "w") as f:
    f.write(content)
