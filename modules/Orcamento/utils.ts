import { formatCurrency } from '../../utils/formatters';

export const formatNumberOrDash = (value: number, decimalPlaces = 2): string => {
    if (value === 0 || isNaN(value)) return '-';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    }).format(value);
};

export const formatCurrencyOrDash = (value: number): string => {
    if (value === 0 || isNaN(value)) return '-';
    return formatCurrency(value);
};

export const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>, colId: string) => {
    e.preventDefault();
    const currentInput = e.currentTarget;
    const table = currentInput.closest('table');
    if (!table) return;

    // Busca todos os inputs/selects da mesma coluna na tabela
    const allInputs = Array.from(table.querySelectorAll(`input[data-col-id="${colId}"], select[data-col-id="${colId}"]`)) as HTMLElement[];

    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex !== -1) {
        // Calcula o próximo índice, voltando para o início (0) se chegar ao fim (loop)
        const nextIndex = (currentIndex + 1) % allInputs.length;
        const nextInput = allInputs[nextIndex];

        nextInput.focus();
        if (nextInput instanceof HTMLInputElement) {
            nextInput.select();
        }
    }
};

export const getCellContentAsString = (item: any, columnId: string): string => {
    const isService = !item.hasChildren;

    switch (columnId) {
        case 'nivel': return item.nivel;
        case 'fonte': return isService ? item.fonte : '';
        case 'codigo': return isService ? item.codigo : '';
        case 'discriminacao': return item.discriminacao;
        case 'un': return item.unidade || '-';
        case 'quant': return isService ? formatNumberOrDash(item.quantidade) : '-';
        case 'mat_unit': return isService ? formatCurrencyOrDash(item.mat_unit) : '-';
        case 'mo_unit': return isService ? formatCurrencyOrDash(item.mo_unit) : '-';
        case 'mat_mo_unit': return isService ? formatCurrencyOrDash(item.matMoUnit) : '-';
        case 'mat_total': return formatCurrencyOrDash(item.matUnitTotal);
        case 'mo_total': return formatCurrencyOrDash(item.moUnitTotal);
        case 'mat_mo_total': return formatCurrencyOrDash(item.matMoTotal);
        case 'total_nivel': return formatCurrencyOrDash(item.totalNivel);
        case 'percent_nivel': return item.percentNivel > 0 ? item.percentNivel.toFixed(2) + '%' : '-';
        default: return '';
    }
};
