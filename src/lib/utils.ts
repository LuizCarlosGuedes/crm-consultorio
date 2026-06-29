import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, SLAStatus, Stage } from './types';
import { TODAS_ETAPAS } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarData(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatarDataCurta(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatarTempoRelativo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function getEtapa(etapaId: string): Stage | undefined {
  return TODAS_ETAPAS.find(e => e.id === etapaId);
}

// "Eu cuido": marca (tag) que o Dr coloca quando está conduzindo o caso na mão
// (ex.: cortesia/agendamento especial). Pausa o alarme de SLA — nada de piscar à toa.
export const TAG_EU_CUIDO = 'Eu cuido';
export function isSLAPausado(lead: Lead): boolean {
  return (lead.tags ?? []).some(t => t.trim().toLowerCase() === TAG_EU_CUIDO.toLowerCase());
}

// "Comercial": marca que a Nathalia aplica quando o contato é comercial/B2B (não-paciente).
export const TAG_COMERCIAL = 'Comercial';
export function isComercial(lead: Lead): boolean {
  return (lead.tags ?? []).some(t => t.trim().toLowerCase() === TAG_COMERCIAL.toLowerCase());
}

// Tags "internas" (têm renderização própria) → não aparecem na lista normal de chips.
export function ehTagInterna(t: string): boolean {
  const x = t.trim().toLowerCase();
  return x === TAG_EU_CUIDO.toLowerCase() || x === TAG_COMERCIAL.toLowerCase();
}

export function calcSLAStatus(lead: Lead): SLAStatus {
  // Dr conduzindo na mão → sem alarme de SLA.
  if (isSLAPausado(lead)) return 'ok';
  // Etapas terminais (lead já resolvido): não faz sentido SLA "atrasado" piscando.
  if (['Agendado', 'Perdido', 'Pós Consulta'].includes(lead.etapa_atual)) return 'ok';
  if (!lead.sla_vencimento) return 'ok';

  const now = Date.now();
  const vencimento = new Date(lead.sla_vencimento).getTime();

  if (vencimento < now) return 'atrasado';

  const etapa = getEtapa(lead.etapa_atual);
  const slaMs = (etapa?.slaMinutos ?? 60) * 60 * 1000;
  const remaining = vencimento - now;
  const percentRemaining = remaining / slaMs;

  if (percentRemaining < 0.2) return 'atencao';
  return 'ok';
}

export function calcSLAVencimento(etapaId: string): Date {
  const etapa = TODAS_ETAPAS.find(e => e.id === etapaId);
  const slaMs = (etapa?.slaMinutos ?? 60) * 60 * 1000;
  return new Date(Date.now() + slaMs);
}

export function calcularIdade(dataNascimento: string | null | undefined): number | null {
  if (!dataNascimento) return null;
  try {
    const hoje = new Date();
    const nasc = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? idade : null;
  } catch {
    return null;
  }
}

export function getPrioridadeCor(prioridade: string): string {
  switch (prioridade) {
    case 'urgente': return 'text-red-600';
    case 'alta':    return 'text-orange-600';
    case 'normal':  return 'text-emerald-600';
    case 'frio':    return 'text-slate-500';
    default:        return 'text-slate-500';
  }
}

export function getPrioridadeBadge(prioridade: string): string {
  switch (prioridade) {
    case 'urgente': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40';
    case 'alta':    return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/40';
    case 'normal':  return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40';
    case 'frio':    return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/40';
    default:        return 'bg-slate-100 text-slate-600 border-slate-300';
  }
}

export function getPrioridadeBg(prioridade: string): string {
  switch (prioridade) {
    case 'urgente': return 'bg-red-500/10 border-red-500/30';
    case 'alta':    return 'bg-orange-500/10 border-orange-500/30';
    case 'normal':  return 'bg-emerald-500/10 border-emerald-500/30';
    case 'frio':    return 'bg-slate-500/10 border-slate-500/30';
    default:        return 'bg-slate-500/10 border-slate-500/30';
  }
}

export function getOrigemIcon(origem: string): string {
  switch (origem) {
    case 'Instagram': return '📸';
    case 'Google':    return '🔍';
    case 'WhatsApp':  return '💬';
    case 'Indicação': return '👥';
    default:          return '📋';
  }
}

export function formatarTag(tag: string): string {
  return tag.replace(/_/g, ' ');
}

export function diasNaEtapa(lead: Lead): number {
  try {
    // A entrada na etapa é reconstruída a partir do sla_vencimento — gravado como
    // (entrada_na_etapa + SLA) SOMENTE quando a etapa muda de verdade. Assim o
    // "tempo na coluna" não zera a cada interação (era o bug de usar data_atualizacao,
    // que muda em QUALQUER update do card). Fallback: data_entrada (lead recém-criado).
    const etapa  = getEtapa(lead.etapa_atual);
    const slaMs  = (etapa?.slaMinutos ?? 60) * 60 * 1000;
    const baseMs = lead.sla_vencimento
      ? new Date(lead.sla_vencimento).getTime() - slaMs
      : new Date(lead.data_entrada).getTime();
    const ms = Date.now() - baseMs;
    return Math.max(0, Math.floor(ms / 86400000));
  } catch {
    return 0;
  }
}
