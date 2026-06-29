'use client';

import React from 'react';
import { RefreshCw, Loader2, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Pendencia } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { PendenciaCard } from './PendenciaCard';

interface PendenciasViewProps {
  pendencias: Pendencia[];
  loading: boolean;
  onResolve: (id: string) => void;
  onRefresh: () => void;
}

export function PendenciasView({ pendencias, loading, onResolve, onRefresh }: PendenciasViewProps) {
  return (
    <div className="p-4">
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Pendências</h2>
          {!loading && (
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-bold',
              pendencias.length > 0
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-muted text-muted-foreground'
            )}>
              {pendencias.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando pendências...</span>
        </div>
      )}

      {!loading && pendencias.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
          <p className="text-sm font-medium">Nenhuma pendência em aberto</p>
          <p className="text-xs">Todas as solicitações foram resolvidas.</p>
        </div>
      )}

      {!loading && pendencias.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...pendencias]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((p, idx) => (
              <PendenciaCard key={p.id} pendencia={p} index={idx} onResolved={onResolve} />
            ))}
        </div>
      )}
    </div>
  );
}
