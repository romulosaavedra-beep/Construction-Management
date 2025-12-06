'use client';

import React from 'react';
import { DateTimeWidget } from '../widgets/DateTimeWidget';
import { WeatherWidget } from '../widgets/WeatherWidget';
import { useSettings } from '@/hooks/useSettings';
import { LocationCoords } from '@/config/weather.config';
import { useProjectContext } from '@/contexts/project-context';

interface HeaderProps {
    showWeather?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showWeather = true }) => {
    const { selectedProjectId } = useProjectContext();
    const { settings } = useSettings(selectedProjectId);

    // Converter locationData para LocationCoords (formato esperado pelo WeatherWidget)
    const locationData: LocationCoords | undefined =
        settings?.location?.latitude && settings?.location?.longitude
            ? {
                latitude: settings.location.latitude,
                longitude: settings.location.longitude,
                name: settings.location.cidade || 'São Paulo',
                country: 'BR',
            }
            : undefined;

    const locationDisplay = settings?.location
        ? `${settings.location.cidade}, ${settings.location.estado} - Brasil`
        : 'São Paulo, SP - Brasil';

    return (
        <header className="header hidden md:flex bg-base px-5 py-3 border-b border-border items-center justify-between flex-shrink-0">
            <DateTimeWidget location={locationDisplay} />

            {showWeather && <WeatherWidget location={locationData} />}
        </header>
    );
};
