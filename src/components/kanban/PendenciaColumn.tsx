'use client';

import React from 'react';
import { Stage, Pendencia } from '@/lib/types';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { PendenciaCard } from '@/components/PendenciaCard';

interface PendenciaColumnProps {
  stage: Stage;
  pendencias: Pendencia[];
  onResolved: (id: string) => void;
}

/** Coluna do kanban que renderiza PENDÊNCIAS (não leads), com toda a funcionalidade da aba. */
export function PendenciaColumn({ stage, pendencias, onResolved }: PendenciaColumnProps) {
  const ordenadas = [...pendencias].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex flex-col flex-shrink-0 w-[280px]">
      {/* Header */}
      <div
        className="hdr-navy flex items-center justify-between px-3 py-2 rounded-t-lg"
        style={{
          borderTop:   `6px solid ${stage.corHex}`,
          borderLeft:  `1px solid ${stage.corHex}55`,
          borderRight: `1px solid ${stage.corHex}55`,
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-bold text-[11px] truncate tracking-wide uppercase" style={{ color: '#f7f6f4' }}>
            {stage.nome}
          </span>
          <span
            className="text-[10px] font-black rounded-full px-1.5 py-0.5 flex-shrink-0 leading-none"
            style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}
          >
            {pendencias.length}
          </span>
          {stage.descricao && <InfoTooltip text={stage.descricao} side="bottom" />}
        </div>
        <span className="text-[12px] flex-shrink-0 ml-1 font-mono" style={{ color: '#e0e0e0' }}>
          {stage.slaLabel}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex-1 overflow-y-auto rounded-b-lg border border-t-0 min-h-[120px] max-h-[calc(100vh-180px)]"
        style={{ backgroundColor: 'rgba(63,78,104,0.08)', borderColor: 'rgba(63,78,104,0.18)', boxShadow: 'inset 0 3px 10px -6px rgba(11,26,53,0.18)' }}
      >
        <div className="p-2 space-y-2">
          {ordenadas.map(p => (
            <PendenciaCard key={p.id} pendencia={p} onResolved={onResolved} />
          ))}
          {pendencias.length === 0 && (
            <div
              className="flex items-center justify-center h-14 text-[10px] rounded-md border-2 border-dashed"
              style={{ color: '#3f4e68', borderColor: '#3f4e6840' }}
            >
              Nenhuma pendência
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
