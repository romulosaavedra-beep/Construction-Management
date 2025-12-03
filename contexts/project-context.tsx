import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProjects } from '../hooks/useProjects';

interface ProjectContextType {
    selectedProjectId: string | undefined;
    setSelectedProjectId: (id: string | undefined) => void;
    projects: any[];
    createProject: (name: string) => Promise<any>;
    deleteProject: (id: string) => Promise<boolean>;
    loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { projects, createProject, deleteProject, loading } = useProjects();
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

    // Auto-select first project if none selected
    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    return (
        <ProjectContext.Provider value={{
            selectedProjectId,
            setSelectedProjectId,
            projects,
            createProject,
            deleteProject,
            loading
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjectContext = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjectContext must be used within ProjectProvider');
    }
    return context;
};
