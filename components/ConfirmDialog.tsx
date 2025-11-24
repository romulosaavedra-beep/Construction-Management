import React from 'react';
import { Button } from './Button';

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
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70"
            onClick={handleBackdropClick}
        >
            <div className="bg-[#1e2329] rounded-lg shadow-2xl max-w-md w-full mx-4 animate-fadeIn border border-gray-700">
                {title && (
                    <div className="px-6 py-4 border-b border-gray-700">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                )}

                <div className="px-6 py-4">
                    <p className="text-gray-300 whitespace-pre-line leading-relaxed">{message}</p>
                </div>

                <div className="px-6 py-4 bg-[#181c21] rounded-b-lg flex justify-end gap-3 border-t border-gray-700">
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
