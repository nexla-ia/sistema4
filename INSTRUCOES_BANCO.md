# Instruções para Configurar as Tabelas no Supabase

## Tabelas que precisam ser criadas

Você precisa executar o SQL da migração no seu banco de dados Supabase para criar a tabela `slots` que está faltando.

## Como executar a migração

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `supabase/migrations/20251022150500_create_missing_tables.sql`
6. Clique em **Run** para executar

## O que será criado

A migração criará:

### 1. Tabela `slots`
- Armazena todos os horários disponíveis para agendamento
- Campos principais:
  - `salon_id`: ID do salão
  - `date`: Data do slot
  - `time_slot`: Horário (08:00, 08:30, 09:00, etc.)
  - `status`: 'available', 'booked' ou 'blocked'
  - `booking_id`: ID do agendamento (se estiver ocupado)

### 2. Políticas de Segurança (RLS)
- Usuários anônimos podem ver slots disponíveis
- Administradores podem gerenciar todos os slots

### 3. Função `generate_slots_for_date()`
- Gera automaticamente slots de 30 em 30 minutos (8h às 17h30)
- Útil para criar horários rapidamente

### 4. Dados Iniciais
- A migração já criará automaticamente slots para os próximos 30 dias
- Exclui domingos automaticamente

## Verificar se funcionou

Após executar a migração, você pode verificar se tudo está certo executando:

```sql
-- Ver total de slots criados
SELECT COUNT(*) FROM slots;

-- Ver slots de hoje
SELECT * FROM slots WHERE date = CURRENT_DATE ORDER BY time_slot;

-- Ver distribuição por status
SELECT status, COUNT(*) FROM slots GROUP BY status;
```

## Estrutura Completa do Banco

Após executar todas as migrações, seu banco terá estas tabelas:

1. **salons** - Dados dos salões
2. **services** - Serviços oferecidos
3. **customers** - Clientes que fazem agendamentos
4. **bookings** - Agendamentos realizados
5. **booking_services** - Relacionamento entre agendamentos e serviços
6. **slots** - Horários disponíveis (NOVA)
7. **blocked_slots** - Horários bloqueados manualmente
8. **reviews** - Avaliações dos clientes
9. **salon_settings** - Configurações do salão
10. **users** - Usuários do sistema

## Problemas Comuns

### Erro: "relation 'slots' already exists"
Se você já executou a migração antes, não precisa executar novamente.

### Erro: "foreign key violation"
Certifique-se de que existe pelo menos um salão cadastrado na tabela `salons`.

### Erro: "function update_updated_at_column does not exist"
Execute primeiro as migrações anteriores que criam essa função.
