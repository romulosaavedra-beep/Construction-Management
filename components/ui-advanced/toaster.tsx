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
                // Agora usa CSS Variables ao invés de hardcoded
                style: {
                    background: 'var(--ds-bg-base)',
                    border: '1px solid var(--ds-border-default)',
                    color: 'var(--ds-text-primary)',
                    borderRadius: 'var(--ds-radius-lg)',
                    boxShadow: 'var(--ds-shadow-lg)',
                    fontFamily: 'var(--ds-font-sans)',
                    padding: '16px',
                },
                className: 'toaster-custom',
            }}
        />
    );
}
