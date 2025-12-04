/**
 * Configuração de API de Clima
 * Utiliza Open-Meteo (gratuita, sem API key necessária)
 */

export const WEATHER_CONFIG = {
    // Open-Meteo API - Gratuita, sem limite de requisições
    api: {
        baseUrl: 'https://api.open-meteo.com/v1',
        endpoints: {
            forecast: '/forecast',
            geocoding: '/geocoding',
        },
    },

    // Configuração de cache (5 minutos)
    cache: {
        duration: 5 * 60 * 1000,
        storageKey: 'weather-cache',
    },

    // Parâmetros da API
    parameters: {
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'weather_code',
            'weather_description',
            'wind_speed_10m',
            'wind_direction_10m',
        ],
        hourly: [],
        timezone: 'America/Sao_Paulo',
    },

    // Interpretação de weather codes (WMO)
    weatherCodes: {
        0: { description: 'Céu Limpo', icon: 'clear' },
        1: { description: 'Parcialmente Nublado', icon: 'cloudy' },
        2: { description: 'Parcialmente Nublado', icon: 'cloudy' },
        3: { description: 'Nublado', icon: 'cloud' },
        45: { description: 'Névoa', icon: 'fog' },
        48: { description: 'Névoa Fria', icon: 'fog' },
        51: { description: 'Chuva Leve', icon: 'rain' },
        53: { description: 'Chuva Moderada', icon: 'rain' },
        55: { description: 'Chuva Intensa', icon: 'rain' },
        61: { description: 'Chuva', icon: 'rain' },
        63: { description: 'Chuva Forte', icon: 'rain' },
        65: { description: 'Chuva Muito Forte', icon: 'rain' },
        80: { description: 'Chuva Leve', icon: 'rain' },
        81: { description: 'Chuva Moderada', icon: 'rain' },
        82: { description: 'Chuva Violenta', icon: 'rain' },
        95: { description: 'Tempestade', icon: 'storm' },
    },
} as const;

export interface WeatherData {
    temperature: number;
    humidity: number;
    description: string;
    windSpeed: number;
    windDirection: number;
    condition: string;
    lastUpdated: Date;
}

export interface LocationCoords {
    latitude: number;
    longitude: number;
    name: string;
    country: string;
}
