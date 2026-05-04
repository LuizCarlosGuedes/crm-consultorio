'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ORIGENS, PRIORIDADES } from '@/lib/constants';

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    nome: string; telefone: string; origem: string; procedimento: string;
    prioridade: string; nota: string; valor_consulta: number; chatwoot_url: string;
  }) => Promise<void>;
}

const DEFAULT_FORM = {
  nome: '', telefone: '', origem: 'WhatsApp', procedimento: '',
  prioridade: 'normal', nota: '', valor_consulta: '', chatwoot_url: '',
};

export function AddLeadModal({ open, onClose, onAdd }: AddLeadModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  function setField(key: string, value: string) {
    setForm(p => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.telefone.trim()) return;
    setLoading(true);
    await onAdd({
      ...form,
      valor_consulta: parseFloat(form.valor_consulta) || 0,
    });
    setForm(DEFAULT_FORM);
    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Nome completo *</label>
                <Input
                  required
                  placeholder="Nome do paciente"
                  value={form.nome}
                  onChange={e => setField('nome', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Telefone WhatsApp *</label>
                <Input
                  required
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={e => setField('telefone', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Procedimento</label>
                <Input
                  placeholder="Ex: Consulta Dermatológica"
                  value={form.procedimento}
                  onChange={e => setField('procedimento', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Origem</label>
                <Select value={form.origem} onValueChange={v => setField('origem', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                <Select value={form.prioridade} onValueChange={v => setField('prioridade', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor da Consulta (R$)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.valor_consulta}
                  onChange={e => setField('valor_consulta', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">URL Chatwoot</label>
                <Input
                  placeholder="https://..."
                  value={form.chatwoot_url}
                  onChange={e => setField('chatwoot_url', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Observação</label>
                <Textarea
                  placeholder="Informações adicionais..."
                  rows={3}
                  value={form.nota}
                  onChange={e => setField('nota', e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || !form.nome.trim() || !form.telefone.trim()}>
              {loading ? 'Criando...' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
