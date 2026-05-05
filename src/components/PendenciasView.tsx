'use client';

import React, { useState } from 'react';
import { Phone, ExternalLink, RefreshCw, Loader2, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Pendencia } from '@/lib/types';
import { formatarData, formatarTempoRelativo, cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface PendenciasViewProps {
  pendencias: Pendencia[];
  loading: boolean;
  onResolve: (id: string) => void;
  onRefresh: () => void;
}

const TIPO_CONFIG: Record<string, { label: string; badge: string }> = {
  receita:                { label: 'Receita',                 badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  pedido_exame:           { label: 'Pedido de Exame',         badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  renovacao_receita:      { label: 'Renovação de Receita',    badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  renovacao_pedido_exame: { label: 'Renov. Pedido de Exame',  badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  nota_fiscal:            { label: 'Nota Fiscal',             badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

function getTipo(tipo: string) {
  return TIPO_CONFIG[tipo] ?? { label: tipo, badge: 'bg-muted text-muted-foreground border-border' };
}

export function PendenciasView({ pendencias, loading, onResolve, onRefresh }: PendenciasViewProps) {
  const [resolvendo, setResolvendo] = useState<Pendencia | null>(null);
  const [linkArquivo, setLinkArquivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');

  function abrirModal(p: Pendencia) {
    setResolvendo(p);
    setLinkArquivo('');
    setErro('');
  }

  function fecharModal() {
    if (submitting) return;
    setResolvendo(null);
    setLinkArquivo('');
    setErro('');
  }

  async function handleEnviarResolver(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvendo || !linkArquivo.trim()) return;
    setSubmitting(true);
    setErro('');

    try {
      const res = await fetch('/api/webhook/n8n/resolver-pendencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendencia_id: resolvendo.id,
          link_arquivo: linkArquivo.trim(),
          conversation_id: resolvendo.chatwoot_conversation_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? 'Erro ao resolver pendência.');
        return;
      }

      onResolve(resolvendo.id);
      setResolvendo(null);
      setLinkArquivo('');
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="p-4 max-w-3xl">
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

        {/* Estado de carregamento */}
        {loading && (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Carregando pendências...</span>
          </div>
        )}

        {/* Lista vazia */}
        {!loading && pendencias.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
            <p className="text-sm font-medium">Nenhuma pendência em aberto</p>
            <p className="text-xs">Todas as solicitações foram resolvidas.</p>
          </div>
        )}

        {/* Cards de pendências */}
        {!loading && pendencias.length > 0 && (
          <div className="space-y-3">
            {pendencias.map(p => {
              const tipoConfig = getTipo(p.tipo);
              const chatwootUrl = p.chatwoot_conversation_id
                ? `https://chat.drluizguedes.com.br/app/accounts/1/conversations/${p.chatwoot_conversation_id}`
                : null;

              return (
                <div
                  key={p.id}
                  className="relative rounded-lg border border-border bg-card shadow-sm hover:shadow-md hover:border-orange-400/40 transition-all duration-150"
                >
                  {/* Stripe laranja à esquerda */}
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-orange-400/70" />

                  <div className="pl-4 pr-4 py-3 space-y-2.5">
                    {/* Cabeçalho: tipo + nome */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase leading-none',
                          tipoConfig.badge
                        )}>
                          {tipoConfig.label}
                        </span>
                        <p className="font-semibold text-sm leading-tight">{p.paciente_nome}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => abrirModal(p)}
                        className="h-7 text-xs px-3 flex-shrink-0"
                      >
                        Resolver
                      </Button>
                    </div>

                    {/* Telefone */}
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] text-foreground/80 font-mono">{p.paciente_telefone}</span>
                    </div>

                    {/* Descrição */}
                    {p.descricao && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 leading-relaxed">
                        {p.descricao}
                      </p>
                    )}

                    {/* Rodapé: data + chatwoot */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground">
                        {formatarData(p.created_at)} · {formatarTempoRelativo(p.created_at)}
                      </span>
                      {chatwootUrl && (
                        <button
                          onClick={() => window.open(chatwootUrl, '_blank')}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[9px] font-medium transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          Chatwoot
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de resolver */}
      <Dialog open={!!resolvendo} onOpenChange={fecharModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolver Pendência</DialogTitle>
          </DialogHeader>

          {resolvendo && (
            <form onSubmit={handleEnviarResolver}>
              <div className="px-6 py-4 space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase leading-none',
                      getTipo(resolvendo.tipo).badge
                    )}>
                      {getTipo(resolvendo.tipo).label}
                    </span>
                  </div>
                  <p className="font-semibold">{resolvendo.paciente_nome}</p>
                  {resolvendo.descricao && (
                    <p className="text-xs text-muted-foreground">{resolvendo.descricao}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Link do arquivo (Google Drive) *
                  </label>
                  <Input
                    required
                    placeholder="https://drive.google.com/..."
                    value={linkArquivo}
                    onChange={e => setLinkArquivo(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {erro && (
                  <p className="text-xs text-red-500">{erro}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={fecharModal} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !linkArquivo.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Enviando...
                    </>
                  ) : 'Enviar e Resolver'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
