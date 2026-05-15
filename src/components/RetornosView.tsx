'use client';

import React, { useState } from 'react';
import { RotateCcw, Phone, RefreshCw, Loader2, CheckCircle2, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Retorno } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface RetornosViewProps {
  retornos: Retorno[];
  loading: boolean;
  onRefresh: () => void;
  onUpdate: (id: string, updates: Partial<Retorno>) => void;
}

const STATUS_CONFIG: Record<Retorno['status'], { label: string; badge: string }> = {
  pendente:  { label: 'Pendente',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  agendado:  { label: 'Agendado',  badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  reativado: { label: 'Reativado', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

function calcDias(dataRetorno: string | null): number | null {
  if (!dataRetorno) return null;
  const diff = new Date(dataRetorno).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDataBR(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type EditingState = { id: string; campo: 'data_retorno' | 'observacoes' } | null;

export function RetornosView({ retornos, loading, onRefresh, onUpdate }: RetornosViewProps) {
  const [editando, setEditando] = useState<EditingState>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [reativadosAbertos, setReativadosAbertos] = useState(false);

  const ativos     = retornos.filter(r => r.status !== 'reativado');
  const reativados = retornos.filter(r => r.status === 'reativado');

  function iniciarEdicao(r: Retorno, campo: 'data_retorno' | 'observacoes') {
    setEditando({ id: r.id, campo });
    setEditValue(
      campo === 'data_retorno'
        ? r.data_retorno?.slice(0, 10) ?? ''
        : r.observacoes ?? ''
    );
  }

  function cancelarEdicao() {
    setEditando(null);
    setEditValue('');
  }

  async function salvar() {
    if (!editando || saving) return;
    setSaving(true);
    const payload = { [editando.campo]: editValue || null };
    try {
      const res = await fetch(`/api/retornos/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onUpdate(editando.id, payload as Partial<Retorno>);
      }
    } finally {
      setSaving(false);
      setEditando(null);
      setEditValue('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') salvar();
    if (e.key === 'Escape') cancelarEdicao();
  }

  return (
    <div className="p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Candidatos a Retorno</h2>
          {!loading && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
              {ativos.length}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Carregando retornos...</span>
        </div>
      )}

      {/* Vazio */}
      {!loading && ativos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
          <p className="text-sm font-medium">Nenhum candidato a retorno</p>
          <p className="text-xs">Os registros aparecerão aqui quando criados.</p>
        </div>
      )}

      {/* Tabela */}
      {!loading && ativos.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Nome</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Telefone</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Data Retorno</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Dias p/ Retorno</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {ativos.map(r => {
                const dias = calcDias(r.data_retorno);
                const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pendente;
                const editandoData = editando?.id === r.id && editando.campo === 'data_retorno';
                const editandoObs  = editando?.id === r.id && editando.campo === 'observacoes';

                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors group">
                    {/* Nome */}
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.paciente_nome}</td>

                    {/* Telefone */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-foreground/80 font-mono text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {r.paciente_telefone}
                      </div>
                    </td>

                    {/* Data Retorno — inline edit */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editandoData ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={saving}
                            className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground outline-none focus:border-primary"
                          />
                          <button
                            onClick={salvar}
                            disabled={saving}
                            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            disabled={saving}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarEdicao(r, 'data_retorno')}
                          className="flex items-center gap-1.5 text-xs group/btn hover:text-foreground text-foreground/80 transition-colors"
                        >
                          <span>{formatDataBR(r.data_retorno)}</span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover/btn:opacity-60 transition-opacity" />
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded border text-[10px] font-bold uppercase leading-none whitespace-nowrap',
                        statusCfg.badge
                      )}>
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Dias para Retorno */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {dias === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className={cn(
                          'text-xs font-semibold',
                          dias > 10  ? 'text-emerald-400' :
                          dias > 0   ? 'text-amber-400'   :
                                       'text-red-400'
                        )}>
                          {dias > 0 ? `+${dias}d` : `${dias}d`}
                        </span>
                      )}
                    </td>

                    {/* Observações — inline edit */}
                    <td className="px-4 py-3 max-w-xs">
                      {editandoObs ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={saving}
                            placeholder="Observação..."
                            className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground outline-none focus:border-primary w-48"
                          />
                          <button
                            onClick={salvar}
                            disabled={saving}
                            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            disabled={saving}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarEdicao(r, 'observacoes')}
                          className="flex items-center gap-1.5 text-xs group/btn hover:text-foreground text-foreground/70 transition-colors text-left w-full"
                        >
                          <span className="truncate max-w-[180px]">
                            {r.observacoes || <span className="text-muted-foreground italic">Adicionar nota...</span>}
                          </span>
                          <Pencil className="h-3 w-3 flex-shrink-0 opacity-0 group-hover/btn:opacity-60 transition-opacity" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Seção Reativados */}
      {!loading && reativados.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setReativadosAbertos(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            {reativadosAbertos
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
            }
            Reativados
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
              {reativados.length}
            </span>
          </button>

          {reativadosAbertos && (
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm opacity-70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Nome</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Telefone</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Data Retorno</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {reativados.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{r.paciente_nome}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-foreground/80 font-mono text-xs">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          {r.paciente_telefone}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-foreground/70">
                        {formatDataBR(r.data_retorno)}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground/70 max-w-xs truncate">
                        {r.observacoes || <span className="text-muted-foreground italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
