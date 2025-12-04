/**
 * Geocodificação reversa: Endereço → Latitude/Longitude
 * Usa Nominatim (gratuita, sem API key)
 */

export interface GeocodeResult {
    latitude: number;
    longitude: number;
    display_name: string;
}

export const geocodeAddress = async (
    logradouro: string,
    numero: string,
    bairro: string,
    cidade: string,
    estado: string,
    cep: string
): Promise<GeocodeResult | null> => {
    try {
        const address = `${logradouro} ${numero}, ${bairro}, ${cidade}, ${estado}, ${cep}, Brasil`;

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const results = await response.json();
        if (results.length === 0) return null;

        return {
            latitude: parseFloat(results[0].lat),
            longitude: parseFloat(results[0].lon),
            display_name: results[0].display_name,
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};
