import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, SLAStatus, Stage } from './types';
import { ETAPAS } from './constants';

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
  return ETAPAS.find(e => e.id === etapaId);
}

export function calcSLAStatus(lead: Lead): SLAStatus {
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
  const etapa = ETAPAS.find(e => e.id === etapaId);
  const slaMs = (etapa?.slaMinutos ?? 60) * 60 * 1000;
  return new Date(Date.now() + slaMs);
}

export function getPrioridadeCor(prioridade: string): string {
  switch (prioridade) {
    case 'urgente': return 'text-red-500';
    case 'alta':    return 'text-orange-500';
    case 'normal':  return 'text-green-500';
    case 'frio':    return 'text-gray-400';
    default:        return 'text-gray-400';
  }
}

export function getPrioridadeBg(prioridade: string): string {
  switch (prioridade) {
    case 'urgente': return 'bg-red-500/20 border-red-500/40';
    case 'alta':    return 'bg-orange-500/20 border-orange-500/40';
    case 'normal':  return 'bg-green-500/20 border-green-500/40';
    case 'frio':    return 'bg-gray-500/20 border-gray-500/40';
    default:        return 'bg-gray-500/20 border-gray-500/40';
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
