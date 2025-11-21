
import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { clima15DiasData, climaIntraDiarioData } from '../data/mockData';
import { Button } from '../components/Button';
import type { Module } from '../types';

interface ClimaProps {
  setActiveModule: (module: Module) => void;
}

const LOCAL_STORAGE_KEY_GENERAL = 'vobi-settings-general';

const Clima: React.FC<ClimaProps> = ({ setActiveModule }) => {
    const [localizacao, setLocalizacao] = useState("São Paulo, SP - Brasil");

    useEffect(() => {
        const savedGeneral = localStorage.getItem(LOCAL_STORAGE_KEY_GENERAL);
        if (savedGeneral) {
            try {
                const config = JSON.parse(savedGeneral);
                const parts = [];
                if (config.cidade) parts.push(config.cidade);
                if (config.estado) parts.push(config.estado);
                if (config.pais) parts.push(config.pais);
                
                if (parts.length > 0) {
                    setLocalizacao(parts.join(", "));
                }
            } catch (e) {
                console.error("Erro ao carregar localização", e);
            }
        }
    }, []);

    const getCardClass = (chuva: number) => {
        if (chuva > 60) return 'border-l-blue-500'; // chuva
        if (chuva < 20) return 'border-l-yellow-400'; // sol
        return 'border-l-gray-500'; // nublado
    };

    return (
        <div>
            <PageHeader title="🌤️ Clima e Tempo" subtitle={`📍 ${localizacao}`} />
            
            <Card>
                <CardHeader title="📅 PREVISÃO PRÓXIMOS 7 DIAS">
                    <Button variant="secondary" onClick={() => setActiveModule('settings')}>
                        ⚙️ Configurações
                    </Button>
                </CardHeader>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {clima15DiasData.map((dia, index) => (
                        <div key={index} className={`bg-[#242830] p-3 rounded-lg text-center border-l-4 ${getCardClass(dia.chuva)}`}>
                            <p className="font-semibold text-sm">{dia.dia}</p>
                            <p className="text-4xl my-2">{dia.icone}</p>
                            <p className="font-bold text-xl">{dia.max}°</p>
                            <p className="text-sm text-[#a0a5b0]">Min {dia.min}°</p>
                            <p className="text-xs text-blue-400 mt-1">{dia.chuva}% 💧</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <CardHeader title="⏰ INTRADIÁRIO (Próximas Horas)" />
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {climaIntraDiarioData.map((hora, index) => (
                        <div key={index} className="bg-[#242830] p-3 rounded-lg text-center">
                            <p className="font-semibold text-sm">{hora.hora}</p>
                            <p className="text-4xl my-2">{hora.icone}</p>
                            <p className="font-bold text-xl">{hora.temp}°C</p>
                            <p className="text-xs text-blue-400 mt-1">{hora.chuva}% 💧</p>
                        </div>
                    ))}
                </div>
            </Card>

             <Card>
                <CardHeader title="🚨 Alertas Climáticos" />
                <div className="space-y-3">
                    <div className="bg-yellow-500/10 border-l-4 border-yellow-400 p-4 rounded-md">
                        <strong>⚠️ Atenção:</strong> Previsão de chuva intensa para Quarta (13/Nov) - 80% de probabilidade.
                    </div>
                    <div className="bg-green-500/10 border-l-4 border-green-400 p-4 rounded-md">
                         <strong>✅ Bom para trabalho:</strong> Dias 11, 12 e 15 apresentam condições favoráveis.
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Clima;
