/// <reference types="vite/client" />

// Access environment variables safely across different environments (Vite, Vitest, Node)

// Helper to retrieve environment variables.
// In Vite/Browser environment, we must use import.meta.env.VITE_... explicitly for replacement to work.
// We pass the explicit value as the second argument.
const getEnv = (key: string, value: string | undefined): string | undefined => {
  if (value !== undefined) {
    return value;
  }

  // Fallback for Node/Testing environments where import.meta.env might not be populated by Vite
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  return undefined;
};

const getRequiredEnv = (key: string, value: string | undefined): string => {
  const envValue = getEnv(key, value);
  if (!envValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return envValue;
};

// We pass the explicit import.meta.env.KEY to ensure Vite's static replacement works in production.
// We use (import.meta.env && import.meta.env.KEY) to prevent crashes in environments where import.meta.env is undefined (e.g. pure Node.js).
export const config = {
  supabase: {
    url: getRequiredEnv('VITE_SUPABASE_URL', import.meta.env && import.meta.env.VITE_SUPABASE_URL),
    publishableKey: getRequiredEnv('VITE_SUPABASE_PUBLISHABLE_KEY', import.meta.env && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  },
  googleMaps: {
    apiKey: getEnv('VITE_GOOGLE_MAPS_API_KEY', import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) || '',
  },
  storage: {
    publicUrl: getEnv('VITE_PUBLIC_STORAGE_URL', import.meta.env && import.meta.env.VITE_PUBLIC_STORAGE_URL) || "https://s3.eu-west-2.amazonaws.com/plano.app",
  }
};
