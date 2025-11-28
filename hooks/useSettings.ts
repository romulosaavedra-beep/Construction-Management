import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export interface GeneralSettingsData {
    id?: string;
    project_id?: string;
    nomeObra: string;
    empresa: string;
    empresaCNPJ: string;
    cliente: string;
    clienteCNPJ: string;
    cep: string;
    estado: string;
    cidade: string;
    bairro: string;
    logradouro: string;
    numero: string;
    complemento: string;
    scheduleType: string;
    workOnHolidays: boolean;
    impostos: number;
    custosIndiretos: number;
    bdi: number;
    work_schedule?: string;
    half_day_saturday?: boolean;
    half_day_sunday?: boolean;
    custom_holidays?: any[];
}

export const useSettings = (projectId?: string) => {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<GeneralSettingsData>({
        nomeObra: '',
        empresa: '',
        empresaCNPJ: '',
        cliente: '',
        clienteCNPJ: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        impostos: 0,
        custosIndiretos: 0,
        bdi: 0,
        scheduleType: 'mon_fri',
        workOnHolidays: false,
        work_schedule: 'mon-fri',
        half_day_saturday: false,
        half_day_sunday: false,
        custom_holidays: []
    });

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            let data, error;

            if (projectId) {
                const result = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();
                data = result.data;
                error = result.error;
            } else {
                // If no ID provided, try to get the most recently created one
                const result = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                data = result.data;
                error = result.error;
            }

            if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
                throw error;
            }

            if (data) {
                setSettings({
                    id: data.id,
                    nomeObra: data.name,
                    empresa: data.company || '',
                    empresaCNPJ: data.company_cnpj || '',
                    cliente: data.client || '',
                    clienteCNPJ: data.client_cnpj || '',
                    cep: data.address?.cep || '',
                    logradouro: data.address?.logradouro || '',
                    numero: data.address?.numero || '',
                    complemento: data.address?.complemento || '',
                    bairro: data.address?.bairro || '',
                    cidade: data.address?.cidade || '',
                    estado: data.address?.estado || '',
                    impostos: data.settings?.impostos || 0,
                    custosIndiretos: data.settings?.custosIndiretos || 0,
                    bdi: data.settings?.bdi || 0,
                    scheduleType: data.settings?.scheduleType || 'mon_fri',
                    workOnHolidays: data.settings?.workOnHolidays || false,
                    work_schedule: data.work_schedule || 'mon-fri',
                    half_day_saturday: data.half_day_saturday || false,
                    half_day_sunday: data.half_day_sunday || false,
                    custom_holidays: data.custom_holidays || []
                });
            } else {
                // Reset to defaults if no project found
                setSettings({
                    nomeObra: '',
                    empresa: '',
                    empresaCNPJ: '',
                    cliente: '',
                    clienteCNPJ: '',
                    cep: '',
                    logradouro: '',
                    numero: '',
                    complemento: '',
                    bairro: '',
                    cidade: '',
                    estado: '',
                    impostos: 0,
                    custosIndiretos: 0,
                    bdi: 0,
                    scheduleType: 'mon_fri',
                    workOnHolidays: false,
                    work_schedule: 'mon-fri',
                    half_day_saturday: false,
                    half_day_sunday: false,
                    custom_holidays: []
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Erro ao carregar configurações.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const saveSettings = async (newSettings: GeneralSettingsData) => {
        try {
            const projectData = {
                name: newSettings.nomeObra,
                company: newSettings.empresa,
                company_cnpj: newSettings.empresaCNPJ,
                client: newSettings.cliente,
                client_cnpj: newSettings.clienteCNPJ,
                address: {
                    cep: newSettings.cep,
                    logradouro: newSettings.logradouro,
                    numero: newSettings.numero,
                    complemento: newSettings.complemento,
                    bairro: newSettings.bairro,
                    cidade: newSettings.cidade,
                    estado: newSettings.estado
                },
                settings: {
                    impostos: newSettings.impostos,
                    custosIndiretos: newSettings.custosIndiretos,
                    bdi: newSettings.bdi,
                    scheduleType: newSettings.scheduleType,
                    workOnHolidays: newSettings.workOnHolidays
                },
                work_schedule: newSettings.work_schedule,
                half_day_saturday: newSettings.half_day_saturday,
                half_day_sunday: newSettings.half_day_sunday,
                custom_holidays: newSettings.custom_holidays,
                state: newSettings.estado,
                city: newSettings.cidade
            };

            if (newSettings.id) {
                const { error } = await supabase
                    .from('projects')
                    .update(projectData)
                    .eq('id', newSettings.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('projects')
                    .insert([projectData])
                    .select()
                    .single();
                if (error) throw error;
                if (data) {
                    setSettings(prev => ({ ...prev, id: data.id }));
                }
            }

            setSettings(newSettings);
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Erro ao salvar configurações.');
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return {
        settings,
        loading,
        saveSettings,
        setSettings // Exposed for local updates before saving
    };
};
