export type Prioridade = 'urgente' | 'alta' | 'normal' | 'frio';
export type Origem = 'Instagram' | 'Google' | 'WhatsApp' | 'Indicação';
export type SLAStatus = 'ok' | 'atencao' | 'atrasado';
export type MovidoPor = 'humano' | 'n8n';

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  procedimento: string;
  prioridade: Prioridade;
  etapa_atual: string;
  pipeline_id: number;
  valor_consulta: number;
  nota: string;
  chatwoot_url: string;
  movido_por_ia: boolean;
  data_entrada: string;
  data_atualizacao: string;
  sla_vencimento: string | null;
  // Dados pessoais
  email?: string | null;
  data_nascimento?: string | null;
  idade?: number | null;
  sexo?: string | null;
  genero?: string | null;
  estado_civil?: string | null;
  cpf?: string | null;
  rg?: string | null;
  // Endereço
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cep?: string | null;
  estado?: string | null;
  cidade?: string | null;
  // Perfil clínico
  profissao?: string | null;
  foi_indicacao?: boolean;
  como_conheceu?: string | null;
  tags?: string[];
  total_investido?: number;
  numero_consultas?: number;
  followup_tentativas?: number;
  ultima_mensagem?: string | null;
  // Próximo agendamento (consulta/retorno/procedimento AGENDADO no clinica_ia, sincronizado com o Google).
  // Preenchido no CRM ao mesclar /api/agendamentos; some sozinho quando não há consulta futura.
  agendamento?: { data_br: string; hora_br: string; tipo: string; consulta_id?: string } | null;
}

export interface HistoricoMovimentacao {
  id: string;
  lead_id: string;
  etapa_origem: string | null;
  etapa_destino: string;
  motivo: string;
  movido_por: MovidoPor;
  criado_em: string;
}

export interface Nota {
  id: string;
  lead_id: string;
  conteudo: string;
  autor: string;
  criado_em: string;
}

export interface Stage {
  id: string;
  nome: string;
  cor: string;
  corBg: string;
  corBorda: string;
  corHex: string;
  slaMinutos: number;
  slaLabel: string;
  pipeline: 1 | 2;
  descricao?: string;
}

export interface Pendencia {
  id: string;
  paciente_nome: string;
  paciente_telefone: string;
  tipo: string;
  descricao: string;
  chatwoot_conversation_id: number | null;
  status: 'pendente' | 'resolvido';
  created_at: string;
  resolved_at: string | null;
}

export interface Financeiro {
  id: string;
  lead_id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_registro: string;
}

export interface ConteudoNutricao {
  id: string;
  titulo: string;
  conteudo: string;
  tags: string[];
  semana: number;
  ativo: boolean;
  created_at: string;
}

export interface Descadastrado {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  descadastrado_at: string | null;
  created_at: string;
}

export interface Retorno {
  id: string;
  paciente_id: string | null;
  paciente_nome: string;
  paciente_telefone: string;
  consulta_id: string | null;
  status: 'pendente' | 'agendado' | 'reativado';
  data_retorno: string | null;
  contato_pos_consulta_at: string | null;
  contato_40dias_at: string | null;
  contato_30dias_at: string | null;
  contato_10dias_at: string | null;
  agendou_retorno: boolean;
  crm_card_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}
