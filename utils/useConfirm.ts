import { useState, useCallback } from 'react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

interface AlertOptions {
    title?: string;
    message: string;
}

export const useConfirm = () => {
    const [dialogState, setDialogState] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        type: 'confirm' | 'alert';
        confirmText?: string;
        cancelText?: string;
        resolver?: (value: boolean) => void;
    }>({
        isOpen: false,
        message: '',
        type: 'confirm'
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText,
                cancelText: options.cancelText,
                type: 'confirm',
                resolver: resolve
            });
        });
    }, []);

    const alert = useCallback((options: AlertOptions): Promise<void> => {
        return new Promise((resolve) => {
            setDialogState({
                isOpen: true,
                title: options.title,
                message: options.message,
                type: 'alert',
                resolver: () => resolve()
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (dialogState.resolver) {
            dialogState.resolver(true);
        }
        setDialogState(prev => ({ ...prev, isOpen: false }));
    }, [dialogState.resolver]);

    const handleCancel = useCallback(() => {
        if (dialogState.resolver) {
            dialogState.resolver(false);
        }
        setDialogState(prev => ({ ...prev, isOpen: false }));
    }, [dialogState.resolver]);

    return {
        confirm,
        alert,
        dialogState,
        handleConfirm,
        handleCancel
    };
};
