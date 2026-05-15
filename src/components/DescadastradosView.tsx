'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserX, RefreshCw, Loader2, Phone, Mail } from 'lucide-react';
import { Descadastrado } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface DescadastradosViewProps {
  loading: boolean;
  onRefresh: () => void;
  descadastrados: Descadastrado[];
}

function formatDataBR(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DescadastradosView({ loading, onRefresh, descadastrados }: DescadastradosViewProps) {
  return (
    <div className="p-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Descadastrados</h2>
          {!loading && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
              {descadastrados.length}
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
          <span className="text-sm">Carregando...</span>
        </div>
      )}

      {/* Vazio */}
      {!loading && descadastrados.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <UserX className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">Nenhum paciente descadastrado</p>
        </div>
      )}

      {/* Tabela */}
      {!loading && descadastrados.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Nome</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Telefone</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">E-mail</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Data Descadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {descadastrados.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{p.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-foreground/80 font-mono text-xs">
                      <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      {p.telefone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/70">
                    {p.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {p.email}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground/70 whitespace-nowrap">
                    {formatDataBR(p.descadastrado_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
