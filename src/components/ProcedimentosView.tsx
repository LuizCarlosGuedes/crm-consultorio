'use client';

import { useState, useEffect } from 'react';
import {
  DndContext, closestCorners, DragOverlay, useDroppable,
  PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Syringe, RefreshCw, Loader2, CheckCircle2, CalendarClock, Layers, X, MessageCircle, Archive, RotateCcw, Wallet, Repeat, ExternalLink, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface Sessao { data: string; passou: boolean; status: string; consulta_id?: string; event_id?: string | null; }
export interface Procedimento {
  id: string;
  nome: string;
  telefone: string;
  chatwoot_conversation_id?: string | null;
  proc_nome: string;
  proc_sessoes: number;
  proc_valor_cheio: number | string | null;
  proc_valor_fechado?: number | string | null;
  crm_card_id?: string | null;
  proc_status: string;
  proc_periodicidade: string | null;
  sessoes_agendadas: number;
  proxima_sessao: string | null;
  sessoes: Sessao[];
  completo: boolean;
}

interface Props { procedimentos: Procedimento[]; loading: boolean; onRefresh: () => void; }

const COLUNAS: { status: string; label: string }[] = [
  { status: 'pendente',             label: 'Em Negociação' },
  { status: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
  { status: 'pago',                 label: 'A Agendar' },
  { status: 'agendado',             label: 'Em Tratamento' },
  { status: 'concluido',            label: 'Concluído' },
];

const STATUS_HEX: Record<string, string> = { pendente: '#c2a650', aguardando_pagamento: '#F97316', pago: '#06B6D4', agendado: '#10B981', concluido: '#3f4e68' };

function formatValor(v: number | string | null): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}
const colOf = (p: Procedimento) => (p.completo ? 'concluido' : (p.proc_status || 'pendente'));
const CHATWOOT = 'https://chat.drluizguedes.com.br/app/accounts/1/conversations/';
function chatLink(p: Procedimento): string {
  if (p.chatwoot_conversation_id) return CHATWOOT + p.chatwoot_conversation_id;
  return `https://wa.me/${(p.telefone || '').replace(/\D/g, '')}`;
}
function proximaTs(p: Procedimento): number {
  const fut = (p.sessoes || []).find(s => !s.passou && s.status !== 'CANCELADO');
  const m = fut?.data.match(/(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return new Date(2000 + +m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
}
function sessaoTag(s: Sessao): { txt: string; cls: string } {
  if (s.status === 'CANCELADO') return { txt: 'cancelada', cls: 'text-red-400 bg-red-500/10' };
  if (s.status === 'NO_SHOW')   return { txt: 'faltou', cls: 'text-red-500 bg-red-500/10' };
  if (s.status === 'REALIZADO') return { txt: 'realizada', cls: 'text-sky-500 bg-sky-500/10' };
  if (s.passou)                  return { txt: 'a confirmar', cls: 'text-amber-500 bg-amber-500/10' };
  return { txt: 'agendada', cls: 'text-emerald-500 bg-emerald-500/10' };
}

const CARD_CLASS = 'group w-full text-left rounded-lg border border-brand-gray/60 dark:border-[#3f4e68] bg-card px-3 pt-2.5 pb-2 space-y-1.5 hover:shadow-md hover:border-brand-gold/60 transition-all';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', aguardando_pagamento: 'Aguard. pagamento', pago: 'Pago', agendado: 'Agendado', concluido: 'Concluído',
};

/** Conteúdo visual do card (mesmo padrão do card de lead do Pipeline). */
function CardBody({ p }: { p: Procedimento }) {
  const feitas = p.sessoes_agendadas || 0;
  const total = p.proc_sessoes || 0;
  const st = colOf(p);
  const hex = STATUS_HEX[st] ?? '#3f4e68';
  return (
    <>
      {/* Header: ícone + nome (igual ao card de lead) */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Syringe className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <p className="font-semibold text-[13px] leading-tight line-clamp-1 flex-1 text-foreground">{p.nome}</p>
      </div>

      <p className="text-[11px] text-muted-foreground line-clamp-1" title={p.proc_nome}>{p.proc_nome}</p>

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Layers className="h-3 w-3" />{total > 0 ? `${feitas}/${total} sessões` : '— sessões'}
        </span>
        <span className="text-[11px] font-semibold text-brand-gold">{formatValor(p.proc_valor_cheio)}</span>
      </div>

      {p.proxima_sessao && (
        <p className="inline-flex items-center gap-1 text-[10px] text-sky-500">
          <CalendarClock className="h-3 w-3" />Próxima: {p.proxima_sessao}
        </p>
      )}

      {/* Footer: status (bolinha + label) à esquerda, Chat à direita — igual ao card de lead */}
      <div className="flex items-center justify-between pt-1 border-t border-brand-gray/40 dark:border-[#3f4e68]/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
          <span className="text-[10px] text-muted-foreground truncate">{STATUS_LABEL[st] ?? st}</span>
        </div>
        <a href={chatLink(p)} target="_blank" rel="noreferrer"
           onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
           className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors bg-brand-gold/10 hover:bg-brand-gold/25 text-brand-gold flex-shrink-0" title="Abrir conversa no Chatwoot">
          <ExternalLink className="h-2.5 w-2.5" />Chat
        </a>
      </div>
    </>
  );
}

/** Card arrastável (@dnd-kit sortable) — funciona no desktop e no toque. */
function SortableCard({ p, onClick }: { p: Procedimento; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: `4px solid ${STATUS_HEX[colOf(p)] ?? '#3f4e68'}`,
    // toque: card segue o dedo em qualquer direção (sem o navegador roubar o gesto p/ rolagem).
    touchAction: 'none' as const,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}
      className={cn(CARD_CLASS, 'cursor-grab active:cursor-grabbing select-none', isDragging && 'opacity-40')}>
      <CardBody p={p} />
    </div>
  );
}

/** Card no overlay de arrasto (sem listeners, com leve elevação). */
function OverlayCard({ p }: { p: Procedimento }) {
  return (
    <div style={{ borderLeft: `4px solid ${STATUS_HEX[colOf(p)] ?? '#3f4e68'}` }}
      className={cn(CARD_CLASS, 'shadow-2xl rotate-1 scale-105 cursor-grabbing')}>
      <CardBody p={p} />
    </div>
  );
}

/** Coluna droppable (@dnd-kit) — header idêntico ao Pipeline. */
function ProcColumn({ col, itens, onCardClick }: { col: { status: string; label: string }; itens: Procedimento[]; onCardClick: (p: Procedimento) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });
  const hex = STATUS_HEX[col.status] ?? '#3f4e68';
  return (
    <div className="flex flex-col flex-shrink-0 w-[280px]">
      {/* ── Column header (idêntico ao Pipeline) ── */}
      <div className="hdr-navy flex items-center justify-between px-3 py-2 rounded-t-lg"
        style={{ borderTop: `6px solid ${hex}`, borderLeft: `1px solid ${hex}55`, borderRight: `1px solid ${hex}55` }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="font-bold text-[11px] truncate tracking-wide uppercase" style={{ color: '#f7f6f4' }}>{col.label}</span>
          <span className="text-[10px] font-black rounded-full px-1.5 py-0.5 flex-shrink-0 leading-none" style={{ backgroundColor: '#c2a650', color: '#0b1a35' }}>{itens.length}</span>
        </div>
      </div>
      {/* ── Cards area = droppable ── */}
      <div ref={setNodeRef}
        className="flex-1 overflow-y-auto rounded-b-lg border border-t-0 transition-colors duration-150 min-h-[120px] max-h-[calc(100vh-180px)]"
        style={{ backgroundColor: isOver ? '#c2a65018' : 'rgba(63,78,104,0.08)', borderColor: isOver ? '#c2a65066' : 'rgba(63,78,104,0.18)', boxShadow: 'inset 0 3px 10px -6px rgba(11,26,53,0.18)' }}>
        <SortableContext items={itens.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-2">
            {itens.map(p => <SortableCard key={p.id} p={p} onClick={() => onCardClick(p)} />)}
            {itens.length === 0 && (
              <div className="flex items-center justify-center h-14 text-[10px] rounded-md border-2 border-dashed"
                style={{ color: '#3f4e68', borderColor: '#3f4e6840' }}>
                {isOver ? 'Solte aqui' : 'Arraste aqui'}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function Modal({ p, acting, onClose, onAcao, onRefresh }: { p: Procedimento; acting: boolean; onClose: () => void; onAcao: (acao: string) => void; onRefresh: () => void }) {
  const [sessoes, setSessoes] = useState<Sessao[]>(p.sessoes || []);
  const [checking, setChecking] = useState<string | null>(null);
  useEffect(() => { setSessoes(p.sessoes || []); }, [p.sessoes]);

  async function marcarSessao(s: Sessao, acao: 'realizada' | 'faltou') {
    const novo = acao === 'faltou' ? 'NO_SHOW' : 'REALIZADO';
    if (!s.consulta_id || s.status === novo || checking) return;
    setChecking(s.consulta_id);
    setSessoes(prev => prev.map(x => x.consulta_id === s.consulta_id ? { ...x, status: novo, passou: true } : x));
    try {
      await fetch('/api/procedimentos/sessao-realizada', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta_id: s.consulta_id, event_id: s.event_id, acao }),
      });
      onRefresh();
    } finally { setChecking(null); }
  }

  const [reagId, setReagId] = useState<string | null>(null);
  const [reagData, setReagData] = useState('');
  const [reagHora, setReagHora] = useState('14:00');
  const [reagBusy, setReagBusy] = useState(false);

  async function confirmarReag(s: Sessao) {
    if (!s.consulta_id || !/^\d{4}-\d{2}-\d{2}$/.test(reagData) || reagBusy) return;
    setReagBusy(true);
    try {
      await fetch('/api/procedimentos/reagendar-sessao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta_id: s.consulta_id, data: reagData, horario: reagHora }),
      });
      setReagId(null);
      onRefresh();
    } finally { setReagBusy(false); }
  }

  async function removerSessao(s: Sessao) {
    if (!s.consulta_id || !window.confirm('Remover esta sessão? Apaga a consulta e o evento no Google Agenda.')) return;
    try {
      await fetch('/api/procedimentos/remover-sessao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta_id: s.consulta_id, event_id: s.event_id }),
      });
      onRefresh();
    } catch { /* ignore */ }
  }

  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ proc_nome: p.proc_nome || '', proc_sessoes: String(p.proc_sessoes || ''), proc_valor_cheio: p.proc_valor_cheio == null ? '' : String(p.proc_valor_cheio), proc_periodicidade: p.proc_periodicidade || 'semanal' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [lancando, setLancando] = useState(false);
  const [lancRes, setLancRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [metodoLanc, setMetodoLanc] = useState('pix');
  useEffect(() => { setEdit({ proc_nome: p.proc_nome || '', proc_sessoes: String(p.proc_sessoes || ''), proc_valor_cheio: p.proc_valor_cheio == null ? '' : String(p.proc_valor_cheio), proc_periodicidade: p.proc_periodicidade || 'semanal' }); }, [p]);
  useEffect(() => { setLancRes(null); }, [p.id]);

  // Lança o valor do acompanhamento no financeiro (pagamentos + financeiro CRM), idempotente no backend.
  async function lancarFinanceiro() {
    if (lancando) return;
    const valor = Number(p.proc_valor_cheio);
    if (!(valor > 0)) { setLancRes({ ok: false, msg: 'Defina o valor do acompanhamento antes (botão editar ✎).' }); return; }
    setLancando(true); setLancRes(null);
    try {
      const res = await fetch('/api/procedimentos/lancar-financeiro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: p.id, valor, metodo: metodoLanc }),
      });
      const data = await res.json();
      if (data.ok) { setLancRes({ ok: true, msg: `✅ Lançado no financeiro: ${formatValor(valor)}.` }); onRefresh(); }
      else { setLancRes({ ok: false, msg: `⚠️ ${data.error || data.mensagem || 'Não consegui lançar.'}` }); }
    } catch { setLancRes({ ok: false, msg: '⚠️ Erro de conexão ao lançar.' }); }
    finally { setLancando(false); }
  }

  async function salvarEdicao() {
    setSavingEdit(true);
    try {
      await fetch('/api/procedimentos/editar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: p.id, proc_nome: edit.proc_nome, proc_sessoes: edit.proc_sessoes, proc_valor_cheio: edit.proc_valor_cheio, proc_periodicidade: edit.proc_periodicidade }),
      });
      setEditing(false);
      onRefresh();
    } finally { setSavingEdit(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <a href={chatLink(p)} target="_blank" rel="noreferrer"
               className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#1f93ff] flex items-center justify-center hover:opacity-80 transition-opacity" title="Abrir conversa no Chatwoot">
              <MessageCircle className="h-4 w-4 text-white" />
            </a>
            <div>
              <div className="font-semibold leading-tight">{p.nome}</div>
              <a href={chatLink(p)} target="_blank" rel="noreferrer" className="text-xs text-[#1f93ff] hover:underline font-mono">{p.telefone}</a>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div className="rounded-lg bg-muted/30 p-3">
            {!editing ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{p.proc_nome}</div>
                  <button onClick={() => setEditing(true)} title="Editar procedimento" className="text-muted-foreground hover:text-foreground flex-shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div><div className="text-muted-foreground">Sessões</div><div className="font-semibold">{p.sessoes_agendadas}/{p.proc_sessoes}</div></div>
                  <div><div className="text-muted-foreground">Valor</div><div className="font-semibold">{formatValor(p.proc_valor_cheio)}</div></div>
                  <div><div className="text-muted-foreground">Frequência</div><div className="font-semibold capitalize">{p.proc_periodicidade || '—'}</div></div>
                </div>
                {/* Lançar no financeiro — o valor do acompanhamento vai pro Financeiro (idempotente) */}
                {(p.proc_valor_fechado != null && p.proc_valor_fechado !== '') ? (
                  <div className="mt-2 text-[11px] font-medium text-emerald-600 flex items-center gap-1">✓ Lançado no financeiro · {formatValor(p.proc_valor_fechado)}</div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <select
                      value={metodoLanc}
                      onChange={e => setMetodoLanc(e.target.value)}
                      className="w-full h-7 px-2 rounded border border-border bg-background text-[11px]"
                    >
                      <option value="pix">Forma: PIX</option>
                      <option value="dinheiro">Forma: Dinheiro</option>
                      <option value="cartao">Forma: Cartão</option>
                      <option value="convenio">Forma: Convênio</option>
                      <option value="outro">Forma: Outro</option>
                    </select>
                    <button
                      onClick={lancarFinanceiro}
                      disabled={lancando || !(Number(p.proc_valor_cheio) > 0)}
                      title={Number(p.proc_valor_cheio) > 0 ? '' : 'Defina o valor primeiro (editar ✎)'}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {lancando ? 'Lançando…' : `💰 Lançar no financeiro (${formatValor(p.proc_valor_cheio)})`}
                    </button>
                  </div>
                )}
                {lancRes && <div className={`mt-1 text-[11px] ${lancRes.ok ? 'text-emerald-600' : 'text-red-500'}`}>{lancRes.msg}</div>}
              </>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-0.5">Procedimento</label>
                  <input value={edit.proc_nome} onChange={e => setEdit(v => ({ ...v, proc_nome: e.target.value }))} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Sessões</label>
                    <input type="number" min={1} max={60} value={edit.proc_sessoes} onChange={e => setEdit(v => ({ ...v, proc_sessoes: e.target.value }))} className="w-full h-8 px-2 rounded border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Valor</label>
                    <input type="number" min={0} value={edit.proc_valor_cheio} onChange={e => setEdit(v => ({ ...v, proc_valor_cheio: e.target.value }))} placeholder="—" className="w-full h-8 px-2 rounded border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Frequência</label>
                    <select value={edit.proc_periodicidade} onChange={e => setEdit(v => ({ ...v, proc_periodicidade: e.target.value }))} className="w-full h-8 px-1 rounded border border-border bg-background text-sm">
                      <option value="semanal">Semanal</option>
                      <option value="quinzenal">Quinzenal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={salvarEdicao} disabled={savingEdit} className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-emerald-600 disabled:opacity-50">{savingEdit ? 'Salvando…' : 'Salvar'}</button>
                  <button onClick={() => setEditing(false)} disabled={savingEdit} className="px-3 py-1.5 rounded text-xs border border-border">Cancelar</button>
                </div>
                <p className="text-[10px] text-muted-foreground">Edita os dados do plano. Pra agendar/remover sessões de verdade, use "Abrir acompanhamento".</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Sessões agendadas</span>
              <span className="inline-flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5 text-sky-500" />realizada</span>
                <span className="inline-flex items-center gap-0.5"><X className="h-2.5 w-2.5 text-red-500" />faltou</span>
              </span>
            </div>
            {sessoes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma sessão agendada ainda.</p>
            ) : (
              <div className="space-y-1">
                {sessoes.map((s, i) => {
                  const t = sessaoTag(s);
                  const realizada = s.status === 'REALIZADO';
                  const noshow = s.status === 'NO_SHOW';
                  const cancelada = s.status === 'CANCELADO';
                  const busy = checking === s.consulta_id;
                  const reaging = reagId === s.consulta_id;
                  return (
                    <div key={s.consulta_id || i}>
                      <div className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-1.5 text-xs">
                        <span className="inline-flex items-center gap-2">
                          {cancelada ? (
                            <span className="w-9 flex-shrink-0" />
                          ) : (
                            <span className="inline-flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => marcarSessao(s, 'realizada')}
                                disabled={realizada || busy || !s.consulta_id}
                                title="Marcar como REALIZADA — fica azul na agenda"
                                className={cn('h-4 w-4 rounded border flex items-center justify-center transition-colors',
                                  realizada ? 'bg-sky-600 border-sky-600 text-white' : 'border-sky-500/40 text-sky-500/60 hover:bg-sky-500/15')}>
                                {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => marcarSessao(s, 'faltou')}
                                disabled={noshow || busy || !s.consulta_id}
                                title="Marcar FALTA / no-show — fica vermelho na agenda"
                                className={cn('h-4 w-4 rounded border flex items-center justify-center transition-colors',
                                  noshow ? 'bg-red-600 border-red-600 text-white' : 'border-red-500/40 text-red-500/60 hover:bg-red-500/15')}>
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                          <CalendarClock className="h-3 w-3 text-muted-foreground" />{s.data}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', t.cls)}>{t.txt}</span>
                          {s.consulta_id && (
                            <>
                              <button onClick={() => { setReagId(reaging ? null : (s.consulta_id ?? null)); setReagData(''); setReagHora('14:00'); }}
                                title="Reagendar sessão" className="text-muted-foreground hover:text-sky-500"><Repeat className="h-3 w-3" /></button>
                              <button onClick={() => removerSessao(s)} title="Remover sessão" className="text-muted-foreground hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </>
                          )}
                        </span>
                      </div>
                      {reaging && (
                        <div className="flex flex-wrap items-center gap-2 mt-1 mb-1 px-2.5 py-1.5 rounded-md border border-sky-500/30 bg-sky-500/5">
                          <span className="text-[10px] text-muted-foreground">Nova data:</span>
                          <input type="date" value={reagData} onChange={e => setReagData(e.target.value)} className="h-7 px-2 rounded border border-border bg-background text-xs" />
                          <input type="time" value={reagHora} onChange={e => setReagHora(e.target.value)} className="h-7 px-2 rounded border border-border bg-background text-xs" />
                          <button onClick={() => confirmarReag(s)} disabled={reagBusy || !/^\d{4}-\d{2}-\d{2}$/.test(reagData)} className="px-2.5 py-1 rounded text-[11px] font-semibold text-white bg-sky-600 disabled:opacity-50">{reagBusy ? '…' : 'Confirmar'}</button>
                          <button onClick={() => setReagId(null)} className="px-2 py-1 rounded text-[11px] border border-border">Cancelar</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4 border-t border-border">
          {p.completo ? (
            <button disabled={acting} onClick={() => onAcao('reabrir')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />Reabrir tratamento
            </button>
          ) : (
            <button disabled={acting} onClick={() => onAcao('concluir')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />Concluir tratamento
            </button>
          )}
          <button disabled={acting} onClick={() => onAcao('arquivar')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 transition-colors">
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}Arquivar
          </button>
        </div>
      </div>
    </div>
  );
}

interface PacBusca { id: string; nome: string; telefone: string; }

/** Modal "Abrir acompanhamento": busca o paciente + define proc/sessões/valor/periodicidade → motor WF48. */
function AbrirAcompanhamentoModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<PacBusca[]>([]);
  const [pac, setPac] = useState<PacBusca | null>(null);
  const [procNome, setProcNome] = useState('');
  const [sessoes, setSessoes] = useState(4);
  const [valor, setValor] = useState('');
  const [periodicidade, setPeriodicidade] = useState('semanal');
  const [dataInicio, setDataInicio] = useState('');
  const [horario, setHorario] = useState('14:00');
  const [preview, setPreview] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

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

  const podeEnviar = !!pac && procNome.trim().length > 0 && sessoes >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(dataInicio);

  async function go(dry: boolean) {
    if (!podeEnviar) return;
    setErro(''); setBusy(true); if (!dry) setPreview(null);
    try {
      const r = await fetch('/api/procedimentos/abrir', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paciente_id: pac!.id, proc_nome: procNome.trim(), sessoes, valor_cheio: valor, periodicidade, data_inicio: dataInicio, horario, dry_run: dry }),
      });
      const j = await r.json();
      if (dry) { setPreview(Array.isArray(j.datas) ? j.datas : []); }
      else if (j.ok) { onDone(); onClose(); }
      else { setErro(j.error || 'Não consegui abrir o acompanhamento.'); }
    } catch {
      setErro('Falha de conexão ao abrir o acompanhamento.');
    } finally { setBusy(false); }
  }

  const inputCls = 'w-full h-9 px-2.5 rounded-md border border-border bg-background text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="hdr-navy flex items-center justify-between px-4 py-3 rounded-t-xl" style={{ backgroundColor: '#2a3650' }}>
          <span className="text-sm font-semibold text-white flex items-center gap-2"><Syringe className="h-4 w-4" /> Abrir acompanhamento</span>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3">
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
                    <button key={r.id} onClick={() => { setPac(r); setResultados([]); }} className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-muted">
                      {r.nome} <span className="text-[11px] text-muted-foreground">· {r.telefone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5">
              <span className="text-sm font-medium">{pac.nome}</span>
              <button onClick={() => { setPac(null); setQ(''); setPreview(null); }} className="text-xs text-muted-foreground hover:text-foreground">trocar</button>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Procedimento</label>
            <input className={inputCls} placeholder="Ex.: Aplicação de Tirzepatida" value={procNome} onChange={e => setProcNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nº de sessões</label>
              <input type="number" min={1} max={60} className={inputCls} value={sessoes} onChange={e => setSessoes(Math.max(1, parseInt(e.target.value, 10) || 1))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor cheio (R$)</label>
              <input type="number" min={0} className={inputCls} placeholder="opcional" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Periodicidade</label>
              <select className={inputCls} value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">1ª sessão</label>
              <input type="date" className={inputCls} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
              <input type="time" className={inputCls} value={horario} onChange={e => setHorario(e.target.value)} />
            </div>
          </div>

          {preview && (
            <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs">
              <span className="font-semibold text-blue-700 dark:text-blue-300">Prévia ({preview.length} sessões):</span>{' '}
              {preview.length ? preview.join(' · ') : 'nenhuma data calculada (confira o paciente).'}
            </div>
          )}
          {erro && <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600">{erro}</div>}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button onClick={() => go(true)} disabled={!podeEnviar || busy} className="px-3 py-2 rounded-md text-xs font-medium border border-border disabled:opacity-50">
              Pré-visualizar datas
            </button>
            <button onClick={() => go(false)} disabled={!podeEnviar || busy} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#10B981' }}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Abrir acompanhamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProcedimentosView({ procedimentos, loading, onRefresh }: Props) {
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [selected, setSelected] = useState<Procedimento | null>(null);
  const [acting, setActing] = useState(false);
  const [items, setItems] = useState<Procedimento[]>(procedimentos);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { setItems(procedimentos); }, [procedimentos]);
  // Após um refresh (check, reagendar, remover…), re-sincroniza o procedimento aberto no popup
  // com os dados novos — senão o popup continua mostrando a data/estado antigos.
  useEffect(() => {
    setSelected(sel => (sel ? (procedimentos.find(p => p.id === sel.id) ?? sel) : sel));
  }, [procedimentos]);

  const sensors = useSensors(
    // PointerSensor cobre mouse E toque (pointer events) — confiável no tablet. Arrasta pela alça ⠿ após 8px.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  async function doAcao(acao: string) {
    if (!selected) return;
    setActing(true);
    try {
      await fetch('/api/procedimentos/acao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, acao }),
      });
      setSelected(null);
      onRefresh();
    } finally { setActing(false); }
  }

  async function moveTo(id: string, target: string) {
    const card = items.find(p => p.id === id);
    if (!card || colOf(card) === target) return;
    setItems(prev => prev.map(p => p.id === id ? { ...p, proc_status: target, completo: target === 'concluido' } : p));
    try {
      await fetch('/api/procedimentos/acao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, acao: target }),
      });
    } finally { onRefresh(); }
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const id = String(active.id);
    const overId = String(over.id);
    // over.id pode ser o status da coluna (área vazia) ou o id de outro card.
    let target: string;
    if (COLUNAS.some(c => c.status === overId)) {
      target = overId;
    } else {
      const overCard = items.find(p => p.id === overId);
      if (!overCard) return;
      target = colOf(overCard);
    }
    moveTo(id, target);
  }

  const ativos = items.filter(p => !p.completo);
  const totalAtivo = ativos.reduce((acc, p) => acc + (Number(p.proc_valor_cheio) || 0), 0);
  const activeCard = activeId ? items.find(p => p.id === activeId) ?? null : null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Procedimentos</h2>
          {!loading && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">{items.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8 gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Atualizar
          </Button>
          <button onClick={() => setAbrirOpen(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: '#10B981' }}>
            <Plus className="h-3.5 w-3.5" /> Abrir acompanhamento
          </button>
        </div>
      </div>
      {abrirOpen && <AbrirAcompanhamentoModal onClose={() => setAbrirOpen(false)} onDone={onRefresh} />}

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Repeat className="h-3.5 w-3.5" /><b className="text-foreground">{ativos.length}</b> em andamento</span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Wallet className="h-3.5 w-3.5" /><b className="text-foreground">{totalAtivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</b> ativos</span>
          <span className="text-muted-foreground/60 italic ml-auto hidden sm:block">arraste os cards entre as colunas para mudar o status</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm">Carregando procedimentos...</span></div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
          <p className="text-sm font-medium">Nenhum procedimento em andamento</p>
          <p className="text-xs">Aparecem aqui quando você preenche um procedimento na aba Pós-consulta do card.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="flex gap-3 overflow-x-auto pb-4 px-1">
            {COLUNAS.map(col => {
              const itens = items.filter(p => colOf(p) === col.status).sort((a, b) => proximaTs(a) - proximaTs(b));
              return <ProcColumn key={col.status} col={col} itens={itens} onCardClick={setSelected} />;
            })}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeCard ? <OverlayCard p={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {selected && <Modal p={selected} acting={acting} onClose={() => setSelected(null)} onAcao={doAcao} onRefresh={onRefresh} />}
    </div>
  );
}
