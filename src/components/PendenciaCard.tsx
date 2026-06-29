'use client';

import React, { useState } from 'react';
import { Phone, ExternalLink, Loader2, MessageCircle, Send, CheckCircle2, FileText, Pill, FlaskConical, Receipt, HelpCircle, Clock, FileQuestion } from 'lucide-react';
import { Pendencia } from '@/lib/types';
import { formatarTempoRelativo, cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

type IconType = typeof FileText;
const TIPO_CONFIG: Record<string, { label: string; badge: string; icon: IconType }> = {
  receita:                { label: 'Receita',                 badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   icon: Pill },
  pedido_exame:           { label: 'Pedido de Exame',         badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: FlaskConical },
  renovacao_receita:      { label: 'Renovação de Receita',    badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Pill },
  renovacao_pedido_exame: { label: 'Renov. Pedido de Exame',  badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30', icon: FlaskConical },
  nota_fiscal:            { label: 'Nota Fiscal',             badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',  icon: Receipt },
  documento:              { label: 'Documento',               badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30',     icon: FileText },
  duvida:                 { label: 'Dúvida',                  badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',     icon: HelpCircle },
  aguardando_paciente:    { label: 'Aguardando paciente',     badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Clock },
  aguardando_paciente_lembrado: { label: 'Aguardando (lembrado)', badge: 'bg-orange-500/10 text-orange-300/80 border-orange-500/20', icon: Clock },
  outro:                  { label: 'Solicitação',            badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',   icon: FileQuestion },
  solicitacao_paciente:   { label: 'Solicitação',            badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',   icon: FileQuestion },
};

function getTipo(tipo: string) {
  return TIPO_CONFIG[tipo] ?? { label: tipo, badge: 'bg-muted text-muted-foreground border-border', icon: FileQuestion };
}

interface PendenciaCardProps {
  pendencia: Pendencia;
  index?: number;
  onResolved: (id: string) => void;
}

export function PendenciaCard({ pendencia: p, index, onResolved }: PendenciaCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [linkArquivo, setLinkArquivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  const [resolvendoDireto, setResolvendoDireto] = useState(false);
  // Responder paciente (Nathalia)
  const [msg, setMsg] = useState('');
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const [msgResult, setMsgResult] = useState<{ ok: boolean; txt: string } | null>(null);

  const tipoConfig = getTipo(p.tipo);
  const Icon = tipoConfig.icon;
  const chatwootUrl = p.chatwoot_conversation_id
    ? `https://chat.drluizguedes.com.br/app/accounts/1/conversations/${p.chatwoot_conversation_id}`
    : null;

  function abrirModal() { setModalOpen(true); setLinkArquivo(''); setErro(''); setMsg(''); setMsgResult(null); }
  function fecharModal() { if (submitting || enviandoMsg) return; setModalOpen(false); }

  async function resolverDireto() {
    if (resolvendoDireto) return;
    setResolvendoDireto(true);
    try {
      await fetch('/api/webhook/n8n/resolver-pendencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendencia_id: p.id }),
      });
      onResolved(p.id); setModalOpen(false);
    } catch { /* ignore */ } finally { setResolvendoDireto(false); }
  }

  async function enviarResolver() {
    if (!linkArquivo.trim()) return;
    setSubmitting(true); setErro('');
    try {
      const res = await fetch('/api/webhook/n8n/resolver-pendencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendencia_id: p.id, link_arquivo: linkArquivo.trim(), conversation_id: p.chatwoot_conversation_id }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErro(d.error ?? 'Erro ao resolver.'); return; }
      onResolved(p.id); setModalOpen(false); setLinkArquivo('');
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally { setSubmitting(false); }
  }

  async function enviarResposta() {
    if (!msg.trim() || enviandoMsg) return;
    if (!p.chatwoot_conversation_id) { setMsgResult({ ok: false, txt: 'Sem conversa vinculada no Chatwoot.' }); return; }
    setEnviandoMsg(true); setMsgResult(null);
    try {
      const res = await fetch('/api/pendencias/responder', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: p.chatwoot_conversation_id, mensagem: msg.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) { setMsgResult({ ok: true, txt: 'Enviado pro paciente pela Nathalia. ✅' }); setMsg(''); }
      else setMsgResult({ ok: false, txt: d.error || 'Não consegui enviar.' });
    } catch {
      setMsgResult({ ok: false, txt: 'Erro de conexão ao enviar.' });
    } finally { setEnviandoMsg(false); }
  }

  return (
    <>
      <button
        onClick={abrirModal}
        className="group relative flex flex-col text-left rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-red-500/50 transition-all duration-150 overflow-hidden w-full"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/70" />
        <div className="flex flex-col flex-1 pl-4 pr-3 py-3 gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {index != null && (
                <span className="flex items-center justify-center h-5 w-5 flex-shrink-0 rounded-full bg-red-500/15 text-red-400 text-[11px] font-bold">{index + 1}</span>
              )}
              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase leading-none truncate', tipoConfig.badge)}>
                <Icon className="h-3 w-3" />{tipoConfig.label}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">{formatarTempoRelativo(p.created_at)}</span>
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight truncate">{p.paciente_nome}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-muted-foreground font-mono truncate">{p.paciente_telefone}</span>
            </div>
          </div>
          {p.descricao && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5 leading-relaxed line-clamp-2">{p.descricao}</p>
          )}
        </div>
      </button>

      <Dialog open={modalOpen} onOpenChange={fecharModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold', tipoConfig.badge)}>
                <Icon className="h-3.5 w-3.5" />{tipoConfig.label}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-5 space-y-4 max-h-[72vh] overflow-y-auto">
            {/* paciente */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-base leading-tight">{p.paciente_nome}</p>
                <span className="text-xs text-muted-foreground font-mono">{p.paciente_telefone}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">aberta {formatarTempoRelativo(p.created_at)}</span>
            </div>

            {p.descricao && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">{p.descricao}</div>
            )}

            {/* Ver no Chatwoot (onde está a receita/documento) */}
            {chatwootUrl ? (
              <button onClick={() => window.open(chatwootUrl, '_blank')}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1f93ff] text-white py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
                <ExternalLink className="h-4 w-4" /> Ver a conversa / receita no Chatwoot
              </button>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sem conversa vinculada no Chatwoot.</p>
            )}

            {/* Responder o paciente (Nathalia) */}
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><MessageCircle className="h-3.5 w-3.5 text-sky-500" /> Pedir pra Nathalia responder</p>
              <textarea
                value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="Ex.: O Dr. vai avaliar sua receita e te retorno até amanhã 😊"
                className="w-full min-h-[64px] rounded-md border border-border bg-background text-sm p-2"
                disabled={enviandoMsg}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">Vai como mensagem da Nathalia no WhatsApp do paciente.</span>
                <Button size="sm" onClick={enviarResposta} disabled={!msg.trim() || enviandoMsg || !p.chatwoot_conversation_id}>
                  {enviandoMsg ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />} Enviar
                </Button>
              </div>
              {msgResult && (
                <p className={cn('text-xs p-2 rounded', msgResult.ok ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : 'bg-red-500/15 text-red-500')}>{msgResult.txt}</p>
              )}
            </div>

            {/* Resolver */}
            <div className="border-t border-border pt-3 space-y-2">
              <label className="text-xs text-muted-foreground block">Resolver com documento (link do Drive) — opcional</label>
              <Input placeholder="https://drive.google.com/..." value={linkArquivo} onChange={e => setLinkArquivo(e.target.value)} disabled={submitting} />
              {erro && <p className="text-xs text-red-500">{erro}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={enviarResolver} disabled={submitting || !linkArquivo.trim()} className="bg-emerald-600 text-white hover:bg-emerald-500">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />} Enviar documento e resolver
                </Button>
                <Button variant="outline" onClick={resolverDireto} disabled={resolvendoDireto} title="Marca como resolvida sem enviar nada ao paciente">
                  {resolvendoDireto ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null} Resolver sem enviar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
