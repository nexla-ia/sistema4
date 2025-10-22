# Sistema de Banco de Dados Local

## Visão Geral

O projeto agora utiliza um banco de dados local baseado em **localStorage do navegador**, eliminando completamente a dependência do Supabase.

## Estrutura do Banco

O banco de dados armazena as seguintes entidades:

### 1. Serviços (Services)
- `id`: Identificador único
- `name`: Nome do serviço
- `description`: Descrição detalhada
- `price`: Preço do serviço
- `duration_minutes`: Duração em minutos
- `category`: Categoria do serviço
- `active`: Se está ativo
- `popular`: Se é popular

### 2. Clientes (Customers)
- `id`: Identificador único
- `name`: Nome completo
- `phone`: Telefone/WhatsApp
- `email`: E-mail (opcional)
- `notes`: Observações

### 3. Agendamentos (Bookings)
- `id`: Identificador único
- `customer_id`: ID do cliente
- `booking_date`: Data do agendamento
- `booking_time`: Horário
- `status`: Status (confirmed, pending, cancelled, completed, no_show)
- `total_price`: Valor total
- `total_duration_minutes`: Duração total
- `notes`: Observações

### 4. Horários Disponíveis (Slots)
- `id`: Identificador único
- `date`: Data
- `time_slot`: Horário
- `status`: Status (available, blocked, booked)
- `booking_id`: ID do agendamento (se ocupado)
- `blocked_reason`: Motivo do bloqueio

### 5. Avaliações (Reviews)
- `id`: Identificador único
- `customer_name`: Nome do cliente
- `rating`: Avaliação (1-5 estrelas)
- `comment`: Comentário
- `approved`: Se está aprovada

### 6. Horários de Funcionamento (Working Hours)
- `day_of_week`: Dia da semana (0-6)
- `is_open`: Se está aberto
- `open_time`: Horário de abertura
- `close_time`: Horário de fechamento
- `break_start`: Início do intervalo
- `break_end`: Fim do intervalo
- `slot_duration`: Duração dos slots

### 7. Informações da Clínica (Salon)
- `id`: Identificador único
- `name`: Nome da clínica
- `description`: Descrição
- `address`: Endereço
- `phone`: Telefone
- `email`: E-mail
- `active`: Se está ativa

## Uso do Banco de Dados

### Importar o Banco

```typescript
import { db } from './lib/localDatabase';
```

### Operações Principais

#### Serviços
```typescript
// Listar serviços ativos
const services = db.getServices();

// Criar serviço
const newService = db.createService({
  name: 'Massagem',
  description: 'Massagem relaxante',
  price: 100,
  duration_minutes: 60,
  category: 'Massoterapia',
  active: true,
  popular: false
});

// Atualizar serviço
db.updateService(id, { price: 120 });

// Deletar serviço
db.deleteService(id);
```

#### Agendamentos
```typescript
// Criar agendamento
const booking = db.createBooking({
  customer: {
    name: 'João Silva',
    phone: '(11) 99999-9999',
    email: 'joao@email.com'
  },
  date: '2025-10-25',
  time: '14:00',
  services: ['service-id-1', 'service-id-2'],
  notes: 'Primeira vez'
});

// Listar agendamentos
const bookings = db.getBookings();
const bookingsToday = db.getBookings('2025-10-25');

// Atualizar status
db.updateBookingStatus(bookingId, 'completed');
```

#### Horários (Slots)
```typescript
// Gerar slots para um período
db.generateSlots('2025-10-25', '2025-11-25');

// Buscar horários disponíveis
const availableSlots = db.getAvailableSlots('2025-10-25');

// Bloquear horários
db.saveBlockedSlots(
  '2025-10-25',
  ['14:00', '14:30', '15:00'],
  'Almoço'
);

// Deletar todos os slots (exceto agendados)
db.deleteAllSlots();
```

#### Configuração de Horários
```typescript
// Buscar configuração padrão
const schedule = db.getDefaultSchedule();

// Salvar configuração
db.saveDefaultSchedule({
  open_time: '08:00',
  close_time: '18:00',
  slot_duration: 30,
  break_start: '12:00',
  break_end: '13:00'
});
```

#### Avaliações
```typescript
// Criar avaliação
const review = db.createReview({
  customer_name: 'Maria Santos',
  rating: 5,
  comment: 'Excelente atendimento!'
});

// Listar avaliações aprovadas
const reviews = db.getReviews();

// Listar todas as avaliações
const allReviews = db.getAllReviews();

// Aprovar avaliação
db.approveReview(reviewId);

// Deletar avaliação
db.deleteReview(reviewId);
```

## Dados Iniciais

Ao inicializar o banco pela primeira vez, são criados automaticamente:

1. **Informações da clínica** com dados padrão
2. **3 serviços de exemplo**:
   - Massagem Relaxante (R$ 120 - 60min)
   - Reflexologia (R$ 80 - 45min)
   - Acupuntura (R$ 150 - 60min)
3. **Horários de funcionamento padrão**:
   - Segunda a Sábado: 08:00 às 18:00
   - Intervalo: 12:00 às 13:00
   - Slots de 30 minutos
   - Domingo: Fechado

## Armazenamento

Todos os dados são salvos no **localStorage** do navegador com o prefixo `therapyCenter_`.

### Chaves de Armazenamento:
- `therapyCenter_salon`: Informações da clínica
- `therapyCenter_services`: Serviços
- `therapyCenter_customers`: Clientes
- `therapyCenter_bookings`: Agendamentos
- `therapyCenter_slots`: Horários
- `therapyCenter_workingHours`: Horários de funcionamento
- `therapyCenter_reviews`: Avaliações

## Importante

- Os dados são persistentes no navegador
- Limpar o cache do navegador **apaga todos os dados**
- Cada navegador tem seu próprio banco de dados local
- Não há sincronização entre dispositivos
- Capacidade limitada do localStorage (geralmente 5-10MB)

## Migração de Dados

Para exportar/importar dados:

```typescript
// Exportar todos os dados
const data = {
  services: localStorage.getItem('therapyCenter_services'),
  bookings: localStorage.getItem('therapyCenter_bookings'),
  customers: localStorage.getItem('therapyCenter_customers'),
  // ... outras tabelas
};
console.log(JSON.stringify(data));

// Importar dados
localStorage.setItem('therapyCenter_services', importedData.services);
// ... outras tabelas
```

## Vantagens

✅ Sem dependências externas
✅ Funciona 100% offline
✅ Rápido e simples
✅ Sem custos de hospedagem de banco
✅ Privacidade total dos dados

## Limitações

⚠️ Dados limitados ao navegador
⚠️ Sem backup automático
⚠️ Não há sincronização multi-dispositivo
⚠️ Capacidade limitada de armazenamento
⚠️ Dados perdidos ao limpar cache
