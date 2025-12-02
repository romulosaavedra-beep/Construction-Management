import { supabase } from '../services/supabase';
import { BudgetService } from '../services/BudgetService';
import type { OrcamentoItem } from '../types';

export interface MigrationResult {
    success: boolean;
    budgetId?: string;
    itemsCount?: number;
    error?: string;
}

/**
 * Migrates budget data from localStorage to Supabase
 * Creates backup in localStorage before migration
 */
export const migrateBudgetToSupabase = async (projectId: string): Promise<MigrationResult> => {
    try {
        // 1. Load from localStorage
        const localBudget = BudgetService.loadBudget();

        if (!localBudget || localBudget.length === 0) {
            console.log('No local budget data found to migrate');
            return {
                success: true,
                itemsCount: 0
            };
        }

        console.log(`Found ${localBudget.length} items in localStorage to migrate`);

        // 2. Create backup in localStorage (with timestamp)
        const backupKey = `vobi-budget-backup-${new Date().toISOString()}`;
        localStorage.setItem(backupKey, JSON.stringify(localBudget));
        console.log(`Backup created: ${backupKey}`);

        // 3. Check if budget already exists for this project
        const { data: existingBudgets, error: fetchError } = await supabase
            .from('budgets')
            .select('id, name')
            .eq('project_id', projectId)
            .eq('name', 'Orçamento Migrado (localStorage)');

        if (fetchError) throw fetchError;

        let budgetId: string;

        if (existingBudgets && existingBudgets.length > 0) {
            // Use existing budget
            budgetId = existingBudgets[0].id;
            console.log(`Using existing budget: ${budgetId}`);
        } else {
            // 4. Create new budget in Supabase
            const { data: budget, error: budgetError } = await supabase
                .from('budgets')
                .insert([{
                    project_id: projectId,
                    name: 'Orçamento Migrado (localStorage)',
                    description: `Migrado automaticamente em ${new Date().toLocaleString('pt-BR')}`
                }])
                .select()
                .single();

            if (budgetError) throw budgetError;
            budgetId = budget.id;
            console.log(`Created new budget: ${budgetId}`);
        }

        // 5. Delete existing items (if any)
        const { error: deleteError } = await supabase
            .from('budget_items')
            .delete()
            .eq('budget_id', budgetId);

        if (deleteError) throw deleteError;

        // 6. Insert items
        const itemsToInsert = localBudget.map((item, index) => ({
            budget_id: budgetId,
            nivel: item.nivel,
            pai: item.pai,
            fonte: item.fonte || null,
            codigo: item.codigo || null,
            discriminacao: item.discriminacao,
            unidade: item.unidade || null,
            quantidade: item.quantidade,
            mat_unit: item.mat_unit,
            mo_unit: item.mo_unit,
            expandido: item.expandido,
            use_total_unit: item.use_total_unit || false,
            source_metadata: item.sourceMetadata || {},
            display_order: index
        }));

        const { error: itemsError } = await supabase
            .from('budget_items')
            .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        console.log(`Migrated ${localBudget.length} items successfully`);

        return {
            success: true,
            budgetId,
            itemsCount: localBudget.length
        };
    } catch (error) {
        console.error('Migration failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

/**
 * Lists all localStorage backups
 */
export const listLocalStorageBackups = (): string[] => {
    const backups: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vobi-budget-backup-')) {
            backups.push(key);
        }
    }
    return backups.sort().reverse(); // Most recent first
};

/**
 * Restores budget from a localStorage backup
 */
export const restoreFromBackup = (backupKey: string): OrcamentoItem[] | null => {
    try {
        const data = localStorage.getItem(backupKey);
        if (!data) return null;

        const items = JSON.parse(data);
        if (Array.isArray(items)) {
            return items;
        }
        return null;
    } catch (error) {
        console.error('Failed to restore backup:', error);
        return null;
    }
};

/**
 * Deletes old backups, keeping only the N most recent
 */
export const cleanupOldBackups = (keepCount: number = 5) => {
    const backups = listLocalStorageBackups();
    const toDelete = backups.slice(keepCount);

    toDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Deleted old backup: ${key}`);
    });

    return toDelete.length;
};
