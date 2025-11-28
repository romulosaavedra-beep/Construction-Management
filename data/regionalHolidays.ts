// Feriados Estaduais (Data Magna e outros fixos)
export const STATE_HOLIDAYS: Record<string, { date: string; name: string }[]> = {
    'AC': [{ date: '01-20', name: 'Dia do Católico' }, { date: '06-15', name: 'Aniversário do Estado' }, { date: '09-05', name: 'Dia da Amazônia' }],
    'AL': [{ date: '06-24', name: 'São João' }, { date: '06-29', name: 'São Pedro' }, { date: '09-16', name: 'Emancipação Política' }, { date: '11-20', name: 'Dia da Consciência Negra' }],
    'AP': [{ date: '03-19', name: 'Dia de São José' }, { date: '09-13', name: 'Criação do Estado' }],
    'AM': [{ date: '09-05', name: 'Elevação do Amazonas à Categoria de Província' }, { date: '11-20', name: 'Dia da Consciência Negra' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'BA': [{ date: '07-02', name: 'Independência da Bahia' }],
    'CE': [{ date: '03-19', name: 'Dia de São José' }, { date: '03-25', name: 'Data Magna do Ceará' }],
    'DF': [{ date: '04-21', name: 'Fundação de Brasília' }, { date: '11-30', name: 'Dia do Evangélico' }],
    'ES': [], // Data Magna é móvel (Nossa Senhora da Penha) - tratada via lógica ou manual por enquanto, ou aproximada
    'GO': [], // Não possui feriados estaduais fixos por lei abrangente, geralmente pontos facultativos
    'MA': [{ date: '07-28', name: 'Adesão do Maranhão à Independência' }],
    'MT': [{ date: '11-20', name: 'Dia da Consciência Negra' }],
    'MS': [{ date: '10-11', name: 'Criação do Estado' }],
    'MG': [{ date: '04-21', name: 'Data Magna de Minas Gerais' }],
    'PA': [{ date: '08-15', name: 'Adesão do Grão-Pará' }],
    'PB': [{ date: '08-05', name: 'Fundação da Paraíba' }],
    'PR': [], // Sem feriados estaduais fixos amplos
    'PE': [{ date: '03-06', name: 'Data Magna de Pernambuco' }, { date: '06-24', name: 'São João' }],
    'PI': [{ date: '10-19', name: 'Dia do Piauí' }],
    'RJ': [{ date: '04-23', name: 'Dia de São Jorge' }, { date: '11-20', name: 'Dia da Consciência Negra' }],
    'RN': [{ date: '10-03', name: 'Mártires de Cunhaú e Uruaçu' }],
    'RS': [{ date: '09-20', name: 'Revolução Farroupilha' }],
    'RO': [{ date: '01-04', name: 'Criação do Estado' }, { date: '06-18', name: 'Dia do Evangélico' }],
    'RR': [{ date: '10-05', name: 'Criação do Estado' }],
    'SC': [], // Data Magna (11 de agosto) geralmente transferida para domingo
    'SP': [{ date: '07-09', name: 'Revolução Constitucionalista' }, { date: '11-20', name: 'Dia da Consciência Negra' }],
    'SE': [{ date: '07-08', name: 'Emancipação Política' }],
    'TO': [{ date: '09-08', name: 'Nossa Senhora da Natividade' }, { date: '10-05', name: 'Criação do Estado' }],
};

// Feriados Municipais das Capitais (Aniversário e Padroeira/Outros fixos)
// Formato da chave: "Nome da Cidade-UF"
export const MUNICIPAL_HOLIDAYS: Record<string, { date: string; name: string }[]> = {
    'Rio Branco-AC': [{ date: '12-28', name: 'Aniversário de Rio Branco' }],
    'Maceió-AL': [{ date: '08-27', name: 'Nossa Senhora dos Prazeres' }, { date: '12-05', name: 'Aniversário de Maceió' }],
    'Macapá-AP': [{ date: '02-04', name: 'Aniversário de Macapá' }, { date: '03-19', name: 'Dia de São José' }],
    'Manaus-AM': [{ date: '10-24', name: 'Aniversário de Manaus' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Salvador-BA': [{ date: '03-29', name: 'Aniversário de Salvador' }, { date: '06-24', name: 'São João' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Fortaleza-CE': [{ date: '04-13', name: 'Aniversário de Fortaleza' }, { date: '08-15', name: 'Nossa Senhora da Assunção' }],
    'Brasília-DF': [{ date: '04-21', name: 'Fundação de Brasília' }], // Coincide com Tiradentes
    'Vitória-ES': [{ date: '09-08', name: 'Aniversário de Vitória / N. Sra. da Vitória' }],
    'Goiânia-GO': [{ date: '05-24', name: 'Nossa Senhora Auxiliadora' }, { date: '10-24', name: 'Aniversário de Goiânia' }],
    'São Luís-MA': [{ date: '09-08', name: 'Aniversário de São Luís' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Cuiabá-MT': [{ date: '04-08', name: 'Aniversário de Cuiabá' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Campo Grande-MS': [{ date: '06-13', name: 'Santo Antônio' }, { date: '08-26', name: 'Aniversário de Campo Grande' }],
    'Belo Horizonte-MG': [{ date: '08-15', name: 'Assunção de Nossa Senhora' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }, { date: '12-12', name: 'Aniversário de Belo Horizonte' }],
    'Belém-PA': [{ date: '01-12', name: 'Aniversário de Belém' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'João Pessoa-PB': [{ date: '08-05', name: 'Nossa Senhora das Neves / Aniversário' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Curitiba-PR': [{ date: '09-08', name: 'Nossa Senhora da Luz dos Pinhais' }],
    'Recife-PE': [{ date: '07-16', name: 'Nossa Senhora do Carmo' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Teresina-PI': [{ date: '08-16', name: 'Aniversário de Teresina' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Rio de Janeiro-RJ': [{ date: '01-20', name: 'São Sebastião' }, { date: '03-01', name: 'Aniversário do Rio' }], // Aniversário nem sempre é feriado, mas S. Sebastião é
    'Natal-RN': [{ date: '01-06', name: 'Santos Reis' }, { date: '11-21', name: 'Nossa Senhora da Apresentação' }],
    'Porto Alegre-RS': [{ date: '02-02', name: 'Nossa Senhora dos Navegantes' }],
    'Porto Velho-RO': [{ date: '01-24', name: 'Instalação do Município' }, { date: '10-02', name: 'Criação do Município' }],
    'Boa Vista-RR': [{ date: '07-09', name: 'Aniversário de Boa Vista' }],
    'Florianópolis-SC': [{ date: '03-23', name: 'Aniversário de Florianópolis' }],
    'São Paulo-SP': [{ date: '01-25', name: 'Aniversário de São Paulo' }, { date: '11-20', name: 'Consciência Negra' }],
    'Aracaju-SE': [{ date: '03-17', name: 'Aniversário de Aracaju' }, { date: '12-08', name: 'Nossa Senhora da Conceição' }],
    'Palmas-TO': [{ date: '03-19', name: 'São José' }, { date: '05-20', name: 'Aniversário de Palmas' }],
};
