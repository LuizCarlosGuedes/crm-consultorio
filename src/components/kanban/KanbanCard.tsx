'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Phone, Tag } from 'lucide-react';
import { Lead } from '@/lib/types';
import {
  calcSLAStatus, formatarTempoRelativo, formatarMoeda,
  getOrigemIcon, calcularIdade, formatarTag, getEtapa, cn,
} from '@/lib/utils';

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isOverlay?: boolean;
}

const PRIORIDADE_LABEL: Record<string, string> = {
  urgente: 'URGENTE',
  alta:    'ALTA',
  normal:  'Normal',
  frio:    'Frio',
};

/* Cores dos badges de prioridade (light mode) */
const PRIO_BADGE: Record<string, string> = {
  urgente: 'bg-red-100    text-red-700    border border-red-300    dark:bg-red-900/40    dark:text-red-400    dark:border-red-700',
  alta:    'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700',
  normal:  'bg-green-100  text-green-700  border border-green-300  dark:bg-green-900/40  dark:text-green-400  dark:border-green-700',
  frio:    'bg-slate-100  text-slate-600  border border-slate-300  dark:bg-slate-800     dark:text-slate-400  dark:border-slate-600',
};

export function KanbanCard({ lead, onClick, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const slaStatus = calcSLAStatus(lead);
  const etapa     = getEtapa(lead.etapa_atual);
  const idade     = calcularIdade(lead.data_nascimento);

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    borderLeft: `4px solid ${etapa?.corHex ?? '#3f4e68'}`,
  };

  const infoDataPessoal = [
    idade !== null ? `${idade} anos` : null,
    lead.sexo
      ? (lead.sexo === 'M' ? 'Masc.' : lead.sexo === 'F' ? 'Fem.' : lead.sexo)
      : null,
    lead.estado_civil ?? null,
  ].filter(Boolean).join(' · ');

  const tagsMostrar = (lead.tags ?? []).slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-lg cursor-pointer select-none transition-all duration-150',
        'bg-white dark:bg-card',
        'border border-brand-gray/60 dark:border-[#3f4e68]',
        'hover:shadow-md hover:border-brand-gold/60',
        isDragging && 'opacity-40',
        isOverlay  && 'shadow-2xl rotate-1 scale-105',
        lead.prioridade === 'urgente' && !isOverlay && 'animate-urgente',
      )}
      onClick={() => onClick(lead)}
    >
      <div className="px-3 pt-2.5 pb-2 space-y-1.5">

        {/* ── Header: origem + nome + prioridade ───────── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[11px] flex-shrink-0">{getOrigemIcon(lead.origem)}</span>
            <p className="font-semibold text-[13px] leading-tight line-clamp-1 flex-1 text-foreground">
              {lead.nome}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.movido_por_ia && (
              <span className="px-1 py-0.5 rounded text-[9px] font-bold leading-none border bg-brand-navy/10 text-brand-navy border-brand-navy/30 dark:bg-brand-slate/20 dark:text-brand-gray dark:border-brand-slate/40">
                IA
              </span>
            )}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-bold leading-none',
                PRIO_BADGE[lead.prioridade] ?? PRIO_BADGE.frio,
                lead.prioridade === 'urgente' && 'animate-sla-pulse',
              )}
            >
              {PRIORIDADE_LABEL[lead.prioridade] ?? lead.prioridade}
            </span>
          </div>
        </div>

        {/* ── Telefone ─────────────────────────────────── */}
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="text-[11px] font-mono text-muted-foreground">{lead.telefone}</span>
        </div>

        {/* ── Dados pessoais ───────────────────────────── */}
        {infoDataPessoal && (
          <p className="text-[10px] text-muted-foreground">🎂 {infoDataPessoal}</p>
        )}

        {/* ── Tags clínicas ────────────────────────────── */}
        {tagsMostrar.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />
            {tagsMostrar.map(t => (
              <span
                key={t}
                className="text-[9px] rounded px-1 py-0.5 leading-none border bg-brand-cream dark:bg-brand-slate/20 text-muted-foreground border-brand-gray/40"
              >
                {formatarTag(t)}
              </span>
            ))}
            {(lead.tags?.length ?? 0) > 3 && (
              <span className="text-[9px] text-muted-foreground">
                +{(lead.tags?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}

        {/* ── Total investido ──────────────────────────── */}
        {(lead.total_investido ?? 0) > 0 && (
          <p className="text-[10px] font-semibold text-brand-gold">
            💰 Investido: {formatarMoeda(lead.total_investido ?? 0)}
          </p>
        )}

        {/* ── Nota / última mensagem ───────────────────── */}
        {lead.nota && (
          <p className="text-[10px] italic line-clamp-2 text-muted-foreground bg-brand-cream/60 dark:bg-brand-slate/10 border border-brand-gray/30 rounded px-1.5 py-1">
            💬 {lead.nota}
          </p>
        )}

        {/* ── Footer: tempo + SLA + chatwoot ───────────── */}
        <div className="flex items-center justify-between pt-1 border-t border-brand-gray/40 dark:border-[#3f4e68]/40">
          <div className="flex items-center gap-1.5">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
              'bg-emerald-500':               slaStatus === 'ok',
              'bg-yellow-500':                slaStatus === 'atencao',
              'bg-red-500 animate-sla-pulse': slaStatus === 'atrasado',
            })} />
            <span className="text-[10px] text-muted-foreground">
              {formatarTempoRelativo(lead.data_entrada)}
            </span>
            {slaStatus === 'atrasado' && (
              <span className="text-[9px] font-black text-brand-gold animate-sla-pulse">SLA!</span>
            )}
            {slaStatus === 'atencao' && (
              <span className="text-[9px] font-bold text-yellow-500">⚠️</span>
            )}
          </div>

          {lead.chatwoot_url && (
            <button
              onClick={e => { e.stopPropagation(); window.open(lead.chatwoot_url, '_blank'); }}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors bg-brand-gold/10 hover:bg-brand-gold/25 text-brand-gold"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
