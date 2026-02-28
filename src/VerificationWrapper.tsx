import React, { useState } from 'react';
import { BuildingPopupContent } from './features/maps/components/BuildingPopupContent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from './hooks/useAuth';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

// A simple mock wrapper that intercepts supabase calls and provides fake context if needed
export default function VerificationWrapper() {
  const mockCluster = {
    id: 123,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { cluster: false },
    name: 'Barbican Centre',
    image_url: null,
    slug: 'barbican',
    lat: 0,
    lng: 0,
    tier: 1
  };

  return (
    <BrowserRouter>
      {/* We inject the user directly via AuthContext Provider instead of AuthProvider since that wraps useSession */}
      <AuthContext.Provider value={{
          session: { user: { id: 'mock' } } as any,
          user: { id: 'mock' } as any,
          loading: false,
          signUp: async () => ({ error: null }),
          signIn: async () => ({ error: null }),
          signOut: async () => {},
          resetPassword: async () => ({ error: null }),
          updatePassword: async () => ({ error: null }),
      }}>
        <QueryClientProvider client={queryClient}>
          <div className="p-10 bg-gray-100 min-h-screen flex items-center justify-center relative w-[375px] max-w-full overflow-hidden" id="test-wrapper">
              <BuildingPopupContent
                  cluster={mockCluster as any}
                  onRemoveFromCollection={() => {}}
              />
          </div>
        </QueryClientProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
}
