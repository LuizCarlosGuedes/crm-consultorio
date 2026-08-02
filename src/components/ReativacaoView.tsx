'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { RotateCcw, RefreshCw, Search, MessageCircle, Users, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface PacienteReativacao {
  id: string;
  nome: string;
  telefone: string;
  chatwoot_conversation_id?: string | null;
  ultima_consulta: string | null;
  qtd_consultas: number;
  origem: string;
  tentativas: number;
  reativacao_iniciou: string | null;
  cidade: string;
  email: string;
  meses_sem_retornar: number | null;
  status_contato?: string;
  ultimo_contato?: string | null;
}

// Faixas de "sem retornar" — derivadas dos meses
const FAIXAS: { id: string; label: string; min: number; max: number }[] = [
  { id: '<6m',   label: '< 6 meses', min: 0,    max: 6 },
  { id: '6-12m', label: '6–12 meses', min: 6,   max: 12 },
  { id: '1-2a',  label: '1–2 anos',  min: 12,   max: 24 },
  { id: '2-4a',  label: '2–4 anos',  min: 24,   max: 48 },
  { id: '>4a',   label: '+ de 4 anos', min: 48, max: Infinity },
];
const faixaDe = (m: number | null) => {
  if (m == null) return 'sem_data';
  for (const f of FAIXAS) if (m >= f.min && m < f.max) return f.id;
  return '>4a';
};
const FAIXA_HEX: Record<string, string> = { '<6m': '#10B981', '6-12m': '#06B6D4', '1-2a': '#c2a650', '2-4a': '#F97316', '>4a': '#ef4444', sem_data: '#64748b' };
// Status de contato da campanha de reativação (vem do n8n: campanha_reativacao_*)
const jaContatado = (p: PacienteReativacao) => Boolean(p.ultimo_contato) || (!!p.status_contato && p.status_contato !== 'pendente');
const STATUS_LABEL: Record<string, string> = { pendente: 'A contatar', em_andamento: 'Contatado', concluida: 'Contatado (3/3)', respondeu: 'Respondeu', optout: 'Saiu' };
// Abre o paciente no CHATWOOT (não no WhatsApp). Acha/cria a conversa pela rota e redireciona.
// Abre a aba na hora do clique (gesto do usuário) pra não ser bloqueada, e ajusta a URL depois.
async function abrirChat(p: PacienteReativacao) {
  const win = window.open('', '_blank');
  try {
    const res = await fetch('/api/reativacao/chatwoot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone: p.telefone, nome: p.nome, conversation_id: p.chatwoot_conversation_id }),
    });
    const data = await res.json();
    if (data.ok && data.url && win) win.location.href = data.url;
    else if (win) win.close();
  } catch {
    if (win) win.close();
  }
}

export function ReativacaoView() {
  const [pacientes, setPacientes] = useState<PacienteReativacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [faixa, setFaixa] = useState<string>('todas');
  const [view, setView] = useState<'todos' | 'a_contatar' | 'ja_contatados'>('todos');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [disp, setDisp] = useState(false);
  const [dispMsg, setDispMsg] = useState<{ ok: boolean; txt: string } | null>(null);

  const fetchBase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reativacao', { cache: 'no-store' });
      const data = await res.json();
      setPacientes(Array.isArray(data?.pacientes) ? data.pacientes : []);
    } catch { /* mantém */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchBase(); }, [fetchBase]);

  const porFaixa = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of pacientes) { const f = faixaDe(p.meses_sem_retornar); c[f] = (c[f] || 0) + 1; }
    return c;
  }, [pacientes]);

  // Contagem A Contatar x Já Contatados
  const contagem = useMemo(() => {
    let a = 0, j = 0;
    for (const p of pacientes) { if (jaContatado(p)) j++; else a++; }
    return { a, j };
  }, [pacientes]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pacientes.filter(p => {
      if (view === 'a_contatar' && jaContatado(p)) return false;
      if (view === 'ja_contatados' && !jaContatado(p)) return false;
      if (faixa !== 'todas' && faixaDe(p.meses_sem_retornar) !== faixa) return false;
      if (q && !(`${p.nome} ${p.telefone}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [pacientes, busca, faixa, view]);

  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTodos = () => setSel(s => s.size === filtrados.length ? new Set() : new Set(filtrados.map(p => p.id)));

  const dispararCampanha = async () => {
    const ids = Array.from(sel);
    if (ids.length === 0) return;
    const CAP = 30;
    const aviso = ids.length > CAP
      ? `Você selecionou ${ids.length} pacientes. Por segurança (limite do WhatsApp), vou disparar os primeiros ${CAP} agora — repita depois para o restante. Confirmar?`
      : `Disparar a campanha de reativação para ${ids.length} paciente(s)?`;
    if (!window.confirm(aviso)) return;
    setDisp(true); setDispMsg(null);
    try {
      const res = await fetch('/api/reativacao/disparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.ok) {
        setDispMsg({ ok: true, txt: `✅ Campanha disparada para ${data.solicitados} paciente(s). A Nathalia está enviando pelo WhatsApp — o resumo chega no seu Telegram.` });
        setSel(new Set());
        setTimeout(fetchBase, 1500);
      } else {
        setDispMsg({ ok: false, txt: `⚠️ ${data.erro || 'Não consegui disparar a campanha.'}` });
      }
    } catch {
      setDispMsg({ ok: false, txt: '⚠️ Erro de conexão ao disparar a campanha.' });
    } finally {
      setDisp(false);
    }
  };

  return (
    <div className="p-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Base de Reativação</h2>
          <span className="text-xs text-muted-foreground">· {pacientes.length} pacientes</span>
        </div>
        <button onClick={fetchBase} className="p-1.5 rounded-md border border-border hover:bg-accent transition-colors" title="Atualizar">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Separação: A Contatar x Já Contatados */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={() => setView('todos')}
          className={cn('px-3 py-1 rounded-md text-xs font-semibold border transition-colors', view === 'todos' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
          Todos · {pacientes.length}
        </button>
        <button onClick={() => setView('a_contatar')}
          className={cn('px-3 py-1 rounded-md text-xs font-semibold border transition-colors', view === 'a_contatar' ? 'bg-sky-600 text-white border-sky-600' : 'border-sky-500/50 text-sky-600 bg-sky-500/10 hover:bg-sky-500/20')}>
          🔵 A Contatar · {contagem.a}
        </button>
        <button onClick={() => setView('ja_contatados')}
          className={cn('px-3 py-1 rounded-md text-xs font-semibold border transition-colors', view === 'ja_contatados' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20')}>
          🟢 Já Contatados · {contagem.j}
        </button>
      </div>

      {/* Stats por faixa (clicáveis = filtro) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button onClick={() => setFaixa('todas')}
          className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors', faixa === 'todas' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
          Todos · {pacientes.length}
        </button>
        {FAIXAS.map(f => (
          <button key={f.id} onClick={() => setFaixa(f.id)}
            className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
            style={faixa === f.id
              ? { backgroundColor: FAIXA_HEX[f.id], color: '#fff', borderColor: FAIXA_HEX[f.id] }
              : { borderColor: `${FAIXA_HEX[f.id]}80`, color: FAIXA_HEX[f.id], backgroundColor: `${FAIXA_HEX[f.id]}12` }}>
            {f.label} · {porFaixa[f.id] || 0}
          </button>
        ))}
        {porFaixa['sem_data'] ? (
          <button onClick={() => setFaixa('sem_data')}
            className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors', faixa === 'sem_data' ? 'bg-slate-500 text-white border-slate-500' : 'border-border hover:bg-accent text-muted-foreground')}>
            Sem data · {porFaixa['sem_data']}
          </button>
        ) : null}
      </div>

      {/* Busca */}
      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome ou telefone..."
          className="w-full h-8 pl-8 pr-3 rounded-md text-xs outline-none border border-border bg-background" />
      </div>

      {/* Tabela (desktop) */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="hdr-navy text-brand-cream/90">
            <tr>
              <th className="w-8 px-2 py-2"><input type="checkbox" checked={sel.size > 0 && sel.size === filtrados.length} onChange={toggleTodos} /></th>
              <th className="px-2 py-2 text-left font-semibold">Nome</th>
              <th className="px-2 py-2 text-left font-semibold">Telefone</th>
              <th className="px-2 py-2 text-center font-semibold">Última consulta</th>
              <th className="px-2 py-2 text-center font-semibold">Sem retornar</th>
              <th className="px-2 py-2 text-center font-semibold">Consultas</th>
              <th className="px-2 py-2 text-center font-semibold">Origem</th>
              <th className="px-2 py-2 text-center font-semibold">Contato</th>
              <th className="px-2 py-2 text-center font-semibold">Chat</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.slice(0, 600).map(p => {
              const f = faixaDe(p.meses_sem_retornar);
              const contatado = jaContatado(p);
              return (
                <tr key={p.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td className="px-2 py-1.5 font-medium truncate max-w-[200px]">{p.nome}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{p.telefone}</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{p.ultima_consulta || '—'}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: `${FAIXA_HEX[f]}20`, color: FAIXA_HEX[f] }}>
                      {p.meses_sem_retornar == null ? 'sem data' : `${Math.round(p.meses_sem_retornar)} m`}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{p.qtd_consultas || '—'}</td>
                  <td className="px-2 py-1.5 text-center text-[10px] text-muted-foreground truncate max-w-[120px]">{p.origem || '—'}</td>
                  <td className="px-2 py-1.5 text-center">
                    {contatado ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600" title={p.ultimo_contato ? `Contatado em ${p.ultimo_contato}` : 'Já contatado'}>
                        {STATUS_LABEL[p.status_contato || 'em_andamento'] || 'Contatado'}{p.ultimo_contato ? ` · ${p.ultimo_contato}` : ''}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-600">A contatar</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" onClick={() => abrirChat(p)} title="Abrir no Chatwoot" className="inline-flex text-emerald-600 hover:opacity-70"><MessageCircle className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtrados.length > 600 && <p className="text-[11px] text-muted-foreground p-2 text-center">Mostrando 600 de {filtrados.length} — use a busca/filtros para refinar.</p>}
        {filtrados.length === 0 && <p className="text-xs text-muted-foreground p-6 text-center">{loading ? 'Carregando...' : 'Nenhum paciente nesse filtro.'}</p>}
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {filtrados.slice(0, 200).map(p => {
          const f = faixaDe(p.meses_sem_retornar);
          const contatado = jaContatado(p);
          return (
            <div key={p.id} className="rounded-lg border border-border p-2.5 flex items-start gap-2">
              <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="mt-1" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.telefone} · {p.qtd_consultas || 0} consultas</p>
                <p className="text-[11px] text-muted-foreground">Última: {p.ultima_consulta || '—'}</p>
                <p className="text-[11px] font-medium" style={{ color: contatado ? '#059669' : '#0284c7' }}>
                  {contatado ? `🟢 Contatado${p.ultimo_contato ? ' · ' + p.ultimo_contato : ''}` : '🔵 A contatar'}
                </p>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0" style={{ backgroundColor: `${FAIXA_HEX[f]}20`, color: FAIXA_HEX[f] }}>
                {p.meses_sem_retornar == null ? 'sem data' : `${Math.round(p.meses_sem_retornar)}m`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rodapé seleção — Disparar campanha */}
      <div className="mt-3 pt-3 border-t border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {sel.size} selecionado(s) de {filtrados.length} filtrados · teto 30/disparo</span>
          <Button size="sm" onClick={dispararCampanha} disabled={sel.size === 0 || disp} className="h-8 text-xs gap-1.5" title="Dispara a confirmação de reativação (template Meta) para os pacientes selecionados">
            <Send className="h-3.5 w-3.5" /> {disp ? 'Disparando…' : 'Disparar campanha'}
          </Button>
        </div>
        {dispMsg && (
          <p className={cn('text-xs p-2 rounded', dispMsg.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/15 text-red-500')}>{dispMsg.txt}</p>
        )}
      </div>
    </div>
  );
}
