

export interface ViaCEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string; // cidade
    uf: string; // estado
    erro?: boolean;
}

interface IBGEState {
    id: number;
    sigla: string;
    nome: string;
}

interface IBGECity {
    id: number;
    nome: string;
}

const BASE_URL = 'https://viacep.com.br/ws';
const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

// Lista de estados brasileiros (UF)
export const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];


/**
 * Busca endereço por CEP
 * @param cep CEP no formato XXXXX-XXX ou XXXXXXXX
 */
export async function fetchAddressByCEP(cep: string): Promise<ViaCEPResponse | null> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
        throw new Error('CEP inválido. Deve conter 8 dígitos.');
    }

    try {
        const response = await fetch(`${BASE_URL}/${cleanCep}/json/`);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data: ViaCEPResponse = await response.json();

        if (data.erro) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        throw error;
    }
}

/**
 * Busca CEP por endereço (Reverse Geocoding)
 * @param uf Sigla do Estado (ex: SP)
 * @param cidade Nome da Cidade
 * @param logradouro Parte do nome da rua/avenida (mínimo 3 caracteres)
 */
export async function fetchCEPsByAddress(uf: string, cidade: string, logradouro: string): Promise<ViaCEPResponse[]> {
    if (uf.length !== 2) {
        throw new Error('UF inválida. Deve conter 2 letras.');
    }

    if (logradouro.length < 3) {
        throw new Error('Logradouro deve ter no mínimo 3 caracteres.');
    }

    try {
        // Formato: /UF/Cidade/Logradouro/json/
        const url = `${BASE_URL}/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data = await response.json();

        // ViaCEP retorna array vazio se não encontrar nada, ou objeto com erro se houver erro
        if (Array.isArray(data)) {
            return data;
        } else if (data.erro) {
            return [];
        }

        return [];
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
        throw error;
    }
}

/**
 * Busca cidades por UF usando API do IBGE
 * @param uf Sigla do Estado (ex: SP)
 */
export async function fetchCitiesByUF(uf: string): Promise<string[]> {
    if (uf.length !== 2) {
        throw new Error('UF inválida. Deve conter 2 letras.');
    }

    try {
        const response = await fetch(`${IBGE_BASE_URL}/estados/${uf}/municipios`);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data: IBGECity[] = await response.json();
        return data.map(city => city.nome).sort();
    } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        throw error;
    }
}

/**
 * Busca bairros por cidade usando ViaCEP
 * @param uf Sigla do Estado (ex: SP)
 * @param cidade Nome da Cidade
 */
export async function fetchNeighborhoodsByCity(uf: string, cidade: string): Promise<string[]> {
    if (uf.length !== 2) {
        throw new Error('UF inválida. Deve conter 2 letras.');
    }

    try {
        // Busca genérica para obter bairros da cidade
        const url = `${BASE_URL}/${uf}/${encodeURIComponent(cidade)}/centro/json/`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            // Extrai bairros únicos
            const neighborhoods = [...new Set(data.map((item: ViaCEPResponse) => item.bairro).filter(Boolean))];
            return neighborhoods.sort();
        }

        return [];
    } catch (error) {
        console.error('Erro ao buscar bairros:', error);
        return []; // Retorna array vazio em caso de erro
    }
}

/**
 * Busca logradouros por bairro usando ViaCEP
 * @param uf Sigla do Estado (ex: SP)
 * @param cidade Nome da Cidade
 * @param bairro Nome do Bairro
 * @param logradouro Parte do nome da rua (mínimo 3 caracteres)
 */
export async function fetchStreetsByNeighborhood(
    uf: string,
    cidade: string,
    bairro: string,
    logradouro: string
): Promise<ViaCEPResponse[]> {
    if (uf.length !== 2) {
        throw new Error('UF inválida. Deve conter 2 letras.');
    }

    if (logradouro.length < 3) {
        return [];
    }

    try {
        const url = `${BASE_URL}/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            // Filtra por bairro se especificado
            if (bairro) {
                return data.filter((item: ViaCEPResponse) =>
                    item.bairro.toLowerCase().includes(bairro.toLowerCase())
                );
            }
            return data;
        }

        return [];
    } catch (error) {
        console.error('Erro ao buscar logradouros:', error);
        return [];
    }
}

export const maskCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length > 5) {
        return cleaned.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    }
    return cleaned;
};
