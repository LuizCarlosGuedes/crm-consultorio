'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send, Sparkles, X, Search, MessageCircle } from 'lucide-react';

interface PacBusca { id?: string; nome: string; telefone: string; }
interface Props {
  prefill?: PacBusca | null;
  onClose: () => void;
}

export function TarefaNathaliaModal({ prefill, onClose }: Props) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<PacBusca[]>([]);
  const [pac, setPac] = useState<PacBusca | null>(prefill ?? null);
  const [task, setTask] = useState('');
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [orcamento, setOrcamento] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; txt: string } | null>(null);

  useEffect(() => {
    if (pac || q.trim().length < 2) { setResultados([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/procedimentos/buscar?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setResultados(j.pacientes || []);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [q, pac]);

  async function gerar() {
    if (!pac || !task.trim() || composing) return;
    setComposing(true); setResult(null);
    try {
      const r = await fetch('/api/tarefa/compor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), paciente_nome: pac.nome }),
      });
      const j = await r.json();
      if (j.ok && j.mensagem) setDraft(j.mensagem);
      else setResult({ ok: false, txt: j.error || 'Não consegui gerar a mensagem.' });
    } catch { setResult({ ok: false, txt: 'Erro ao gerar a mensagem.' }); }
    finally { setComposing(false); }
  }

  async function enviar() {
    if (!pac || !draft.trim() || sending) return;
    setSending(true); setResult(null);
    try {
      const r = await fetch('/api/tarefa/enviar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: pac.telefone, mensagem: draft.trim() }),
      });
      const j = await r.json();
      if (!j.ok) { setResult({ ok: false, txt: j.error || 'Não consegui enviar.' }); return; }
      let txt = 'Enviado pro paciente pela Nathalia. ✅';
      if (orcamento) {
        try {
          const ro = await fetch('/api/tarefa/orcamento', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefone: pac.telefone }),
          });
          const jo = await ro.json();
          if (jo.ok) txt += jo.moveu ? ' Pendência baixada + card em "Proposta Enviada". 📋' : ' Pendência baixada. 📋';
          else txt += ' (mas não consegui dar baixa/mover o card)';
        } catch { txt += ' (mas não consegui dar baixa/mover o card)'; }
      }
      setResult({ ok: true, txt }); setTimeout(onClose, 1600);
    } catch { setResult({ ok: false, txt: 'Erro ao enviar.' }); }
    finally { setSending(false); }
  }

  const inputCls = 'w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 rounded-t-xl" style={{ backgroundColor: '#2a3650' }}>
          <span className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles className="h-4 w-4" /> Mandar tarefa pra Nathalia</span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Paciente */}
          {!pac ? (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Paciente</label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input className={inputCls + ' pl-8'} placeholder="Buscar por nome…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
              </div>
              {resultados.length > 0 && (
                <div className="mt-1 border border-border rounded-md divide-y divide-border max-h-44 overflow-y-auto">
                  {resultados.map(r => (
                    <button key={r.id || r.telefone} onClick={() => { setPac(r); setResultados([]); }} className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-muted">
                      {r.nome} <span className="text-[11px] text-muted-foreground">· {r.telefone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5">
              <span className="text-sm font-medium">{pac.nome} <span className="text-[11px] text-muted-foreground font-mono">{pac.telefone}</span></span>
              {!prefill && <button onClick={() => { setPac(null); setQ(''); setDraft(''); }} className="text-xs text-muted-foreground hover:text-foreground">trocar</button>}
            </div>
          )}

          {/* Tarefa */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">O que a Nathalia deve fazer?</label>
            <textarea value={task} onChange={e => setTask(e.target.value)}
              placeholder="Ex.: confirme os dados de cadastro / pergunte se ainda tem interesse / avise que o resultado do exame chegou"
              className="w-full min-h-[56px] rounded-md border border-border bg-background text-sm p-2" />
            <button onClick={gerar} disabled={!pac || !task.trim() || composing}
              className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#7c5cff' }}>
              {composing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Gerar mensagem
            </button>
          </div>

          {/* Rascunho editável */}
          {draft && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground"><MessageCircle className="h-3.5 w-3.5 text-sky-500" /> Mensagem da Nathalia (revise e edite)</p>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} className="w-full min-h-[80px] rounded-md border border-border bg-background text-sm p-2" />
              <label className="flex items-start gap-2 text-[11px] text-foreground cursor-pointer select-none rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-1.5">
                <input type="checkbox" checked={orcamento} onChange={e => setOrcamento(e.target.checked)} className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>📋 <b>Enviei um orçamento</b> — dá baixa na pendência e move o card pra &quot;Proposta Enviada&quot;</span>
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">Vai pro WhatsApp do paciente como mensagem da Nathalia.</span>
                <button onClick={enviar} disabled={!draft.trim() || sending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#10B981' }}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar
                </button>
              </div>
            </div>
          )}

          {result && (
            <p className={`text-xs p-2 rounded ${result.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/15 text-red-500'}`}>{result.txt}</p>
          )}
        </div>
      </div>
    </div>
  );
}
