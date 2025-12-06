import React from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'confirm' | 'alert';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'confirm'
}) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
            onClick={handleBackdropClick}
        >
            <div className="bg-surface rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fadeIn border border-border">
                {title && (
                    <div className="px-6 py-4 border-b border-border">
                        <h3 className="text-lg font-semibold text-primary">{title}</h3>
                    </div>
                )}

                <div className="px-6 py-4">
                    <p className="text-secondary whitespace-pre-line leading-relaxed">{message}</p>
                </div>

                <div className="px-6 py-4 bg-surface rounded-b-lg flex justify-end gap-3 border-t border-border">
                    {type === 'confirm' && (
                        <Button
                            variant="secondary"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        variant={type === 'confirm' ? 'danger' : 'primary'}
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                    >
                        {type === 'confirm' ? confirmText : 'OK'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
