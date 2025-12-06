'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header/PageHeader';
import { ProjectSelector } from './ProjectSelector';
import { BudgetSelector } from './BudgetSelector';
import { CreateProjectDialog } from './CreateProjectDialog';
import { CreateBudgetDialog } from './CreateBudgetDialog';
import { LucideIcon } from 'lucide-react';
import { useProjectContext } from '@/contexts/project-context';

interface ModuleHeaderProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    breadcrumbs?: { label: string; href?: string }[];
    showBudgetSelector?: boolean;
    children?: React.ReactNode;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
    title,
    subtitle,
    icon,
    breadcrumbs,
    showBudgetSelector = true,
    children
}) => {
    const { selectedProjectId } = useProjectContext();

    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isCreatingBudget, setIsCreatingBudget] = useState(false);

    return (
        <>
            <div className="module-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader icon={icon} title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} marginBottom="mb-0" />

                <div className="module-header__selector-group flex items-center gap-4">
                    {children}
                    <ProjectSelector onCreateClick={() => setIsCreatingProject(true)} />

                    {showBudgetSelector && selectedProjectId && (
                        <>
                            <div className="module-header__divider" />
                            <BudgetSelector onCreateClick={() => setIsCreatingBudget(true)} />
                        </>
                    )}
                </div>
            </div>

            <CreateProjectDialog
                open={isCreatingProject}
                onOpenChange={setIsCreatingProject}
            />

            <CreateBudgetDialog
                open={isCreatingBudget}
                onOpenChange={setIsCreatingBudget}
            />
        </>
    );
};
