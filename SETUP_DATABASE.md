# 🗄️ Configuração do Banco de Dados Supabase

Este projeto utiliza **Supabase** como banco de dados. Siga os passos abaixo para configurar sua própria instância.

## 📋 Pré-requisitos

- Conta no Supabase (gratuita): https://supabase.com
- Node.js e npm instalados

## 🚀 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha os dados:
   - **Name**: Centro Terapêutico
   - **Database Password**: Escolha uma senha forte (guarde-a!)
   - **Region**: Selecione a região mais próxima
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto ser criado

### 2. Obter Credenciais

Após a criação do projeto:

1. No dashboard, vá em **Settings** → **API**
2. Você verá duas informações importantes:
   - **Project URL** (exemplo: `https://xyzcompany.supabase.co`)
   - **anon public** (a chave anon/public)

### 3. Configurar Variáveis de Ambiente

1. Abra o arquivo `.env` na raiz do projeto
2. Substitua os valores pelas suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 4. Executar Migrations (Criar Tabelas)

As migrations SQL estão na pasta `supabase/migrations/`. Execute-as na seguinte ordem:

#### Opção A: Via Dashboard (Recomendado)

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em **"New Query"**
3. Cole o conteúdo de cada arquivo na ordem abaixo e execute:

   **a) Criar Schema (Tabelas)**
   - Arquivo: `20251023_create_centro_terapeutico_schema.sql`
   - Cria todas as tabelas: salons, services, bookings, reviews, time_slots

   **b) Configurar Segurança (RLS)**
   - Arquivo: `20251023_rls_policies.sql`
   - Cria todas as políticas de segurança

   **c) Adicionar Dados Iniciais**
   - Arquivo: `20251023_seed_data.sql`
   - Popula o banco com dados de exemplo

#### Opção B: Via CLI do Supabase

Se preferir usar a CLI:

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Aplicar migrations
supabase db push
```

### 5. Configurar Autenticação (Opcional)

Para usar o painel administrativo:

1. No Supabase Dashboard, vá em **Authentication** → **Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Preencha:
   - **Email**: admin@centroterapeutico.com (ou outro email)
   - **Password**: Senha forte
4. Confirme o email do usuário automaticamente
5. Use essas credenciais para fazer login no painel admin

### 6. Testar a Aplicação

```bash
# Instalar dependências
npm install

# Iniciar aplicação
npm run dev
```

Acesse http://localhost:5173 e teste:
- ✅ Ver serviços na página inicial
- ✅ Criar agendamentos
- ✅ Deixar avaliações
- ✅ Login no painel admin (use as credenciais criadas no passo 5)

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

1. **salons** - Informações do centro terapêutico
2. **services** - Serviços oferecidos (massagens, terapias, etc)
3. **bookings** - Agendamentos dos clientes
4. **reviews** - Avaliações dos clientes
5. **time_slots** - Horários disponíveis para agendamento

### Dados Iniciais (Seeds)

O banco vem pré-populado com:
- ✅ 1 salão de exemplo (Centro Terapêutico Bem-Estar)
- ✅ 4 serviços (Massagem Relaxante, Acupuntura, Reflexologia, Aromaterapia)
- ✅ 3 avaliações aprovadas (5 estrelas)
- ✅ Horários disponíveis para os próximos 7 dias

## 🔒 Segurança (RLS)

O banco está configurado com **Row Level Security (RLS)** ativado:

- ✅ Público pode ver serviços e avaliações aprovadas
- ✅ Qualquer pessoa pode criar agendamentos
- ✅ Apenas admins autenticados podem gerenciar serviços
- ✅ Proteção contra acesso não autorizado

## ❓ Problemas Comuns

### Erro: "Missing Supabase environment variables"

**Solução**: Verifique se o arquivo `.env` está configurado corretamente com as credenciais do Supabase.

### Erro: "Failed to fetch"

**Solução**: Verifique se:
1. O projeto Supabase está online
2. As credenciais em `.env` estão corretas
3. As migrations foram executadas

### Serviços não aparecem

**Solução**: Execute a migration de seed data (`20251023_seed_data.sql`)

### Não consigo fazer login

**Solução**:
1. Crie um usuário no Supabase Dashboard
2. Confirme o email do usuário
3. Use essas credenciais para login

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [Guia de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API Reference](https://supabase.com/docs/reference/javascript/introduction)

## 🆘 Suporte

Caso tenha problemas:
1. Verifique os logs no console do navegador (F12)
2. Revise as migrations SQL no painel do Supabase
3. Confirme que as variáveis de ambiente estão corretas

---

**Desenvolvido para Centro Terapêutico Bem-Estar** 🌿
