/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  gtag: (
    command: 'config' | 'event' | 'js',
    targetId: string | Date,
    config?: Record<string, any>
  ) => void;
  dataLayer: any[];
}
