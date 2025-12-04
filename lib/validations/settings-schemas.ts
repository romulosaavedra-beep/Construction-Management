import { z } from 'zod';

// ============================================
// VALIDAÇÕES AUXILIARES
// ============================================

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;

// ============================================
// SCHEMA: CONFIGURAÇÕES GERAIS
// ============================================

export const generalSettingsSchema = z.object({
    project_name: z.string()
        .min(3, 'O nome do projeto deve ter no mínimo 3 caracteres')
        .max(100, 'O nome do projeto deve ter no máximo 100 caracteres'),

    company_name: z.string()
        .min(3, 'O nome da empresa deve ter no mínimo 3 caracteres')
        .max(200, 'O nome da empresa deve ter no máximo 200 caracteres'),

    cnpj: z.string()
        .regex(cnpjRegex, 'CNPJ deve estar no formato 00.000.000/0000-00')
        .optional()
        .or(z.literal('')),

    project_code: z.string()
        .max(50, 'Código do projeto muito longo')
        .optional()
        .or(z.literal('')),

    start_date: z.coerce.date()
        .refine((date) => date !== undefined, {
            message: 'Data de início é obrigatória',
        }),

    end_date: z.coerce.date()
        .optional()
        .nullable(),

    default_currency: z.enum(['BRL', 'USD', 'EUR'], {
        message: 'Moeda deve ser BRL, USD ou EUR',
    }).default('BRL'),

    description: z.string()
        .max(500, 'Descrição muito longa')
        .optional()
        .or(z.literal('')),
})
    .refine(
        (data) => {
            if (data.end_date && data.start_date) {
                return data.end_date >= data.start_date;
            }
            return true;
        },
        {
            message: 'Data de término deve ser posterior à data de início',
            path: ['end_date'],
        }
    );

// ============================================
// SCHEMA: PROFISSIONAIS
// ============================================

export const professionalSchema = z.object({
    name: z.string()
        .min(3, 'Nome deve ter no mínimo 3 caracteres')
        .max(200, 'Nome muito longo'),

    email: z.string()
        .email('Email inválido')
        .optional()
        .or(z.literal('')),

    phone: z.string()
        .regex(phoneRegex, 'Telefone deve estar no formato (00) 00000-0000')
        .optional()
        .or(z.literal('')),

    role: z.string()
        .min(2, 'Função é obrigatória')
        .max(100, 'Nome da função muito longo'),

    cost_per_hour: z.coerce.number()
        .min(0, 'Custo por hora deve ser positivo')
        .optional()
        .nullable(),

    active: z.boolean().default(true),

    cpf: z.string()
        .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00')
        .optional()
        .or(z.literal('')),

    registration: z.string()
        .max(50, 'Matrícula muito longa')
        .optional()
        .or(z.literal('')),
});

// ============================================
// SCHEMA: FORNECEDORES
// ============================================

export const supplierSchema = z.object({
    name: z.string()
        .min(3, 'Nome deve ter no mínimo 3 caracteres')
        .max(200, 'Nome muito longo'),

    cnpj: z.string()
        .regex(cnpjRegex, 'CNPJ deve estar no formato 00.000.000/0000-00')
        .optional()
        .or(z.literal('')),

    email: z.string()
        .email('Email inválido')
        .optional()
        .or(z.literal('')),

    phone: z.string()
        .regex(phoneRegex, 'Telefone deve estar no formato (00) 00000-0000')
        .optional()
        .or(z.literal('')),

    address: z.string()
        .max(300, 'Endereço muito longo')
        .optional()
        .or(z.literal('')),

    category: z.enum(['material', 'servico', 'equipamento', 'misto'], {
        message: 'Categoria deve ser: material, serviço, equipamento ou misto',
    }),

    payment_terms: z.string()
        .max(200, 'Condições de pagamento muito longas')
        .optional()
        .or(z.literal('')),

    active: z.boolean().default(true),

    contact_person: z.string()
        .max(200, 'Nome do contato muito longo')
        .optional()
        .or(z.literal('')),
});

// ============================================
// SCHEMA: UNIDADES DE MEDIDA
// ============================================

export const unitSchema = z.object({
    code: z.string()
        .min(1, 'Código é obrigatório')
        .max(10, 'Código deve ter no máximo 10 caracteres')
        .regex(/^[A-Z0-9]+$/, 'Código deve conter apenas letras maiúsculas e números'),

    description: z.string()
        .min(3, 'Descrição é obrigatória')
        .max(100, 'Descrição muito longa'),

    type: z.enum(['comprimento', 'area', 'volume', 'peso', 'unidade', 'tempo'], {
        message: 'Tipo deve ser: comprimento, área, volume, peso, unidade ou tempo',
    }),

    abbreviation: z.string()
        .max(5, 'Abreviação muito longa')
        .optional()
        .or(z.literal('')),
});

// ============================================
// SCHEMA: RECURSOS
// ============================================

export const resourceSchema = z.object({
    code: z.string()
        .min(1, 'Código é obrigatório')
        .max(20, 'Código deve ter no máximo 20 caracteres'),

    description: z.string()
        .min(3, 'Descrição é obrigatória')
        .max(300, 'Descrição muito longa'),

    unit_id: z.string()
        .uuid('ID de unidade inválido'),

    unit_cost: z.coerce.number()
        .min(0, 'Custo unitário deve ser positivo'),

    category: z.enum(['material', 'mao_obra', 'equipamento'], {
        message: 'Categoria deve ser: material, mão de obra ou equipamento',
    }),

    supplier_id: z.string()
        .uuid('ID de fornecedor inválido')
        .optional()
        .nullable(),

    active: z.boolean().default(true),

    notes: z.string()
        .max(500, 'Observações muito longas')
        .optional()
        .or(z.literal('')),
});

// ============================================
// SCHEMA: CALENDÁRIO (FERIADOS)
// ============================================

export const holidaySchema = z.object({
    date: z.coerce.date()
        .refine((date) => date !== undefined, {
            message: 'Data é obrigatória',
        }),

    name: z.string()
        .min(3, 'Nome do feriado é obrigatório')
        .max(100, 'Nome muito longo'),

    type: z.enum(['nacional', 'estadual', 'municipal', 'ponte'], {
        message: 'Tipo deve ser: nacional, estadual, municipal ou ponte',
    }),

    recurring: z.boolean().default(false),
});

// ============================================
// TYPES EXPORTADOS
// ============================================

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;
export type ProfessionalFormData = z.infer<typeof professionalSchema>;
export type SupplierFormData = z.infer<typeof supplierSchema>;
export type UnitFormData = z.infer<typeof unitSchema>;
export type ResourceFormData = z.infer<typeof resourceSchema>;
export type HolidayFormData = z.infer<typeof holidaySchema>;
