'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Clock, Phone, Stethoscope, AlertTriangle } from 'lucide-react';
import { Lead } from '@/lib/types';
import {
  calcSLAStatus,
  formatarTempoRelativo,
  formatarMoeda,
  getPrioridadeBg,
  getPrioridadeCor,
  getOrigemIcon,
  cn,
} from '@/lib/utils';

interface KanbanCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  isOverlay?: boolean;
}

const PRIORIDADE_LABEL: Record<string, string> = {
  urgente: 'URGENTE',
  alta: 'ALTA',
  normal: 'Normal',
  frio: 'Frio',
};

export function KanbanCard({ lead, onClick, isOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const slaStatus = calcSLAStatus(lead);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardClass = cn(
    'group relative rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer select-none',
    'hover:shadow-md hover:border-primary/40 transition-all duration-150',
    isDragging && 'opacity-40',
    isOverlay && 'drag-overlay shadow-2xl rotate-1',
    lead.prioridade === 'urgente' && !isOverlay && 'animate-urgente',
    getPrioridadeBg(lead.prioridade)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cardClass}
      onClick={() => onClick(lead)}
    >
      {/* Priority stripe */}
      <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', {
        'bg-red-500':    lead.prioridade === 'urgente',
        'bg-orange-500': lead.prioridade === 'alta',
        'bg-green-500':  lead.prioridade === 'normal',
        'bg-gray-500':   lead.prioridade === 'frio',
      })} />

      <div className="pl-3 pr-2 py-2.5 space-y-2">
        {/* Header: name + badges */}
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
            {lead.nome}
          </p>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {lead.movido_por_ia && (
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold leading-none">
                AUTO
              </span>
            )}
            {slaStatus === 'atrasado' && (
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[9px] font-bold leading-none animate-sla-pulse">
                SLA!
              </span>
            )}
          </div>
        </div>

        {/* Priority & origin */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-bold', getPrioridadeCor(lead.prioridade),
            lead.prioridade === 'urgente' && 'animate-sla-pulse'
          )}>
            {PRIORIDADE_LABEL[lead.prioridade]}
          </span>
          <span className="text-muted-foreground text-[10px]">·</span>
          <span className="text-[10px] text-muted-foreground">
            {getOrigemIcon(lead.origem)} {lead.origem}
          </span>
        </div>

        {/* Procedure */}
        {lead.procedimento && (
          <div className="flex items-center gap-1">
            <Stethoscope className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground line-clamp-1">{lead.procedimento}</span>
          </div>
        )}

        {/* Phone */}
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[11px] text-foreground/80 font-mono">{lead.telefone}</span>
        </div>

        {/* Note preview */}
        {lead.nota && (
          <p className="text-[10px] text-muted-foreground italic line-clamp-2 bg-muted/50 rounded px-1.5 py-1">
            {lead.nota}
          </p>
        )}

        {/* Footer: SLA + value + actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
              'bg-green-500':                     slaStatus === 'ok',
              'bg-yellow-500':                    slaStatus === 'atencao',
              'bg-red-500 animate-sla-pulse':     slaStatus === 'atrasado',
            })} />
            <span className="text-[9px] text-muted-foreground">
              {formatarTempoRelativo(lead.data_entrada)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {lead.valor_consulta > 0 && (
              <span className="text-[10px] font-semibold text-emerald-500">
                {formatarMoeda(lead.valor_consulta)}
              </span>
            )}
            {lead.chatwoot_url && (
              <button
                onClick={e => { e.stopPropagation(); window.open(lead.chatwoot_url, '_blank'); }}
                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[9px] font-medium transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                Chatwoot
              </button>
            )}
          </div>
        </div>

        {/* SLA warning message */}
        {slaStatus === 'atencao' && (
          <div className="flex items-center gap-1 text-[9px] text-yellow-500">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>SLA próximo do limite</span>
          </div>
        )}
      </div>
    </div>
  );
}
