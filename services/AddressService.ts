export interface ViaCEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string; // cidade
    uf: string; // estado
    erro?: boolean;
}

interface IBGECity {
    id: number;
    nome: string;
}

const BASE_URL = 'https://viacep.com.br/ws';
const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

/**
 * Utilitário para evitar múltiplas requisições enquanto o usuário digita
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Busca endereço completo por CEP
 */
export async function fetchAddressByCEP(cep: string): Promise<ViaCEPResponse | null> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
        return null;
    }

    try {
        const response = await fetch(`${BASE_URL}/${cleanCep}/json/`);
        if (!response.ok) throw new Error('Erro na requisição');

        const data: ViaCEPResponse = await response.json();

        if (data.erro) return null;

        return data;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

/**
 * Busca lista de cidades por UF (IBGE)
 */
export async function fetchCitiesByUF(uf: string): Promise<string[]> {
    if (uf.length !== 2) return [];

    try {
        const response = await fetch(`${IBGE_BASE_URL}/estados/${uf}/municipios`);
        if (!response.ok) throw new Error('Erro IBGE');

        const data: IBGECity[] = await response.json();
        return data.map(city => city.nome).sort((a, b) => a.localeCompare(b));
    } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        return [];
    }
}

/**
 * Busca logradouros baseados em UF, Cidade e um termo de busca (Rua)
 * ViaCEP exige no mínimo 3 caracteres para essa busca.
 */
export async function fetchStreetsByAddress(
    uf: string,
    cidade: string,
    termo: string
): Promise<ViaCEPResponse[]> {
    if (uf.length !== 2 || !cidade || termo.length < 3) return [];

    try {
        // Formato: /UF/Cidade/Logradouro/json/
        const url = `${BASE_URL}/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(termo)}/json/`;
        const response = await fetch(url);

        if (!response.ok) return [];

        const data = await response.json();

        if (Array.isArray(data)) {
            return data;
        }
        return [];
    } catch (error) {
        console.error('Erro ao buscar logradouros:', error);
        return [];
    }
}

export const maskCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substr(0, 9);
};