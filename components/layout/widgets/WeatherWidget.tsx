'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets, AlertCircle, RefreshCw } from 'lucide-react';
import { WEATHER_CONFIG, WeatherData, LocationCoords } from '@/config/weather.config';

interface WeatherWidgetProps {
    location?: LocationCoords;
    compact?: boolean;
    autoRefresh?: boolean;
}

type WeatherIcon = React.ReactNode;

const WEATHER_ICONS: Record<string, WeatherIcon> = {
    clear: <Sun className="w-8 h-8 text-yellow-400" />,
    cloudy: <Cloud className="w-8 h-8 text-gray-400" />,
    cloud: <Cloud className="w-8 h-8 text-gray-500" />,
    fog: <Cloud className="w-8 h-8 text-gray-300" />,
    rain: <CloudRain className="w-8 h-8 text-blue-400" />,
    storm: <CloudRain className="w-8 h-8 text-purple-600" />,
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
    location,
    compact = false,
    autoRefresh = true,
}) => {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!location) return;

        const fetchWeather = async () => {
            try {
                setLoading(true);
                setError(null);

                // Construir URL da API
                const params = new URLSearchParams({
                    latitude: location.latitude.toString(),
                    longitude: location.longitude.toString(),
                    current: WEATHER_CONFIG.parameters.current.join(','),
                    timezone: WEATHER_CONFIG.parameters.timezone,
                });

                const response = await fetch(
                    `${WEATHER_CONFIG.api.baseUrl}${WEATHER_CONFIG.api.endpoints.forecast}?${params}`
                );

                if (!response.ok) throw new Error('Falha ao buscar dados de clima');

                const data = await response.json();
                const current = data.current;

                // Interpretação do weather code
                const weatherInfo =
                    WEATHER_CONFIG.weatherCodes[
                    current.weather_code as keyof typeof WEATHER_CONFIG.weatherCodes
                    ] || {
                        description: 'Desconhecido',
                        icon: 'clear',
                    };

                setWeatherData({
                    temperature: Math.round(current.temperature_2m),
                    humidity: current.relative_humidity_2m,
                    description: weatherInfo.description,
                    windSpeed: Math.round(current.wind_speed_10m),
                    windDirection: current.wind_direction_10m,
                    condition: weatherInfo.icon,
                    lastUpdated: new Date(),
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao buscar clima');
                console.error('Weather API Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();

        // Atualizar a cada 5 minutos se autoRefresh estiver ativo
        if (autoRefresh) {
            const interval = setInterval(fetchWeather, WEATHER_CONFIG.cache.duration);
            return () => clearInterval(interval);
        }
    }, [location, autoRefresh]);

    if (loading) {
        return (
            <div className="flex items-center gap-3 bg-[var(--ds-bg-surface)] px-4 py-2 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-[var(--ds-bg-elevated)] rounded" />
                <div className="space-y-1 flex-1">
                    <div className="h-2 bg-[var(--ds-bg-elevated)] rounded w-12" />
                    <div className="h-2 bg-[var(--ds-bg-elevated)] rounded w-20" />
                </div>
            </div>
        );
    }

    if (error || !weatherData) {
        return (
            <div className="flex items-center gap-2 bg-[var(--ds-bg-surface)] px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[var(--ds-warning)]" />
                <span className="text-xs text-[var(--ds-text-secondary)]">Clima indisponível</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2 bg-[var(--ds-bg-surface)] px-3 py-2 rounded-lg">
                {WEATHER_ICONS[weatherData.condition] || WEATHER_ICONS.clear}
                <div className="text-xs">
                    <div className="font-semibold text-[var(--ds-text-primary)]">
                        {weatherData.temperature}°C
                    </div>
                    <div className="text-[var(--ds-text-secondary)]">{weatherData.description}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 bg-[var(--ds-bg-surface)] px-4 py-3 rounded-lg border border-[var(--ds-border-default)]">
            {WEATHER_ICONS[weatherData.condition] || WEATHER_ICONS.clear}

            <div className="space-y-1">
                <div className="text-[var(--ds-text-primary)] font-bold text-lg">
                    {weatherData.temperature}°C
                </div>
                <div className="text-xs text-[var(--ds-text-secondary)]">{weatherData.description}</div>
            </div>

            <div className="hidden sm:flex items-center gap-4 ml-auto text-xs text-[var(--ds-text-secondary)] pl-4 border-l border-[var(--ds-border-default)]">
                <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>{weatherData.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                    <Wind className="w-3 h-3" />
                    <span>{weatherData.windSpeed} km/h</span>
                </div>
            </div>

            <div className="text-[10px] text-[var(--ds-text-disabled)] whitespace-nowrap">
                {weatherData.lastUpdated.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </div>
        </div>
    );
};
