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
  valor_consulta: number;
  nota: string;
  chatwoot_url: string;
  movido_por_ia: boolean;
  data_entrada: string;
  data_atualizacao: string;
  sla_vencimento: string | null;
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
