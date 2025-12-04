import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-[var(--ds-bg-base)] rounded-lg border border-[var(--ds-border-default)]">
                    <div className="bg-[var(--ds-error-bg)] p-4 rounded-full mb-4">
                        <AlertTriangle className="w-8 h-8 text-[var(--ds-error)]" />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--ds-text-primary)] mb-2">
                        Algo deu errado
                    </h2>
                    <p className="text-[var(--ds-text-secondary)] mb-6 max-w-md">
                        Ocorreu um erro inesperado ao carregar este componente. Tente recarregar a página.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Recarregar Página
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Tentar Novamente
                        </Button>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <div className="mt-8 p-4 bg-[var(--ds-bg-surface)] rounded text-left w-full max-w-2xl overflow-auto max-h-64">
                            <p className="text-xs font-mono text-[var(--ds-error)]">
                                {this.state.error.toString()}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
