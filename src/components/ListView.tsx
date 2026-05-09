'use client';

import React, { useState } from 'react';
import { ArrowUpDown, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { Lead } from '@/lib/types';
import { calcSLAStatus, formatarData, formatarMoeda, getEtapa, getPrioridadeCor, getOrigemIcon, cn } from '@/lib/utils';

interface ListViewProps {
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}

type SortKey = 'nome' | 'etapa_atual' | 'prioridade' | 'data_entrada' | 'valor_consulta';

const PRIORIDADE_ORDER: Record<string, number> = { urgente: 0, alta: 1, normal: 2, frio: 3 };

export function ListView({ leads, onCardClick }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('data_entrada');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...leads].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'nome':           cmp = a.nome.localeCompare(b.nome); break;
      case 'etapa_atual':    cmp = a.etapa_atual.localeCompare(b.etapa_atual); break;
      case 'prioridade':     cmp = PRIORIDADE_ORDER[a.prioridade] - PRIORIDADE_ORDER[b.prioridade]; break;
      case 'data_entrada':   cmp = new Date(a.data_entrada).getTime() - new Date(b.data_entrada).getTime(); break;
      case 'valor_consulta': cmp = a.valor_consulta - b.valor_consulta; break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  function Th({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="px-3 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">{children}<SortIcon col={col} /></span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <Th col="nome">Paciente</Th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Telefone</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Procedimento</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Origem</th>
            <Th col="prioridade">Prioridade</Th>
            <Th col="etapa_atual">Etapa</Th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Pipeline</th>
            <Th col="valor_consulta">Valor</Th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">SLA</th>
            <Th col="data_entrada">Entrada</Th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map(lead => {
            const etapa = getEtapa(lead.etapa_atual);
            const slaStatus = calcSLAStatus(lead);
            return (
              <tr
                key={lead.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onCardClick(lead)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', {
                      'bg-red-500 animate-sla-pulse': lead.prioridade === 'urgente',
                      'bg-orange-500': lead.prioridade === 'alta',
                      'bg-green-500':  lead.prioridade === 'normal',
                      'bg-gray-500':   lead.prioridade === 'frio',
                    })} />
                    <span className="font-medium text-xs">{lead.nome}</span>
                    {lead.movido_por_ia && (
                      <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold">AUTO</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{lead.telefone}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">{lead.procedimento || '—'}</td>
                <td className="px-3 py-2.5 text-xs">{getOrigemIcon(lead.origem)} {lead.origem}</td>
                <td className="px-3 py-2.5">
                  <span className={cn('text-xs font-semibold capitalize', getPrioridadeCor(lead.prioridade))}>
                    {lead.prioridade}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {etapa && (
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', etapa.corBg, etapa.corBorda, etapa.cor)}>
                      {etapa.nome}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {(lead.pipeline_id ?? 1) === 1 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
                      P1
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      P2
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs font-semibold text-emerald-500">
                  {lead.valor_consulta > 0 ? formatarMoeda(lead.valor_consulta) : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <div className={cn('w-2 h-2 rounded-full', {
                    'bg-green-500':                 slaStatus === 'ok',
                    'bg-yellow-500':                slaStatus === 'atencao',
                    'bg-red-500 animate-sla-pulse': slaStatus === 'atrasado',
                  })} />
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatarData(lead.data_entrada)}</td>
                <td className="px-3 py-2.5">
                  {lead.chatwoot_url && (
                    <a
                      href={lead.chatwoot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Chatwoot
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={11} className="px-3 py-8 text-center text-sm text-muted-foreground">
                Nenhum lead encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
