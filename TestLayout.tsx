import { BuildingPopupContent } from './src/features/maps/components/BuildingPopupContent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function TestLayout() {
  const cluster = {
    id: 123,
    slug: 'test-building',
    name: 'Test Building',
    lat: 0,
    lng: 0,
    count: 1,
    is_cluster: false,
    image_url: 'test.jpg',
    rating: 0,
  };

  return (
    <QueryClientProvider client={queryClient}>
          <div className="p-20 bg-gray-100 min-h-screen flex items-center justify-center">
            {/* We mock a relative container to simulate map overlay */}
            <div className="relative w-full max-w-sm h-[400px]">
               <BuildingPopupContent cluster={cluster as any} />
            </div>
          </div>
    </QueryClientProvider>
  );
}
