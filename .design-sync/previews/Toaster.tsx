import { Toaster, toast } from 'plano';
import { useEffect } from 'react';

// The Toaster host renders sonner toasts. We fire two on mount so the card
// shows real, styled toasts (success + error variants with the brand's
// left-border accent) instead of an empty host.
export const Notifications = () => {
  useEffect(() => {
    toast.success('Villa Saarinen published', { description: 'Now live and discoverable in the archive.' });
    toast.error('Upload failed', { description: 'The photo exceeds the 20 MB limit.' });
  }, []);
  return (
    <div style={{ height: 300, position: 'relative' }}>
      <Toaster position="top-center" />
    </div>
  );
};
