'use client';

import { useState } from 'react';
import { FileText, RefreshCw, Loader2, CheckCircle2, ImageOff, Sparkles, ThumbsUp, ThumbsDown, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface Conteudo {
  id: string;
  semana: number;
  titulo: string;
  conteudo: string;
  status: string;
  imagem_drive_url: string | null;
  tags: string[] | string | null;
}

interface Props { conteudos: Conteudo[]; loading: boolean; onRefresh: () => void; }
type Redo = 'texto' | 'imagem' | 'ambos';

function driveImg(url: string | null, sz: number): string | null {
  if (!url) return null;
  const m = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${sz}` : null;
}

function CardPreview({ c, onClick }: { c: Conteudo; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const thumb = driveImg(c.imagem_drive_url, 600);
  const aprovado = c.status === 'aprovado';
  return (
    <button onClick={onClick} className="text-left rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
      <div className="relative h-36 bg-muted/40 flex items-center justify-center">
        {thumb && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={c.titulo} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <ImageOff className="h-7 w-7 text-muted-foreground/40" />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white">Post {c.semana}</span>
        <span className={cn('absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold', aprovado ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')}>
          {aprovado ? 'Aprovado' : 'Pendente'}
        </span>
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm leading-snug line-clamp-2">{c.titulo}</div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.conteudo}</p>
        <span className="inline-block mt-2 text-[11px] text-primary font-medium">ver detalhes →</span>
      </div>
    </button>
  );
}

function Modal({ c, acting, actMsg, onClose, onAprovar, onReject }: {
  c: Conteudo; acting: boolean; actMsg: string; onClose: () => void;
  onAprovar: () => void; onReject: (redo: Redo, feedback: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [redo, setRedo] = useState<Redo>('ambos');
  const [motivo, setMotivo] = useState('');
  const [imgErr, setImgErr] = useState(false);
  const big = driveImg(c.imagem_drive_url, 1000);
  const aprovado = c.status === 'aprovado';

  const OPCOES: { v: Redo; label: string }[] = [
    { v: 'texto', label: 'Só o texto' },
    { v: 'imagem', label: 'Só a imagem' },
    { v: 'ambos', label: 'Texto + imagem' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">Post {c.semana}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', aprovado ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')}>{aprovado ? 'Aprovado' : 'Pendente'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        {big && !imgErr ? (
          <a href={c.imagem_drive_url ?? '#'} target="_blank" rel="noreferrer" title="Abrir imagem original no Drive" className="block bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={big} alt={c.titulo} referrerPolicy="no-referrer" className="w-full max-h-[48vh] object-contain mx-auto" onError={() => setImgErr(true)} />
          </a>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/30">
            <ImageOff className="h-7 w-7 text-muted-foreground/40" />
            {c.imagem_drive_url && (
              <a href={c.imagem_drive_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />abrir imagem no Drive</a>
            )}
          </div>
        )}

        <div className="p-4">
          <h3 className="font-semibold text-base">{c.titulo}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line mt-2 leading-relaxed">{c.conteudo}</p>
        </div>

        <div className="p-4 border-t border-border sticky bottom-0 bg-card">
          {acting ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1.5"><Loader2 className="h-4 w-4 animate-spin" />{actMsg || 'Processando...'}</div>
          ) : aprovado ? (
            <div className="inline-flex items-center gap-1.5 text-sm text-emerald-500 font-semibold"><CheckCircle2 className="h-4 w-4" />Aprovado para envio</div>
          ) : rejecting ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-foreground mb-1.5">O que a IA deve refazer?</div>
                <div className="flex gap-2">
                  {OPCOES.map(o => (
                    <button key={o.v} onClick={() => setRedo(o.v)}
                      className={cn('flex-1 px-2 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                        redo === o.v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">O que melhorar? <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
                  placeholder={redo === 'imagem' ? 'Ex: a imagem devia mostrar comida de verdade, frutas e peixe...' : redo === 'texto' ? 'Ex: deixe o texto mais prático e direto...' : 'Ex: texto mais prático; imagem com comida real...'}
                  className="w-full text-sm rounded-md border border-border bg-background p-2 mt-1 outline-none resize-none focus:border-primary/50" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => onReject(redo, motivo)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors">
                  <Sparkles className="h-4 w-4" />Reprovar + IA refaz
                </button>
                <button onClick={() => { setRejecting(false); setMotivo(''); }} className="px-3 py-2 rounded-md text-sm border border-border hover:bg-accent transition-colors">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={onAprovar}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                <ThumbsUp className="h-4 w-4" />Aprovar
              </button>
              <button onClick={() => setRejecting(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold bg-muted text-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
                <ThumbsDown className="h-4 w-4" />Reprovar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConteudoView({ conteudos, loading, onRefresh }: Props) {
  const [selected, setSelected] = useState<Conteudo | null>(null);
  const [acting, setActing] = useState(false);
  const [actMsg, setActMsg] = useState('');

  async function doAprovar(c: Conteudo) {
    setActing(true); setActMsg('Aprovando...');
    try {
      await fetch('/api/conteudo/acao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, acao: 'aprovar' }),
      });
      await new Promise(r => setTimeout(r, 300));
      setSelected(null); onRefresh();
    } finally { setActing(false); setActMsg(''); }
  }

  async function doReject(c: Conteudo, redo: Redo, feedback: string) {
    setActing(true);
    setActMsg(redo === 'texto' ? 'Refazendo o texto...' : 'Gerando nova imagem (~40s)...');
    try {
      if (redo === 'texto' || redo === 'ambos') {
        await fetch('/api/conteudo/acao', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: c.id, acao: 'reprovar', semana: c.semana, titulo_antigo: c.titulo, feedback }),
        });
      }
      if (redo === 'imagem' || redo === 'ambos') {
        setActMsg('Gerando nova imagem (~40s)...');
        await fetch('/api/conteudo/imagem', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: c.id, feedback }),
        });
      }
      await new Promise(r => setTimeout(r, 400));
      setSelected(null); onRefresh();
    } finally { setActing(false); setActMsg(''); }
  }

  const pendentes = conteudos.filter(c => c.status !== 'aprovado').length;
  const aprovados = conteudos.filter(c => c.status === 'aprovado').length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Conteúdo de Nutrição</h2>
          {!loading && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">{conteudos.length}</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8 gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />Atualizar
        </Button>
      </div>

      {!loading && conteudos.length > 0 && (
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span><b className="text-amber-500">{pendentes}</b> aguardando você</span>
          <span><b className="text-emerald-500">{aprovados}</b> aprovados</span>
          <span className="italic ml-auto hidden sm:block">8 posts/mês · 2 por semana (seg e qui) · clique num card para aprovar ou refazer</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-48 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm">Carregando conteúdos...</span></div>
      )}

      {!loading && conteudos.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">Nenhum conteúdo gerado ainda</p>
          <p className="text-xs">Todo início de mês a IA gera 8 conteúdos para você aprovar aqui.</p>
        </div>
      )}

      {!loading && conteudos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {conteudos.map(c => <CardPreview key={c.id} c={c} onClick={() => setSelected(c)} />)}
        </div>
      )}

      {selected && (
        <Modal
          c={selected} acting={acting} actMsg={actMsg}
          onClose={() => { if (!acting) setSelected(null); }}
          onAprovar={() => doAprovar(selected)}
          onReject={(redo, fb) => doReject(selected, redo, fb)}
        />
      )}
    </div>
  );
}
