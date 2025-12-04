import React, { createContext, useContext } from 'react';
import { GeneralSettingsData } from '@/hooks/useSettings';

interface SettingsContextType {
    generalSettings?: GeneralSettingsData;
    updateGeneralSettings: (settings: GeneralSettingsData) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettingsContext = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettingsContext deve ser usado dentro de SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // TODO: Implementar com useSettings hook
    const placeholderValue: SettingsContextType = {
        generalSettings: undefined,
        updateGeneralSettings: () => { },
    };

    return <SettingsContext.Provider value={ placeholderValue }> { children } </SettingsContext.Provider>;
};
