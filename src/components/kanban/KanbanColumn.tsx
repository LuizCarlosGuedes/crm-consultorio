'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Stage, Lead } from '@/lib/types';
import { KanbanCard } from './KanbanCard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: Stage;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onPacienteConsultou?: (lead: Lead) => Promise<void>;
  onQuickNota?: (lead: Lead, nota: string) => Promise<void>;
}

export function KanbanColumn({ stage, leads, onCardClick, onPacienteConsultou, onQuickNota }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const slaAtrasados = leads.filter(l => {
    if (!l.sla_vencimento) return false;
    return new Date(l.sla_vencimento).getTime() < Date.now();
  }).length;

  return (
    <div className="flex flex-col flex-shrink-0 w-[280px]">
      {/* ── Column header ─────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-lg"
        style={{
          backgroundColor: '#0b1a35',
          borderTop:   `6px solid ${stage.corHex}`,
          borderLeft:  `1px solid ${stage.corHex}55`,
          borderRight: `1px solid ${stage.corHex}55`,
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Stage name */}
          <span
            className="font-bold text-[11px] truncate tracking-wide uppercase"
            style={{ color: '#f7f6f4' }}
          >
            {stage.nome}
          </span>

          {/* Count badge */}
          <span
            className="text-[10px] font-black rounded-full px-1.5 py-0.5 flex-shrink-0 leading-none"
            style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}
          >
            {leads.length}
          </span>

          {/* Help tooltip */}
          {stage.descricao && (
            <InfoTooltip text={stage.descricao} side="bottom" />
          )}

          {/* SLA alerts badge */}
          {slaAtrasados > 0 && (
            <span className="text-[9px] font-bold text-red-400 animate-sla-pulse flex-shrink-0">
              ⚠️{slaAtrasados}
            </span>
          )}
        </div>

        {/* SLA label */}
        <span className="text-[12px] flex-shrink-0 ml-1 font-mono" style={{ color: '#e0e0e0' }}>
          {stage.slaLabel}
        </span>
      </div>

      {/* ── Cards area ─────────────────────────────────── */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto rounded-b-lg border border-t-0 transition-colors duration-150',
          'min-h-[100px] max-h-[calc(100vh-180px)]'
        )}
        style={{
          backgroundColor: isOver ? '#c2a65012' : '#f7f6f408',
          borderColor:     isOver ? '#c2a65060' : '#e0e0e040',
        }}
      >
        <SortableContext
          items={leads.map(l => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-2 space-y-2">
            {leads.map(lead => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onClick={onCardClick}
                onPacienteConsultou={onPacienteConsultou}
                onQuickNota={onQuickNota}
              />
            ))}
            {leads.length === 0 && (
              <div
                className="flex items-center justify-center h-14 text-[10px] rounded-md border-2 border-dashed"
                style={{ color: '#3f4e68', borderColor: '#3f4e6840' }}
              >
                Arraste aqui
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
