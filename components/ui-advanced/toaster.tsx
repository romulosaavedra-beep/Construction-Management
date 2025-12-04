import { Toaster as Sonner } from 'sonner';

export function Toaster() {
    return (
        <Sonner
            position="top-right"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
                style: {
                    background: '#1e2329',
                    border: '1px solid #3a3e45',
                    color: '#e8eaed',
                },
                className: 'toaster-custom',
            }}
        />
    );
}
