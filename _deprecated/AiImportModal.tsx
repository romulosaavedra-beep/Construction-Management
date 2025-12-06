
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface AiImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (content: string, isAutoMapping: boolean) => void;
    isProcessing: boolean;
}

export const AiImportModal: React.FC<AiImportModalProps> = ({ isOpen, onClose, onImport, isProcessing }) => {
    const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
    const [pasteContent, setPasteContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            onImport(text, true); // Auto mapping by default for files
        };
        reader.readAsText(file);
    };

    const handlePasteImport = () => {
        if (!pasteContent.trim()) {
            alert('Por favor, cole o conteúdo do orçamento.');
            return;
        }
        onImport(pasteContent, true);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
            <div className="bg-surface rounded-lg shadow-2xl max-w-2xl w-full border border-default flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-5 border-b border-default">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        🤖 Importação Inteligente com IA
                    </h3>
                    <button onClick={onClose} className="text-secondary hover:text-white text-xl">✕</button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {isProcessing ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
                            <h4 className="text-lg font-medium text-white">Analisando seu orçamento...</h4>
                            <p className="text-secondary mt-2">A IA está identificando colunas, convertendo unidades e estruturando a hierarquia.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 bg-surface p-4 rounded-md border border-default">
                                <h4 className="font-semibold text-primary mb-2">💡 Como funciona?</h4>
                                <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                                    <li>A IA detecta automaticamente colunas como <strong>Discriminação</strong>, <strong>Unidade</strong>, <strong>Quantidade</strong> e <strong>Valores</strong>.</li>
                                    <li>Colunas <strong>Fonte</strong> e <strong>Código</strong> são opcionais e serão ocultadas se não encontradas.</li>
                                    <li>Unidades serão convertidas para o padrão do sistema (ex: 'M2' → 'm²').</li>
                                </ul>
                            </div>

                            <div className="flex space-x-4 mb-4 border-b border-default">
                                <button
                                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'paste' ? 'text-accent-500 border-b-2 border-accent-500' : 'text-secondary hover:text-white'}`}
                                    onClick={() => setActiveTab('paste')}
                                >
                                    📋 Colar (Excel/Texto)
                                </button>
                                <button
                                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'file' ? 'text-accent-500 border-b-2 border-accent-500' : 'text-secondary hover:text-white'}`}
                                    onClick={() => setActiveTab('file')}
                                >
                                    📁 Upload Arquivo
                                </button>
                            </div>

                            {activeTab === 'paste' && (
                                <div className="space-y-4">
                                    <textarea
                                        className="w-full h-64 bg-base border border-default rounded-md p-3 text-sm text-primary font-mono focus:ring-1 focus:ring-accent-500 outline-none resize-none"
                                        placeholder="Cole aqui as células do Excel ou o texto do seu orçamento..."
                                        value={pasteContent}
                                        onChange={(e) => setPasteContent(e.target.value)}
                                    ></textarea>
                                    <div className="flex justify-end">
                                        <Button variant="primary" onClick={handlePasteImport}>
                                            ✨ Analisar e Importar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'file' && (
                                <div className="border-2 border-dashed border-default rounded-lg p-10 text-center hover:bg-surface transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".csv,.txt,.json"
                                        onChange={handleFileChange}
                                    />
                                    <div className="text-4xl mb-3">📄</div>
                                    <p className="text-white font-medium">Clique para selecionar um arquivo</p>
                                    <p className="text-sm text-secondary mt-1">Suporta CSV, TXT ou JSON</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
