
import { useCallback } from 'react';
import type { OrcamentoItem } from '@/types';
import { getAllDescendantIds, updateHierarchy } from '../utils';

export const useOrcamentoOperations = (
    localOrcamento: OrcamentoItem[],
    updateOrcamento: (updater: React.SetStateAction<OrcamentoItem[]>) => void,
) => {

    const handleValueCommit = (id: string | number, field: keyof OrcamentoItem, value: string | number) => {
        updateOrcamento(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'unidade' && (value === '' || value === '-')) {
                    updatedItem.quantidade = 0;
                    updatedItem.mat_unit = 0;
                    updatedItem.mo_unit = 0;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleNivelChange = (id: string | number, newNivel: string) => {
        const currentItem = localOrcamento.find(i => i.id === id);
        if (!currentItem || currentItem.nivel === newNivel) return;

        const parts = newNivel.split('.').filter(p => p);
        if (parts.length === 0) return;

        const newParentNivel = parts.slice(0, -1).join('.');
        const newParent = localOrcamento.find(i => i.nivel === newParentNivel);
        const newParentId = newParentNivel === '' ? null : (newParent ? newParent.id : 'INVALID');

        if (newParentId === 'INVALID') return;

        let p = newParent;
        while (p) {
            if (p.id === id) return;
            p = p.pai ? localOrcamento.find(i => i.id === p.pai) : null;
        }

        const idsToMove = new Set<string | number>([id, ...getAllDescendantIds(localOrcamento, id)]);
        const itemsToMove = localOrcamento.filter(i => idsToMove.has(i.id));
        const remainingItems = localOrcamento.filter(i => !idsToMove.has(i.id));

        const mainItemToMove = itemsToMove.find(i => i.id === id);
        if (mainItemToMove) {
            mainItemToMove.pai = newParentId;
        }

        let insertionIndex = -1;
        if (newParentId !== null) {
            const childrenOfNewParent = remainingItems.filter(i => i.pai === newParentId);
            const lastChildOfNewParent = childrenOfNewParent[childrenOfNewParent.length - 1];

            if (lastChildOfNewParent) {
                const lastDescendantIds = getAllDescendantIds(remainingItems, lastChildOfNewParent.id);
                const lastId = lastDescendantIds.length > 0 ? lastDescendantIds[lastDescendantIds.length - 1] : lastChildOfNewParent.id;
                insertionIndex = remainingItems.findIndex(i => i.id === lastId) + 1;
            } else {
                insertionIndex = remainingItems.findIndex(i => i.id === newParentId) + 1;
            }
        } else {
            const lastRootItem = [...remainingItems].reverse().find(i => i.pai === null);
            insertionIndex = lastRootItem ? remainingItems.findIndex(i => i.id === lastRootItem.id) + 1 : 0;
        }

        if (insertionIndex === -1) insertionIndex = remainingItems.length;

        remainingItems.splice(insertionIndex, 0, ...itemsToMove);
        updateOrcamento(updateHierarchy(remainingItems));
    };

    const handleNivelKeyDown = (e: React.KeyboardEvent, itemId: string | number) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();

        const items = [...localOrcamento];
        const currentItem = items.find(i => i.id === itemId);
        if (!currentItem) return;

        let newItems: OrcamentoItem[] = [];

        if (e.shiftKey) { // Outdent
            const parentItem = items.find(i => i.id === currentItem.pai);
            if (!parentItem) return;

            const blockIds = new Set([itemId, ...getAllDescendantIds(items, itemId)]);
            const newBlockToMove = items
                .filter(i => blockIds.has(i.id))
                .map(item => item.id === itemId ? { ...item, pai: parentItem.pai } : { ...item });

            const remainingItems = items.filter(i => !blockIds.has(i.id));
            const parentAndItsDescendantsIds = [parentItem.id, ...getAllDescendantIds(remainingItems, parentItem.id)];
            const lastIdInParentFamily = parentAndItsDescendantsIds[parentAndItsDescendantsIds.length - 1];
            const insertionIndex = remainingItems.findIndex(i => i.id === lastIdInParentFamily) + 1;

            remainingItems.splice(insertionIndex, 0, ...newBlockToMove);
            newItems = remainingItems;

        } else { // Indent
            const parentId = currentItem.pai;
            const currentItemIndexInFlatArray = items.findIndex(i => i.id === itemId);

            let precedingSibling: OrcamentoItem | undefined = undefined;
            for (let i = currentItemIndexInFlatArray - 1; i >= 0; i--) {
                const potentialSibling = items[i];
                if (potentialSibling && potentialSibling.pai === parentId) {
                    precedingSibling = potentialSibling;
                    break;
                }
            }

            if (!precedingSibling) return;

            const newParent = precedingSibling;
            const blockIds = new Set([itemId, ...getAllDescendantIds(items, itemId)]);

            const newBlockToMove = items
                .filter(i => blockIds.has(i.id))
                .map(item => item.id === itemId ? { ...item, pai: newParent.id } : item);

            const remainingItems = items.filter(i => !blockIds.has(i.id));

            const newParentAndItsDescendantsIds = [newParent.id, ...getAllDescendantIds(remainingItems, newParent.id)];
            const lastIdInNewParentFamily = newParentAndItsDescendantsIds[newParentAndItsDescendantsIds.length - 1];
            const insertionIndex = remainingItems.findIndex(i => i.id === lastIdInNewParentFamily) + 1;

            const originalParentIds = new Set(items.map(i => i.pai).filter(p => p !== null));
            const finalRemainingItems = remainingItems.map(i => {
                if (i.id === newParent.id) {
                    const becomesParent = !originalParentIds.has(newParent.id);
                    return {
                        ...i,
                        expandido: true,
                        ...(becomesParent && { unidade: '', quantidade: 0, mat_unit: 0, mo_unit: 0 })
                    };
                }
                return i;
            });

            finalRemainingItems.splice(insertionIndex, 0, ...newBlockToMove);
            newItems = finalRemainingItems;
        }

        if (newItems.length > 0) {
            updateOrcamento(updateHierarchy(newItems));
        }
    };

    const handleDragStart = (e: React.DragEvent, setDraggedItemId: (id: string | number | null) => void, itemId: string | number) => {
        setDraggedItemId(itemId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, draggedItemId: string | number | null, setDraggedItemId: (id: string | number | null) => void, targetItemId: string | number) => {
        e.preventDefault();
        if (draggedItemId === null || draggedItemId === targetItemId) {
            setDraggedItemId(null);
            return;
        }

        const items = [...localOrcamento];
        const draggedItem = items.find(i => i.id === draggedItemId);
        const targetItem = items.find(i => i.id === targetItemId);

        // Safety check if items exist
        if (!draggedItem || !targetItem) {
            setDraggedItemId(null);
            return;
        }

        const blockIds = new Set([draggedItemId, ...getAllDescendantIds(items, draggedItemId)]);
        if (blockIds.has(targetItemId)) {
            setDraggedItemId(null);
            return;
        }

        const blockToMove = items.filter(i => blockIds.has(i.id));
        const remainingItems = items.filter(i => !blockIds.has(i.id));

        const mainItemToMove = blockToMove.find(i => i.id === draggedItemId);
        if (mainItemToMove) {
            mainItemToMove.pai = targetItem.pai;
        }

        const targetDescendantIds = getAllDescendantIds(remainingItems, targetItemId);
        const lastRelevantId = targetDescendantIds.length > 0 ? targetDescendantIds[targetDescendantIds.length - 1] : targetItemId;
        const insertionIndex = remainingItems.findIndex(i => i.id === lastRelevantId) + 1;

        remainingItems.splice(insertionIndex, 0, ...blockToMove);
        updateOrcamento(updateHierarchy(remainingItems));
        setDraggedItemId(null);
    };

    const handleAddNewRow = (afterId: string | number) => {
        const afterItem = localOrcamento.find(item => item.id === afterId);
        if (!afterItem) return;

        const newId = crypto.randomUUID();
        const newItem: OrcamentoItem = {
            id: newId, nivel: '', pai: afterItem.pai, fonte: '', codigo: '',
            discriminacao: 'Novo Serviço', unidade: '', quantidade: 0,
            mat_unit: 0, mo_unit: 0, expandido: false,
        };

        const afterIndex = localOrcamento.findIndex(item => item.id === afterId);
        const newOrcamento = [...localOrcamento];
        newOrcamento.splice(afterIndex + 1, 0, newItem);
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleDeleteRow = (idToDelete: string | number) => {
        const idsToDelete = new Set([idToDelete, ...getAllDescendantIds(localOrcamento, idToDelete)]);
        const newOrcamento = localOrcamento.filter(item => !idsToDelete.has(item.id));
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const handleDeleteSelected = (selectedIds: Set<string | number>, setSelectedIds: (ids: Set<string | number>) => void) => {
        if (selectedIds.size === 0) return;

        let idsToDelete = new Set<string | number>();
        for (const id of selectedIds) {
            idsToDelete.add(id);
            const descendants = getAllDescendantIds(localOrcamento, id);
            descendants.forEach(descId => idsToDelete.add(descId));
        }
        const newOrcamento = localOrcamento.filter(item => !idsToDelete.has(item.id));
        updateOrcamento(updateHierarchy(newOrcamento));
        setSelectedIds(new Set());
    };

    const handleDuplicateRow = (idToDuplicate: string | number) => {
        const originalItem = localOrcamento.find(item => item.id === idToDuplicate);
        if (!originalItem) return;

        const newId = crypto.randomUUID();
        const newItem: OrcamentoItem = {
            ...originalItem, id: newId,
            discriminacao: `${originalItem.discriminacao} (Cópia)`,
            expandido: false,
        };

        const originalIndex = localOrcamento.findIndex(item => item.id === idToDuplicate);
        const newOrcamento = [...localOrcamento];
        newOrcamento.splice(originalIndex + 1, 0, newItem);
        updateOrcamento(updateHierarchy(newOrcamento));
    };

    const toggleExpand = (id: string | number) => {
        updateOrcamento(prev => prev.map(item =>
            item.id === id ? { ...item, expandido: !item.expandido } : item
        ));
    };

    return {
        handleValueCommit,
        handleNivelChange,
        handleNivelKeyDown,
        handleDragStart,
        handleDrop,
        handleAddNewRow,
        handleDeleteRow,
        handleDeleteSelected,
        handleDuplicateRow,
        toggleExpand
    };
}
