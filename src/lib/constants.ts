import { Stage } from './types';

export const PIPELINE_1: Stage[] = [
  {
    id: 'Pendência', nome: 'Pendência',
    cor: 'text-red-500', corBg: 'bg-red-500/15', corBorda: 'border-red-500/60', corHex: '#EF4444',
    slaMinutos: 1440, slaLabel: '24h', pipeline: 1,
    descricao: 'Pacientes pedindo algo (receita, exame, etc.). Resolva aqui mesmo — o card some ao resolver.',
  },
  {
    id: 'Novo Lead', nome: 'Novo Lead',
    cor: 'text-blue-500', corBg: 'bg-blue-500/15', corBorda: 'border-blue-500/60', corHex: '#3B82F6',
    slaMinutos: 0.5, slaLabel: '30 seg', pipeline: 1,
    descricao: 'Primeiro contato recebido via WhatsApp. O Agente IA ainda não iniciou a triagem.',
  },
  {
    id: 'Triagem IA', nome: 'Triagem IA',
    cor: 'text-indigo-500', corBg: 'bg-indigo-500/15', corBorda: 'border-indigo-500/60', corHex: '#6366F1',
    slaMinutos: 10, slaLabel: '10 min', pipeline: 1,
    descricao: 'Agente IA está qualificando o lead — entendendo o problema e o perfil do paciente.',
  },
  {
    id: 'Qualificado', nome: 'Qualificado',
    cor: 'text-violet-500', corBg: 'bg-violet-500/15', corBorda: 'border-violet-500/60', corHex: '#8B5CF6',
    slaMinutos: 1440, slaLabel: '24h', pipeline: 1,
    descricao: 'Lead com interesse real confirmado. Problema identificado e conexão com o Dr. Luiz estabelecida.',
  },
  {
    id: 'Proposta Enviada', nome: 'Proposta Enviada',
    cor: 'text-pink-500', corBg: 'bg-pink-500/15', corBorda: 'border-pink-500/60', corHex: '#EC4899',
    slaMinutos: 1440, slaLabel: '24h', pipeline: 1,
    descricao: 'Valor e condições da consulta apresentados. Aguardando decisão do paciente.',
  },
  {
    id: 'Sinal Pago', nome: 'Sinal Pago',
    cor: 'text-emerald-600', corBg: 'bg-emerald-500/15', corBorda: 'border-emerald-500/60', corHex: '#10B981',
    slaMinutos: 1440, slaLabel: 'Até D-0', pipeline: 1,
    descricao: 'Taxa de reserva paga. Consulta confirmada financeiramente.',
  },
  {
    id: 'Agendado', nome: 'Agendado',
    cor: 'text-orange-500', corBg: 'bg-orange-500/15', corBorda: 'border-orange-500/60', corHex: '#F97316',
    slaMinutos: 10080, slaLabel: 'Até consulta', pipeline: 1,
    descricao: 'Consulta agendada com dia e hora definidos. Aguardando o dia da consulta.',
  },
  {
    id: 'No Show', nome: 'No Show',
    cor: 'text-red-600', corBg: 'bg-red-500/15', corBorda: 'border-red-500/60', corHex: '#EF4444',
    slaMinutos: 60, slaLabel: '1h', pipeline: 1,
    descricao: 'Paciente não compareceu à consulta. Tentativa de reagendamento em andamento.',
  },
  {
    id: 'Reagendamento', nome: 'Reagendamento',
    cor: 'text-amber-600', corBg: 'bg-amber-500/15', corBorda: 'border-amber-500/60', corHex: '#F59E0B',
    slaMinutos: 120, slaLabel: '2h', pipeline: 1,
    descricao: 'Nova data sendo negociada após No Show.',
  },
  {
    id: 'Follow-up', nome: 'Follow-up',
    cor: 'text-purple-500', corBg: 'bg-purple-500/15', corBorda: 'border-purple-500/60', corHex: '#9333EA',
    slaMinutos: 4320, slaLabel: '3 dias', pipeline: 1,
    descricao: 'Lead parou de responder. Agente IA enviando tentativas automáticas de recontato.',
  },
  {
    id: 'Perdido', nome: 'Perdido',
    cor: 'text-gray-500', corBg: 'bg-gray-500/15', corBorda: 'border-gray-500/60', corHex: '#6B7280',
    slaMinutos: 129600, slaLabel: '90 dias', pipeline: 1,
    descricao: 'Lead sem resposta após 4 tentativas. Aguardando reativação em 15 dias.',
  },
  {
    id: 'Reativação', nome: 'Reativação',
    cor: 'text-rose-500', corBg: 'bg-rose-500/15', corBorda: 'border-rose-500/60', corHex: '#F43F5E',
    slaMinutos: 129600, slaLabel: 'Sazonal', pipeline: 1,
    descricao: 'Nova tentativa de contato após 15 dias. Mensagem especial de reengajamento.',
  },
  {
    id: 'Nutrição', nome: 'Nutrição',
    cor: 'text-teal-500', corBg: 'bg-teal-500/15', corBorda: 'border-teal-500/60', corHex: '#14B8A6',
    slaMinutos: 10080, slaLabel: 'Semanal', pipeline: 1,
    descricao: 'Lead recebendo conteúdo semanal automático do Agente IA para manter o relacionamento até estar pronto.',
  },
  {
    id: 'Comercial', nome: 'Comercial',
    cor: 'text-slate-400', corBg: 'bg-slate-500/15', corBorda: 'border-slate-500/60', corHex: '#64748B',
    slaMinutos: 525600, slaLabel: '—', pipeline: 1,
    descricao: 'Contatos comerciais/B2B (fornecedores, parcerias) e não-pacientes. Fora dos fluxos de atendimento — revise e dê o destino manualmente.',
  },
];

export const PIPELINE_2: Stage[] = [
  {
    id: 'Compareceu', nome: 'Compareceu',
    cor: 'text-cyan-600', corBg: 'bg-cyan-500/15', corBorda: 'border-cyan-500/60', corHex: '#06B6D4',
    slaMinutos: 1440, slaLabel: '1 dia', pipeline: 2,
    descricao: 'Paciente compareceu à primeira consulta. Aguardando follow-up pós-consulta do Agente IA.',
  },
  {
    id: 'Pós Consulta', nome: 'Pós Consulta',
    cor: 'text-teal-600', corBg: 'bg-teal-500/15', corBorda: 'border-teal-500/60', corHex: '#14B8A6',
    slaMinutos: 10080, slaLabel: '7 dias', pipeline: 2,
    descricao: 'Agente IA realizando acompanhamento pós-consulta e oferecendo agendamento de retorno.',
  },
  {
    id: 'Agendamento de Retorno', nome: 'Agend. Retorno',
    cor: 'text-violet-500', corBg: 'bg-violet-500/15', corBorda: 'border-violet-500/60', corHex: '#8B5CF6',
    slaMinutos: 120, slaLabel: '2h', pipeline: 2,
    descricao: 'Paciente interessado em retorno. Data sendo definida.',
  },
  {
    id: 'Stand By', nome: 'Stand By',
    cor: 'text-amber-500', corBg: 'bg-amber-500/15', corBorda: 'border-amber-500/60', corHex: '#F59E0B',
    slaMinutos: 525600, slaLabel: '—', pipeline: 2,
    descricao: 'Paciente indeciso — ainda não escolheu a data do reagendamento. Sem cobrança automática. Coloque a possível data de retorno no card; o Dr é lembrado no briefing diário enquanto o paciente estiver aqui.',
  },
  {
    id: 'Retorno Agendado', nome: 'Retorno Agendado',
    cor: 'text-orange-500', corBg: 'bg-orange-500/15', corBorda: 'border-orange-500/60', corHex: '#F97316',
    slaMinutos: 10080, slaLabel: 'Até consulta', pipeline: 2,
    descricao: 'Retorno confirmado com dia e hora. Aguardando a consulta.',
  },
  {
    id: 'Recorrente', nome: 'Recorrente',
    cor: 'text-lime-600', corBg: 'bg-lime-500/15', corBorda: 'border-lime-500/60', corHex: '#84CC16',
    slaMinutos: 43200, slaLabel: 'Mensal', pipeline: 2,
    descricao: 'Paciente fiel que consulta regularmente. Relacionamento consolidado.',
  },
];

export const TODAS_ETAPAS: Stage[] = [...PIPELINE_1, ...PIPELINE_2];

export const ORIGENS = ['Instagram', 'Google', 'WhatsApp', 'Indicação'];
export const PRIORIDADES = ['urgente', 'alta', 'normal', 'frio'];

export const SLA_MINUTOS: Record<string, number> = Object.fromEntries(
  TODAS_ETAPAS.map(e => [e.id, e.slaMinutos])
);

export const TAGS = [
  'obesidade', 'sobrepeso', 'emagrecimento', 'resistencia_insulina', 'diabetes',
  'sindrome_metabolica', 'colesterol_alto', 'triglicerides', 'esteatose_hepatica',
  'hipertensao', 'saude_cardiovascular', 'menopausa', 'climaterio', 'fogachos',
  'tpm', 'sop', 'andropausa', 'baixa_testosterona', 'disfuncao_eretil', 'libido_baixa',
  'disfuncoes_hormonais', 'tireoide', 'equilibrio_hormonal', 'fadiga_cronica',
  'baixa_imunidade', 'inflamacao_cronica', 'deficiencia_vitaminica', 'deficiencia_mineral',
  'anemia', 'sarcopenia', 'nutricao_esportiva', 'performance_fisica', 'disbiose',
  'intestino_irritavel', 'constipacao', 'refluxo', 'gastrite', 'acne_hormonal',
  'queda_cabelo', 'unhas_fracas', 'pele', 'antienvelhecimento', 'longevidade',
  'estresse_oxidativo', 'gestacao', 'pos_parto', 'amamentacao', 'pediatria',
  'idoso', 'protocolo_coimbra', 'autoimune', 'bariatrica', 'saude_cerebral',
];
