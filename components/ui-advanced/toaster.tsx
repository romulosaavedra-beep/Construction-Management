// components/ui-advanced/toaster.tsx
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
    return (
        <Sonner
            position="top-right"
            richColors
            closeButton
            duration={4000}
            expand={false}
            toastOptions={{
                className: 'bg-base border border-border text-primary rounded-lg shadow-lg font-sans p-4',
            }}
        />
    );
}
