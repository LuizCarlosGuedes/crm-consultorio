# CRM Consultório Médico — Documentação Completa

Stack: **Next.js 14** · **Supabase** · **Tailwind CSS** · **Docker / Easypanel**

---

## 1. Configurar o Supabase

### 1.1 Criar projeto
1. Acesse [supabase.com](https://supabase.com) e crie uma conta (gratuito).
2. Clique em **New project**, escolha um nome e região próxima ao Brasil (ex.: `South America (São Paulo)`).
3. Aguarde o projeto ser provisionado (~2 min).

### 1.2 Executar o schema do banco
1. No painel do Supabase, vá em **SQL Editor → New Query**.
2. Copie todo o conteúdo do arquivo `database.sql` deste projeto.
3. Clique em **Run** (▶).
4. Verifique que as tabelas `leads`, `historico_movimentacoes` e `notas` foram criadas.

### 1.3 Obter as chaves
Vá em **Project Settings → API**:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** (mantenha secreta!) |

### 1.4 Habilitar Realtime
1. Vá em **Database → Replication**.
2. Ative a tabela **leads** para `INSERT`, `UPDATE`, `DELETE`.

---

## 2. Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto (nunca commit este arquivo):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WEBHOOK_SECRET_TOKEN=meu-token-secreto-n8n
NEXTAUTH_SECRET=string-aleatoria-longa-aqui
```

Para gerar o `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## 3. Rodar em Desenvolvimento

```bash
npm install
cp .env.local.example .env.local
# Preencha o .env.local com suas chaves
npm run dev
```

Acesse: http://localhost:3000

---

## 4. Deploy no Easypanel (Digital Ocean)

### 4.1 Criar servidor
1. Crie um Droplet na Digital Ocean (recomendado: 2GB RAM, Ubuntu 22.04).
2. Instale o Easypanel: `curl -sSL https://easypanel.io/install.sh | sh`
3. Acesse o Easypanel pelo IP do servidor na porta 3000.

### 4.2 Criar o serviço no Easypanel
1. Clique em **Create Service → App**.
2. Selecione **GitHub** (conecte sua conta e selecione o repositório).
3. Em **Build Method**: escolha **Dockerfile**.
4. Em **Port**: coloque `3000`.
5. Em **Domain**: configure seu domínio ou use o subdomínio fornecido.

### 4.3 Configurar variáveis de ambiente
No painel do serviço, vá em **Environment**:
```
NEXT_PUBLIC_SUPABASE_URL     = <valor>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <valor>
SUPABASE_SERVICE_ROLE_KEY    = <valor>
WEBHOOK_SECRET_TOKEN         = <valor>
NEXTAUTH_SECRET              = <valor>
```

### 4.4 Build Args (necessários para compilar o frontend)
No Easypanel, em **Build Args**:
```
NEXT_PUBLIC_SUPABASE_URL     = <mesmo valor>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <mesmo valor>
```

### 4.5 Deploy
Clique em **Deploy**. O Easypanel irá:
1. Clonar o repositório
2. Fazer o build com o Dockerfile (multi-stage)
3. Subir o container
4. Configurar HTTPS automático via Let's Encrypt

---

## 5. Webhooks para N8N

### Autenticação
Todos os webhooks requerem o header:
```
Authorization: Bearer meu-token-secreto-n8n
```

Substitua pelo valor do seu `WEBHOOK_SECRET_TOKEN`.

---

### 5.1 Criar novo lead

**Endpoint:** `POST /api/webhook/n8n/novo-lead`

**Body:**
```json
{
  "nome": "Maria Silva",
  "telefone": "(11) 99999-0001",
  "origem": "Instagram",
  "procedimento": "Consulta Dermatológica",
  "prioridade": "urgente",
  "nota": "Paciente tem urgência",
  "valor_consulta": 350.00,
  "chatwoot_url": "https://app.chatwoot.com/app/accounts/1/conversations/123"
}
```

**Resposta (201):**
```json
{
  "success": true,
  "lead": { "id": "uuid", "nome": "Maria Silva", ... }
}
```

**Valores válidos para `origem`:** `Instagram` | `Google` | `WhatsApp` | `Indicação`
**Valores válidos para `prioridade`:** `urgente` | `alta` | `normal` | `frio`

---

### 5.2 Mover card entre etapas

**Endpoint:** `POST /api/webhook/n8n/mover-card`

**Body:**
```json
{
  "card_id": "uuid-do-lead",
  "etapa_destino": "Qualificado",
  "motivo": "Lead respondeu à mensagem e confirmou interesse"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "lead": { "id": "uuid", "etapa_atual": "Qualificado", ... }
}
```

**Etapas válidas (exatamente como listadas):**
- `Novo Lead` | `Triagem IA` | `Qualificado` | `Proposta Consulta` | `Agendando`
- `Agendado` | `Pago / Confirmado` | `Compareceu` | `No Show` | `Pós Consulta`
- `Follow-up` | `Retorno Marcado` | `Recorrente` | `Perdido` | `Reativação`

---

### 5.3 Atualizar campos do card

**Endpoint:** `POST /api/webhook/n8n/atualizar-card`

**Body:**
```json
{
  "card_id": "uuid-do-lead",
  "valor_consulta": 500.00,
  "nota": "Pagamento confirmado via PIX",
  "chatwoot_url": "https://..."
}
```

Campos atualizáveis: `nome`, `telefone`, `origem`, `procedimento`, `prioridade`, `valor_consulta`, `nota`, `chatwoot_url`

**Resposta (200):**
```json
{ "success": true, "lead": { ... } }
```

---

### 5.4 Adicionar nota ao histórico

**Endpoint:** `POST /api/webhook/n8n/adicionar-nota`

**Body:**
```json
{
  "card_id": "uuid-do-lead",
  "nota": "Paciente confirmou que vem amanhã às 14h",
  "autor": "IA Atendente"
}
```

**Resposta (201):**
```json
{ "success": true, "nota": { "id": "uuid", "conteudo": "...", ... } }
```

---

### 5.5 Consultar pipeline completo

**Endpoint:** `GET /api/webhook/n8n/pipeline`
**Endpoint com filtro:** `GET /api/webhook/n8n/pipeline?etapa=Novo Lead`

**Resposta (200):**
```json
{
  "total": 42,
  "por_etapa": {
    "Novo Lead": [ { "id": "...", "nome": "...", ... } ],
    "Triagem IA": [ ... ],
    ...
  },
  "leads": [ ... ]
}
```

---

## 6. Configurar N8N

### Fluxo sugerido: Novo lead do WhatsApp → CRM

1. **Trigger**: WhatsApp Business (mensagem recebida)
2. **HTTP Request**:
   - Method: `POST`
   - URL: `https://seu-dominio.com/api/webhook/n8n/novo-lead`
   - Headers: `Authorization: Bearer meu-token-secreto-n8n`
   - Body: preencher com dados do WhatsApp
3. **Wait** (aguarda resposta do IA)
4. **HTTP Request** (mover card):
   - URL: `https://seu-dominio.com/api/webhook/n8n/mover-card`
   - Body: `{ "card_id": "{{ $node['Criar Lead'].json.lead.id }}", "etapa_destino": "Triagem IA", "motivo": "IA processando" }`

---

## 7. Estrutura de Arquivos

```
meu-crm-consultorio/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Página principal
│   │   ├── layout.tsx                  # Layout raiz
│   │   ├── globals.css                 # Estilos globais
│   │   └── api/
│   │       ├── health/route.ts         # Health check
│   │       ├── leads/
│   │       │   ├── route.ts            # GET /leads, POST /leads
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET/PUT/DELETE /leads/:id
│   │       │       ├── historico/route.ts
│   │       │       └── notas/route.ts
│   │       └── webhook/n8n/
│   │           ├── novo-lead/route.ts
│   │           ├── mover-card/route.ts
│   │           ├── atualizar-card/route.ts
│   │           ├── adicionar-nota/route.ts
│   │           └── pipeline/route.ts
│   ├── components/
│   │   ├── kanban/                     # KanbanBoard, KanbanColumn, KanbanCard
│   │   ├── dashboard/                  # Dashboard com gráficos
│   │   ├── ui/                         # Componentes base (Button, Dialog, etc.)
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── LeadModal.tsx
│   │   ├── AddLeadModal.tsx
│   │   ├── ListView.tsx
│   │   └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── supabase.ts                 # Client-side Supabase
│   │   ├── supabase-server.ts          # Server-side Supabase (service role)
│   │   ├── types.ts                    # TypeScript interfaces
│   │   ├── constants.ts               # 15 etapas do pipeline
│   │   └── utils.ts                   # Helpers (SLA, formatação, etc.)
│   └── providers/
│       └── ThemeProvider.tsx
├── database.sql                        # Schema completo do Supabase
├── Dockerfile                          # Multi-stage build otimizado
├── docker-compose.yml                  # Para Easypanel
├── .env.local.example                  # Template de variáveis
└── LEIAME.md
```

---

## 8. Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Kanban drag-and-drop | Mova cards entre as 15 etapas |
| Modo escuro/claro | Toggle no header |
| Busca em tempo real | Por nome ou telefone |
| Filtros de prioridade | Urgente / Alta / Normal / Frio |
| "Ver Todos no Pipeline" | Ignora filtros, exibe todos |
| Vista em lista | Tabela ordenável |
| Modal de detalhes | Histórico + notas + edição |
| Tags visuais | AUTO (N8N) + SLA! (vencido) |
| Indicador SLA | Verde / Amarelo / Vermelho pulsando |
| Dashboard | 6 métricas + 4 gráficos + 3 painéis |
| Realtime | Atualização automática via Supabase |
| Webhooks N8N | 5 endpoints com autenticação Bearer |

---

## 9. Suporte

Em caso de dúvidas:
- Verifique os logs no Easypanel (aba **Logs** do serviço)
- Teste os webhooks com Insomnia/Postman antes do N8N
- Para problemas de CORS, adicione o domínio nas políticas do Supabase
