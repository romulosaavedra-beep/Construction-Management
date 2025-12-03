import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { OrcamentoItem } from '@/types';

// Helper to format numbers (non‑currency) with two decimals
const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

/** Process data with recursive subtotal calculation (same logic as Orcamento.tsx) */
const processDataWithTotals = (data: OrcamentoItem[]) => {
    const itemsMap = new Map();
    const parentIds = new Set(data.map(i => i.pai).filter(p => p !== null));
    let grandTotal = 0;

    // First pass: init items with self values
    data.forEach(item => {
        const isParent = parentIds.has(item.id);
        const matTotal = item.quantidade * item.mat_unit;
        const moTotal = item.quantidade * item.mo_unit;

        itemsMap.set(item.id, {
            ...item,
            hasChildren: isParent,
            matMoUnit: item.mat_unit + item.mo_unit,
            matUnitTotal: matTotal,
            moUnitTotal: moTotal,
            matMoTotal: matTotal + moTotal,
            totalNivel: 0, // Will be calculated recursively
            percentNivel: 0,
        });
    });

    // Recursive subtotal calculation
    const calculateSubtotals = (itemId: number) => {
        const item = itemsMap.get(itemId);
        if (!item) return { mat: 0, mo: 0, total: 0 };

        // If item is a leaf, its subtotals are its own calculated totals
        if (!item.hasChildren) {
            item.totalNivel = item.matMoTotal;
            return { mat: item.matUnitTotal, mo: item.moUnitTotal, total: item.totalNivel };
        }

        // If item is a parent, its subtotals are sum of children
        let sumMat = 0;
        let sumMo = 0;
        let sumTotal = 0;

        data.filter(child => child.pai === itemId).forEach(child => {
            const childTotals = calculateSubtotals(child.id);
            sumMat += childTotals.mat;
            sumMo += childTotals.mo;
            sumTotal += childTotals.total;
        });

        item.matUnitTotal = sumMat;
        item.moUnitTotal = sumMo;
        item.matMoTotal = sumMat + sumMo;
        item.totalNivel = sumTotal;

        return { mat: sumMat, mo: sumMo, total: sumTotal };
    };

    data.filter(item => item.pai === null).forEach(root => {
        const totals = calculateSubtotals(root.id);
        grandTotal += totals.total;
    });

    itemsMap.forEach(item => {
        item.percentNivel = grandTotal > 0 ? (item.totalNivel / grandTotal) * 100 : 0;
    });

    return { processedItems: Array.from(itemsMap.values()), grandTotal };
};

/** CSV export: parent rows are left empty for totals */
export const exportToCsv = (data: OrcamentoItem[], filename: string) => {
    const { processedItems } = processDataWithTotals(data);

    const BOM = "\uFEFF";
    const header = [
        "Nível",
        "Fonte",
        "Código",
        "Discriminação",
        "Unidade",
        "Quantidade",
        "Mat. Unit.",
        "M.O. Unit.",
        "Mat. + M.O. Unit.",
        "Mat. Total",
        "M.O. Total",
        "Mat. + M.O. Total",
        "Total Nível",
        "% Nível",
    ].join(";");

    const rows = processedItems.map(item => {
        if (item.hasChildren) {
            // Parent rows: leave all numeric fields empty
            return [
                item.nivel,
                item.fonte || "",
                item.codigo || "",
                `"${item.discriminacao.replace(/"/g, '""')}"`,
                item.unidade || "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
            ].join(";");
        }
        return [
            item.nivel,
            item.fonte || "",
            item.codigo || "",
            `"${item.discriminacao.replace(/"/g, '""')}"`,
            item.unidade || "",
            formatNumber(item.quantidade),
            formatNumber(item.mat_unit),
            formatNumber(item.mo_unit),
            formatNumber(item.matMoUnit),
            formatNumber(item.matUnitTotal),
            formatNumber(item.moUnitTotal),
            formatNumber(item.matMoTotal),
            formatNumber(item.totalNivel),
            formatNumber(item.percentNivel),
        ].join(";");
    });

    const csvContent = BOM + header + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, `${filename}.csv`);
};

/** Excel export: parent rows contain SUM formulas for direct children */
export const exportToExcel = async (data: OrcamentoItem[], filename: string, hiddenColumns: Set<string>) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Orçamento');

    const { processedItems, grandTotal } = processDataWithTotals(data);

    ws.columns = [
        { header: 'Nível', key: 'nivel', width: 12 },
        { header: 'Fonte', key: 'fonte', width: 10 },
        { header: 'Código', key: 'codigo', width: 12 },
        { header: 'Discriminação', key: 'discriminacao', width: 60 },
        { header: 'Un.', key: 'unidade', width: 6 },
        { header: 'Quant.', key: 'quantidade', width: 10 },
        { header: 'Mat. Unit.', key: 'mat_unit', width: 12 },
        { header: 'M.O. Unit.', key: 'mo_unit', width: 12 },
        { header: 'Mat. + M.O. Unit.', key: 'mat_mo_unit', width: 15 },
        { header: 'Mat. Total', key: 'mat_total', width: 15 },
        { header: 'M.O. Total', key: 'mo_total', width: 15 },
        { header: 'Mat. + M.O. Total', key: 'mat_mo_total', width: 18 },
        { header: 'Total Nível', key: 'total_nivel', width: 18 },
        { header: '% Nível', key: 'percent_nivel', width: 12 },
    ];

    const columnKeyMap: { [appId: string]: string } = {
        nivel: 'nivel',
        fonte: 'fonte',
        codigo: 'codigo',
        discriminacao: 'discriminacao',
        un: 'unidade',
        quant: 'quantidade',
        mat_unit: 'mat_unit',
        mo_unit: 'mo_unit',
        mat_mo_unit: 'mat_mo_unit',
        mat_total: 'mat_total',
        mo_total: 'mo_total',
        mat_mo_total: 'mat_mo_total',
        total_nivel: 'total_nivel',
        percent_nivel: 'percent_nivel',
    };

    ws.columns.forEach(col => {
        const appId = Object.keys(columnKeyMap).find(k => columnKeyMap[k] === col.key);
        if (appId && hiddenColumns.has(appId)) col.hidden = true;
    });

    // Header styling (modern blue-gray theme)
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FF1E293B' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Build rows and collect info for later parent formula generation
    const rowsInfo: Array<{ id: number; row: any; depth: number; isParent: boolean }> = [];

    processedItems.forEach(item => {
        const depth = (item.nivel.match(/\./g) || []).length;
        const isParent = item.hasChildren;

        const row = ws.addRow({
            nivel: item.nivel,
            fonte: item.fonte,
            codigo: item.codigo,
            discriminacao: item.discriminacao,
            unidade: item.unidade,
            quantidade: isParent ? '' : item.quantidade,
            mat_unit: isParent ? '' : item.mat_unit,
            mo_unit: isParent ? '' : item.mo_unit,
            mat_mo_unit: isParent ? '' : item.matMoUnit,
            mat_total: isParent ? 0 : item.matUnitTotal,
            mo_total: isParent ? 0 : item.moUnitTotal,
            mat_mo_total: isParent ? 0 : item.matMoTotal,
            total_nivel: isParent ? 0 : item.totalNivel,
            percent_nivel: 0,
        });

        const rowIdx = row.number;

        // Leaf rows: apply formulas (% Nível will be updated after TOTAIS row is created)
        if (!isParent) {
            row.getCell('mat_total').value = { formula: `F${rowIdx}*G${rowIdx}`, result: item.matUnitTotal };
            row.getCell('mo_total').value = { formula: `F${rowIdx}*H${rowIdx}`, result: item.moUnitTotal };
            row.getCell('mat_mo_unit').value = { formula: `G${rowIdx}+H${rowIdx}`, result: item.matMoUnit };
            row.getCell('mat_mo_total').value = { formula: `J${rowIdx}+K${rowIdx}`, result: item.matMoTotal };
            row.getCell('total_nivel').value = { formula: `L${rowIdx}`, result: item.totalNivel };
        }

        // Formatting (modern blue-gray theme)
        row.getCell('percent_nivel').numFmt = '0.00%';
        row.getCell('discriminacao').alignment = { indent: depth };
        row.font = { bold: isParent };

        if (isParent) {
            if (depth === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
                row.border = { top: { style: 'medium', color: { argb: 'FF94A3B8' } }, bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
            } else {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                row.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
            }
        } else {
            row.border = { bottom: { style: 'dotted', color: { argb: 'FFCBD5E1' } } };
        }

        const currencyFmt = '_("R$"* #,##0.00_);_("R$"* (#,##0.00);_("R$"* "-"??_);_(@_)';
        const numberFmt = '#,##0.00';
        row.getCell('quantidade').numFmt = numberFmt;
        row.getCell('mat_unit').numFmt = currencyFmt;
        row.getCell('mo_unit').numFmt = currencyFmt;
        row.getCell('mat_mo_unit').numFmt = currencyFmt;
        row.getCell('mat_total').numFmt = currencyFmt;
        row.getCell('mo_total').numFmt = currencyFmt;
        row.getCell('mat_mo_total').numFmt = currencyFmt;
        row.getCell('total_nivel').numFmt = currencyFmt;

        rowsInfo.push({ id: item.id, row, depth, isParent });
    });

    // Apply SUM formulas for parent rows - sum only DIRECT children
    rowsInfo.forEach((info) => {
        if (!info.isParent) return;

        // Find direct children of this parent
        const directChildrenRows: number[] = [];

        processedItems.forEach((item) => {
            if (item.pai === info.id) {
                const childRowInfo = rowsInfo.find(r => r.id === item.id);
                if (childRowInfo) {
                    directChildrenRows.push(childRowInfo.row.number);
                }
            }
        });

        if (directChildrenRows.length === 0) return;

        // Sort row numbers
        directChildrenRows.sort((a, b) => a - b);

        // Build SUM formula with ranges or individual cells
        const buildSumFormula = (column: string): string => {
            const ranges: string[] = [];
            let rangeStart = directChildrenRows[0];
            let rangeEnd = directChildrenRows[0];

            for (let i = 1; i < directChildrenRows.length; i++) {
                if (directChildrenRows[i] === rangeEnd + 1) {
                    rangeEnd = directChildrenRows[i];
                } else {
                    if (rangeStart === rangeEnd) {
                        ranges.push(`${column}${rangeStart}`);
                    } else {
                        ranges.push(`${column}${rangeStart}:${column}${rangeEnd}`);
                    }
                    rangeStart = directChildrenRows[i];
                    rangeEnd = directChildrenRows[i];
                }
            }

            if (rangeStart === rangeEnd) {
                ranges.push(`${column}${rangeStart}`);
            } else {
                ranges.push(`${column}${rangeStart}:${column}${rangeEnd}`);
            }

            return `SUM(${ranges.join(',')})`;
        };

        // Apply formulas
        info.row.getCell('mat_total').value = { formula: buildSumFormula('J') };
        info.row.getCell('mo_total').value = { formula: buildSumFormula('K') };
        info.row.getCell('mat_mo_total').value = { formula: buildSumFormula('L') };
        info.row.getCell('total_nivel').value = { formula: buildSumFormula('M') };
    });

    // Add TOTAIS GERAIS row at the end
    const rootLevelRows: number[] = [];
    processedItems.forEach((item) => {
        if (item.pai === null) {
            const itemRowInfo = rowsInfo.find(r => r.id === item.id);
            if (itemRowInfo) {
                rootLevelRows.push(itemRowInfo.row.number);
            }
        }
    });

    rootLevelRows.sort((a, b) => a - b);

    const totalsRow = ws.addRow({
        nivel: '',
        fonte: '',
        codigo: '',
        discriminacao: 'TOTAIS GERAIS',
        unidade: '',
        quantidade: '',
        mat_unit: '',
        mo_unit: '',
        mat_mo_unit: '',
        mat_total: 0,
        mo_total: 0,
        mat_mo_total: 0,
        total_nivel: 0,
        percent_nivel: 1,
    });

    const totalsRowIdx = totalsRow.number;

    // Build formulas for TOTAIS GERAIS row (sum all root-level items)
    const buildTotalsFormula = (column: string): string => {
        const ranges: string[] = [];
        let rangeStart = rootLevelRows[0];
        let rangeEnd = rootLevelRows[0];

        for (let i = 1; i < rootLevelRows.length; i++) {
            if (rootLevelRows[i] === rangeEnd + 1) {
                rangeEnd = rootLevelRows[i];
            } else {
                if (rangeStart === rangeEnd) {
                    ranges.push(`${column}${rangeStart}`);
                } else {
                    ranges.push(`${column}${rangeStart}:${column}${rangeEnd}`);
                }
                rangeStart = rootLevelRows[i];
                rangeEnd = rootLevelRows[i];
            }
        }

        if (rangeStart === rangeEnd) {
            ranges.push(`${column}${rangeStart}`);
        } else {
            ranges.push(`${column}${rangeStart}:${column}${rangeEnd}`);
        }

        return `SUM(${ranges.join(',')})`;
    };

    // Apply formulas to TOTAIS GERAIS
    totalsRow.getCell('mat_total').value = { formula: buildTotalsFormula('J') };
    totalsRow.getCell('mo_total').value = { formula: buildTotalsFormula('K') };
    totalsRow.getCell('mat_mo_total').value = { formula: buildTotalsFormula('L') };
    totalsRow.getCell('total_nivel').value = { formula: buildTotalsFormula('M') };
    totalsRow.getCell('percent_nivel').value = { formula: `M${totalsRowIdx}/M${totalsRowIdx}` };

    // Format TOTAIS GERAIS row (modern blue theme)
    const currencyFmt = '_("R$"* #,##0.00_);_("R$"* (#,##0.00);_("R$"* "-"??_);_(@_)';
    totalsRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    totalsRow.border = {
        top: { style: 'double', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'double', color: { argb: 'FF1E3A8A' } }
    };
    totalsRow.getCell('discriminacao').alignment = { horizontal: 'right', indent: 0 };
    totalsRow.getCell('mat_total').numFmt = currencyFmt;
    totalsRow.getCell('mo_total').numFmt = currencyFmt;
    totalsRow.getCell('mat_mo_total').numFmt = currencyFmt;
    totalsRow.getCell('total_nivel').numFmt = currencyFmt;
    totalsRow.getCell('percent_nivel').numFmt = '0.00%';

    // Now update all % Nível formulas to reference the TOTAIS GERAIS cell
    rowsInfo.forEach((info) => {
        const percentFormula = `M${info.row.number}/M$${totalsRowIdx}`;
        info.row.getCell('percent_nivel').value = { formula: percentFormula };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
};
