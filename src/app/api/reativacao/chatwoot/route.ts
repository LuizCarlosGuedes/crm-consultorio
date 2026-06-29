import { NextRequest, NextResponse } from 'next/server';

// Abre o paciente da Reativação no CHATWOOT (plataforma padrão de atendimento), não no WhatsApp.
// Se já há conversa vinculada, devolve a URL dela. Senão, acha o contato pelo telefone (ou cria
// contato + conversa) e devolve a URL — assim o atendimento fica sempre dentro do Chatwoot/Nathalia.
const TOK = process.env.CHATWOOT_API_TOKEN || '';
const API = 'https://chat.drluizguedes.com.br/api/v1/accounts/1';
const APP = 'https://chat.drluizguedes.com.br/app/accounts/1/conversations/';
const INBOX = 3;
const H = { api_access_token: TOK, 'Content-Type': 'application/json' };

async function cw(method: string, path: string, body?: unknown) {
  const res = await fetch(API + path, {
    method,
    headers: H,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`chatwoot ${res.status}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  let body: { telefone?: string; nome?: string; conversation_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'JSON inválido' }, { status: 400 });
  }

  if (body.conversation_id) {
    return NextResponse.json({ ok: true, url: APP + body.conversation_id });
  }

  const digits = String(body.telefone || '').replace(/\D/g, '');
  if (!digits) return NextResponse.json({ ok: false, erro: 'Sem telefone' }, { status: 400 });
  const last8 = digits.slice(-8);
  const phoneE164 = '+' + digits;

  try {
    let contactId: number | null = null;
    let sourceId: string | null = null;

    const s = await cw('GET', '/contacts/search?q=' + encodeURIComponent(last8));
    const match = (s.payload || []).find((c: { phone_number?: string }) =>
      String(c.phone_number || '').replace(/\D/g, '').endsWith(last8),
    );
    if (match) {
      contactId = match.id;
      const ci = (match.contact_inboxes || []).find((x: { inbox?: { id?: number } }) => x.inbox?.id === INBOX);
      if (ci) sourceId = ci.source_id;
    }

    if (!contactId) {
      const c = await cw('POST', '/contacts', { inbox_id: INBOX, name: body.nome || 'Paciente', phone_number: phoneE164 });
      const ct = c.payload?.contact ?? c.payload;
      contactId = ct.id;
      const ci = (ct.contact_inboxes || []).find((x: { inbox?: { id?: number } }) => x.inbox?.id === INBOX);
      if (ci) sourceId = ci.source_id;
    }

    if (contactId && !sourceId) {
      const cd = await cw('GET', '/contacts/' + contactId);
      const ct = cd.payload ?? cd;
      const ci = (ct.contact_inboxes || []).find((x: { inbox?: { id?: number } }) => x.inbox?.id === INBOX);
      if (ci) sourceId = ci.source_id;
    }

    let convId: number | null = null;
    if (contactId) {
      const cc = await cw('GET', '/contacts/' + contactId + '/conversations');
      const convs = cc.payload || [];
      if (convs.length) {
        const open = convs.find((x: { status?: string }) => x.status === 'open') || convs.slice().sort((a: { id: number }, b: { id: number }) => b.id - a.id)[0];
        convId = open.id;
      }
    }
    if (!convId && contactId && sourceId) {
      const cv = await cw('POST', '/conversations', { source_id: String(sourceId), inbox_id: INBOX, contact_id: contactId });
      convId = cv.id;
    }

    if (!convId) return NextResponse.json({ ok: false, erro: 'Não consegui abrir a conversa no Chatwoot' }, { status: 502 });
    return NextResponse.json({ ok: true, url: APP + convId });
  } catch {
    return NextResponse.json({ ok: false, erro: 'Falha ao contatar o Chatwoot' }, { status: 502 });
  }
}
