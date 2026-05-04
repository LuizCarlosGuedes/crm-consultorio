'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Stage, Lead } from '@/lib/types';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  stage: Stage;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

export function KanbanColumn({ stage, leads, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex flex-col flex-shrink-0 w-[272px]">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-t-lg border-t-2 mb-0',
          stage.corBg,
        )}
        style={{ borderTopColor: stage.corHex }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('font-semibold text-xs truncate', stage.cor)}>
            {stage.nome}
          </span>
          <span className="text-[10px] text-muted-foreground bg-background/50 rounded-full px-1.5 py-0.5 flex-shrink-0">
            {leads.length}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground flex-shrink-0 ml-1">
          SLA: {stage.slaLabel}
        </span>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto rounded-b-lg border border-t-0 transition-colors',
          stage.corBorda,
          isOver ? 'bg-primary/5 border-primary/40' : 'bg-muted/20',
          'min-h-[120px] max-h-[calc(100vh-180px)]'
        )}
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
              />
            ))}
            {leads.length === 0 && (
              <div className="flex items-center justify-center h-16 text-[10px] text-muted-foreground/50">
                Arraste um card aqui
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
