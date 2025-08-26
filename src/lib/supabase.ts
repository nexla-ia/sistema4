import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility function to ensure time format includes seconds
const formatTimeWithSeconds = (time: string): string => {
  if (!time) return time;
  // If time is in HH:MM format, add :00 seconds
  if (time.includes(':') && time.split(':').length === 2) {
    return `${time}:00`;
  }
  return time;
};

// Utility function to remove seconds from time for display
const formatTimeForDisplay = (time: string): string => {
  if (!time) return time;
  // If time is in HH:MM:SS format, remove seconds
  if (time.includes(':') && time.split(':').length === 3) {
    return time.substring(0, 5); // Get only HH:MM
  }
  return time;
};

// Types
export interface Service {
  id: string;
  salon_id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  category: string;
  active: boolean;
  popular: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: string;
  salon_id: string;
  customer_id: string;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  total_price: number;
  total_duration_minutes: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  customer?: Customer;
  booking_services?: BookingService[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  price: number;
  created_at?: string;
  service?: Service;
}

export interface Salon {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  opening_hours?: any;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id: string;
  salon_id: string;
  customer_name: string;
  customer_identifier: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Slot {
  id: string;
  salon_id: string;
  date: string;
  time_slot: string;
  status: 'available' | 'blocked' | 'booked';
  booking_id?: string;
  blocked_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkingHours {
  id: string;
  salon_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time?: string;
  close_time?: string;
  break_start?: string;
  break_end?: string;
  slot_duration?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DefaultSchedule {
  open_time: string;
  close_time: string;
  slot_duration: number;
  break_start?: string;
  break_end?: string;
}

// Constants

// Services
export const getServices = async () => {
  console.log('🔍 Buscando serviços...');
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('name');
  
  console.log('Resultado da consulta:');
  console.log('- Data:', data);
  console.log('- Error:', error);
  console.log('- Quantidade de serviços:', data?.length || 0);
  
  if (error) {
    console.error('Erro ao buscar serviços:', error);
  }
  
  return { data, error };
};

export const createService = async (
  service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'salon_id'>,
  salonId: string
) => {
  const { data, error } = await supabase
    .from('services')
    .insert([
      {
        ...service,
        salon_id: salonId,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar serviço:', error);
  } else {
    console.log('✅ Serviço criado:', data);
  }

  return { data, error };
};

export const updateService = async (id: string, updates: Partial<Service>) => {
  console.log('📝 Atualizando serviço:', id, updates);
  
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao atualizar serviço:', error);
  } else {
    console.log('✅ Serviço atualizado:', data);
  }
  
  return { data, error };
};

export const deleteService = async (id: string) => {
  console.log('🗑️ Deletando serviço:', id);
  
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao deletar serviço:', error);
  } else {
    console.log('✅ Serviço deletado');
  }
  
  return { error };
};

// Customers
export const findOrCreateCustomer = async (customerData: { name: string; phone: string; email?: string }) => {
  console.log('👤 Buscando ou criando cliente:', customerData);
  
  // Primeiro, tenta encontrar o cliente pelo telefone
  const { data: existingCustomer, error: searchError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customerData.phone)
    .maybeSingle();
  
  if (searchError && searchError.code !== 'PGRST116') {
    console.error('Erro ao buscar cliente:', searchError);
    return { data: null, error: searchError };
  }
  
  if (existingCustomer) {
    console.log('✅ Cliente encontrado:', existingCustomer);
    return { data: existingCustomer, error: null };
  }
  
  // Se não encontrou, cria um novo cliente
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert([customerData])
    .select()
    .single();
  
  if (createError) {
    console.error('Erro ao criar cliente:', createError);
    return { data: null, error: createError };
  }
  
  console.log('✅ Cliente criado:', newCustomer);
  return { data: newCustomer, error: null };
};

// Bookings
export const createBooking = async (bookingData: {
  customer: { name: string; phone: string; email?: string };
  date: string;
  time: string;
  services: string[];
  notes?: string;
}) => {
  console.log('📅 Iniciando criação de agendamento:', bookingData);
  
  try {
    // Get the first active salon
    const { data: salon, error: salonError } = await supabase
      .from('salons')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle();
    
    if (salonError || !salon) {
      console.error('❌ Erro ao buscar salão:', salonError);
      return { data: null, error: salonError || new Error('Salão não encontrado') };
    }
    
    const salonId = salon.id;
    console.log('🏢 Salão encontrado:', salonId);
    
    // Find or create customer
    const { data: customer, error: customerError } = await findOrCreateCustomer(bookingData.customer);
    
    if (customerError || !customer) {
      console.error('❌ Erro ao criar/encontrar cliente:', customerError);
      return { data: null, error: customerError || new Error('Erro ao processar cliente') };
    }
    
    console.log('👤 Cliente processado:', customer);
    
    // Get services data
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .in('id', bookingData.services);
    
    if (servicesError || !services || services.length === 0) {
      console.error('❌ Erro ao buscar serviços:', servicesError);
      return { data: null, error: servicesError || new Error('Serviços não encontrados') };
    }
    
    console.log('🛍️ Serviços encontrados:', services);
    
    // Calculate totals
    const totalPrice = services.reduce((sum, service) => sum + Number(service.price), 0);
    const totalDuration = services.reduce((sum, service) => sum + service.duration_minutes, 0);
    
    console.log('💰 Total calculado:', { totalPrice, totalDuration });
    
    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        salon_id: salonId,
        customer_id: customer.id,
        booking_date: bookingData.date,
        booking_time: formatTimeWithSeconds(bookingData.time),
        status: 'confirmed',
        total_price: totalPrice,
        total_duration_minutes: totalDuration,
        notes: bookingData.notes || null
      }])
      .select()
      .single();
    
    if (bookingError) {
      console.error('❌ Erro ao criar agendamento:', bookingError);
      return { data: null, error: bookingError };
    }
    
    console.log('📅 Agendamento criado:', booking);
    
    // Create booking services
    const bookingServices = services.map(service => ({
      booking_id: booking.id,
      service_id: service.id,
      price: Number(service.price)
    }));
    
    const { error: servicesLinkError } = await supabase
      .from('booking_services')
      .insert(bookingServices);
    
    if (servicesLinkError) {
      console.error('❌ Erro ao vincular serviços:', servicesLinkError);
      // Continue anyway, booking was created
    } else {
      console.log('🔗 Serviços vinculados ao agendamento');
    }
    
    // Se o status for 'completed' ou 'no_show', liberar o slot
    if (status === 'completed' || status === 'no_show') {
      console.log('🔓 Liberando slot do agendamento concluído/não compareceu');
      
      const { error: slotError } = await supabase
        .from('slots')
        .update({ 
          status: 'available', 
          booking_id: null 
        })
        .eq('booking_id', bookingId);
      
      if (slotError) {
        console.warn('⚠️ Não foi possível liberar o slot (agendamento atualizado):', slotError);
      } else {
        console.log('✅ Slot liberado com sucesso');
      }
    }
    
    // Try to update slot status (optional, don't fail if it doesn't work)
    
  } catch (error) {
    console.error('❌ Erro inesperado ao atualizar agendamento:', error);
    return { data: null, error };
  }
    try {
      const { data: slot } = await supabase
        .from('slots')
        .select('*')
        .eq('salon_id', salonId)
        .eq('date', bookingData.date)
        .eq('time_slot', formatTimeWithSeconds(bookingData.time))
        .eq('status', 'available')
        .limit(1)
        .maybeSingle();
      
      if (slot) {
        console.log('🎯 Slot encontrado para atualização:', slot.id);
        
        const { error: slotError } = await supabase
          .from('slots')
          .update({ status: 'booked', booking_id: booking.id })
          .eq('id', slot.id);
        
        if (slotError) {
          console.warn('⚠️ Não foi possível atualizar slot (agendamento mantido):', slotError);
        } else {
          console.log('✅ Slot atualizado para booked');
        }
      } else {
        console.warn('⚠️ Slot não encontrado para atualização (agendamento mantido)');
      }
    } catch (slotError) {
      console.warn('⚠️ Erro ao tentar atualizar slot (agendamento mantido):', slotError);
    }

    console.log('✅ Agendamento criado com sucesso');
    return { data: booking, error: null };
    
  } catch (error) {
    console.error('❌ Erro inesperado ao criar agendamento:', error);
    return { data: null, error };
  }
};

export const getBookings = async (salonId: string, date?: string) => {
  console.log('📅 Buscando agendamentos para:', date || 'todas as datas');
  
  let query = supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      booking_services(
        *,
        service:services(*)
      )
    `)
    .eq('salon_id', salonId)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });
  
  if (date) {
    query = query.eq('booking_date', date);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Erro ao buscar agendamentos:', error);
  } else {
    console.log(`✅ ${data?.length || 0} agendamentos encontrados`);
  }
  
  return { data, error };
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
  console.log('📝 Atualizando status do agendamento:', bookingId, status);
  
  try {
    // Primeiro, buscar o agendamento atual para obter informações do slot
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();
    
    if (fetchError) {
      console.error('Erro ao buscar agendamento:', fetchError);
      return { data: null, error: fetchError };
    }
    
    // Atualizar o status do agendamento
  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao atualizar status:', error);
  } else {
    console.log('✅ Status atualizado:', data);
  }
  
  return { data, error };
};

// Slots
export const getAvailableSlots = async (date: string) => {
  console.log('🕐 Buscando slots disponíveis para:', date);
  
  // Get the first active salon since we don't have user context here
  const { data: salon, error: salonError } = await supabase
    .from('salons')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  
  if (salonError || !salon) {
    console.error('Erro ao buscar salão:', salonError);
    return { data: [], error: salonError };
  }
  
  console.log('Salão encontrado:', salon.id);
  
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('salon_id', salon.id)
    .eq('date', date)
    .eq('status', 'available')
    .order('time_slot');
  
  if (error) {
    console.error('Erro ao buscar slots:', error);
    return { data: [], error };
  }
  
  console.log(`🔍 Slots encontrados para ${date}:`, data?.map(slot => ({
    time: slot.time_slot,
    status: slot.status,
    booking_id: slot.booking_id
  })));
  
  // Convert time format for frontend display (remove seconds)
  const formattedSlots = (data || []).map(slot => ({
    ...slot,
    time_slot: formatTimeForDisplay(slot.time_slot)
  }));
  
  console.log(`✅ ${formattedSlots?.length || 0} slots disponíveis encontrados para ${date}`);
  
  return { data: formattedSlots || [], error };
};

export const getAllSlots = async (date: string) => {
  console.log('🕐 Buscando todos os slots para:', date);
  
  // Get the first active salon since we don't have user context here
  const { data: salon, error: salonError } = await supabase
    .from('salons')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  
  if (salonError || !salon) {
    console.error('Erro ao buscar salão:', salonError);
    return { data: [], error: salonError };
  }
  
  const { data, error } = await supabase
    .from('slots')
    .select(`
      *,
      booking:bookings(
        *,
        customer:customers(*),
        booking_services(
          *,
          service:services(*)
        )
      )
    `)
    .eq('salon_id', salon.id)
    .eq('date', date)
    .order('time_slot');
  
  if (error) {
    console.error('Erro ao buscar slots:', error);
    return { data: [], error };
  } else {
    console.log(`✅ ${data?.length || 0} slots encontrados`);
  }
  
  return { data: data || [], error };
};

export const saveBlockedSlots = async (date: string, timeSlots: string[], reason: string, salonId: string) => {
  console.log('🚫 Bloqueando slots:', { date, timeSlots, reason });
  
  const updates = timeSlots.map(time => ({
    salon_id: salonId,
    date,
    time_slot: time,
    status: 'blocked' as const,
    blocked_reason: reason,
    booking_id: null
  }));
  
  const { data, error } = await supabase
    .from('slots')
    .upsert(updates, {
      onConflict: 'salon_id,date,time_slot'
    });
  
  if (error) {
    console.error('Erro ao bloquear slots:', error);
  } else {
    console.log('✅ Slots bloqueados com sucesso');
  }
  
  return { data, error };
};

// Working Hours
export const getDefaultSchedule = async (salonId: string): Promise<{ data: DefaultSchedule | null; error: any }> => {
  console.log('⚙️ Buscando configuração padrão de horários...');
  
  const { data, error } = await supabase
    .from('working_hours')
    .select('*')
    .eq('salon_id', salonId)
    .eq('day_of_week', 1) // Segunda-feira como referência
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar configuração:', error);
    return { data: null, error };
  }
  
  if (!data) {
    console.log('📝 Nenhuma configuração encontrada, usando padrão');
    return {
      data: {
        open_time: '08:00',
        close_time: '18:00',
        slot_duration: 30,
        break_start: '12:00',
        break_end: '13:00'
      },
      error: null
    };
  }
  
  const schedule: DefaultSchedule = {
    open_time: data.open_time ? formatTimeForDisplay(data.open_time.toString()) : '08:00',
    close_time: data.close_time ? formatTimeForDisplay(data.close_time.toString()) : '18:00',
    slot_duration: data.slot_duration || 30,
    break_start: data.break_start ? formatTimeForDisplay(data.break_start.toString()) : undefined,
    break_end: data.break_end ? formatTimeForDisplay(data.break_end.toString()) : undefined
  };
  
  console.log('✅ Configuração carregada:', schedule);
  return { data: schedule, error: null };
};

export const saveDefaultSchedule = async (schedule: DefaultSchedule, salonId: string) => {
  console.log('💾 Salvando configuração padrão:', schedule);
  
  try {
    // Salvar para todos os dias da semana (0 = domingo, 6 = sábado)
    const workingHoursData = [];
    
    for (let day = 0; day <= 6; day++) {
      workingHoursData.push({
        salon_id: salonId,
        day_of_week: day,
        is_open: day === 0 ? false : true, // Domingo fechado por padrão
        open_time: formatTimeWithSeconds(schedule.open_time),
        close_time: formatTimeWithSeconds(schedule.close_time),
        break_start: schedule.break_start ? formatTimeWithSeconds(schedule.break_start) : null,
        break_end: schedule.break_end ? formatTimeWithSeconds(schedule.break_end) : null,
        slot_duration: schedule.slot_duration
      });
    }
    
    const { data, error } = await supabase
      .from('working_hours')
      .upsert(workingHoursData, {
        onConflict: 'salon_id,day_of_week'
      });
    
    if (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      return { data: null, error };
      return { data: null, error };
    }
    
    console.log('✅ Configuração salva com sucesso');
    return { data, error: null };
    
  } catch (error) {
    console.error('❌ Erro inesperado ao salvar configuração:', error);
    return { data: null, error };
  }
};

export const generateSlotsWithSavedConfig = async (startDate: string, endDate: string, salonId: string) => {
  console.log('🔄 Gerando slots com configuração salva:', { startDate, endDate });
  
  // Primeiro, buscar a configuração salva para este salão
  const { data: schedule, error: configError } = await getDefaultSchedule(salonId);
  
  if (configError) {
    console.error('❌ Erro ao buscar configuração:', configError);
    return { error: configError };
  }
  
  if (!schedule) {
    console.error('❌ Nenhuma configuração encontrada');
    return { error: { message: 'Configuração não encontrada' } };
  }
  
  // Gerar slots usando a função RPC
  const { error } = await supabase.rpc('generate_slots_for_period', {
    p_salon_id: salonId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_open_time: schedule.open_time, // A função SQL vai converter automaticamente
    p_close_time: schedule.close_time,
    p_slot_duration: schedule.slot_duration,
    p_break_start: schedule.break_start || null,
    p_break_end: schedule.break_end || null
  });
  
  if (error) {
    console.error('❌ Erro ao gerar slots:', error);
    return { error };
  }
  
  console.log('✅ Slots gerados com sucesso');
  return { error: null };
};

export const deleteAllSlots = async (salonId: string) => {
  console.log('🗑️ Deletando todos os slots do salão:', salonId);
  
  try {
    // Primeiro, deletar apenas slots que não estão agendados (available ou blocked)
    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('salon_id', salonId)
      .in('status', ['available', 'blocked']);
    
    if (error) {
      console.error('❌ Erro ao deletar slots:', error);
      return { error };
    }
    
    console.log('✅ Todos os slots disponíveis e bloqueados foram deletados');
    return { error: null };
    
  } catch (error) {
    console.error('❌ Erro inesperado ao deletar slots:', error);
    return { error };
  }
};

// Authentication
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { data: user, error };
};

export const signIn = async (email: string, password: string) => {
  console.log('🔐 Fazendo login:', email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Erro no login:', error);
  } else {
    console.log('✅ Login realizado com sucesso');
  }
  
  return { data, error };
};

export const signOut = async () => {
  console.log('🚪 Fazendo logout...');
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Erro no logout:', error);
  } else {
    console.log('✅ Logout realizado com sucesso');
  }
  
  return { error };
};

export const getSalonByUserId = async (userId: string) => {
  console.log('🏢 Buscando salão do usuário:', userId);
  
  const { data, error } = await supabase
    .from('salons')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Erro ao buscar salão:', error);
  } else {
    console.log('✅ Salão encontrado:', data);
  }
  
  return { data, error };
};

export const updateSalonOpeningHours = async (salonId: string, openingHours: any) => {
  console.log('🕐 Atualizando horários do salão:', salonId, openingHours);
  
  const { data, error } = await supabase
    .from('salons')
    .update({ opening_hours: openingHours })
    .eq('id', salonId)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao atualizar horários:', error);
  } else {
    console.log('✅ Horários atualizados:', data);
  }
  
  return { data, error };
};

// Reviews
export const getReviews = async () => {
  console.log('⭐ Buscando avaliações aprovadas...');
  
  // Check if Supabase is properly configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase configuration missing');
    return { data: [], error: new Error('Supabase configuration missing') };
  }
  
  // First, get the first active salon since we don't have a specific salon context
  const { data: salon, error: salonError } = await supabase
    .from('salons')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  
  if (salonError) {
    console.error('Erro ao buscar salão:', salonError);
    return { data: [], error: salonError };
  }
  
  if (!salon) {
    console.log('Nenhum salão ativo encontrado');
    return { data: [], error: null };
  }
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('salon_id', salon.id)
    .eq('approved', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar avaliações:', error);
    return { data: [], error };
  } else {
    console.log(`✅ ${data?.length || 0} avaliações encontradas`);
  }
  
  return { data: data || [], error };
};

export const getAllReviews = async (salonId: string) => {
  console.log('⭐ Buscando todas as avaliações (admin)...');
  
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar avaliações:', error);
  } else {
    console.log(`✅ ${data?.length || 0} avaliações encontradas`);
  }
  
  return { data, error };
};

export const createReview = async (reviewData: {
  customer_name: string;
  rating: number;
  comment: string;
}) => {
  console.log('⭐ Criando avaliação:', reviewData);
  
  // Get the first active salon
  const { data: salon, error: salonError } = await supabase
    .from('salons')
    .select('id')
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  
  if (salonError || !salon) {
    console.error('Erro ao buscar salão:', salonError);
    return { data: null, error: salonError || new Error('Salão não encontrado') };
  }
  
  // Use phone number as identifier if available, otherwise use name
  const customerIdentifier = reviewData.customer_name.toLowerCase().replace(/\s+/g, '');
  
  const { data, error } = await supabase
    .from('reviews')
    .insert([{
      ...reviewData,
      customer_identifier: customerIdentifier,
      salon_id: salon.id,
      approved: true // Auto-aprovar por enquanto
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao criar avaliação:', error);
  } else {
    console.log('✅ Avaliação criada:', data);
  }
  
  return { data, error };
};

export const approveReview = async (reviewId: string) => {
  console.log('✅ Aprovando avaliação:', reviewId);
  
  const { data, error } = await supabase
    .from('reviews')
    .update({ approved: true })
    .eq('id', reviewId)
    .select()
    .single();
  
  if (error) {
    console.error('Erro ao aprovar avaliação:', error);
  } else {
    console.log('✅ Avaliação aprovada:', data);
  }
  
  return { data, error };
};

export const deleteReview = async (reviewId: string) => {
  console.log('🗑️ Deletando avaliação:', reviewId);
  
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);
  
  if (error) {
    console.error('Erro ao deletar avaliação:', error);
  } else {
    console.log('✅ Avaliação deletada');
  }
  
  return { error };
};