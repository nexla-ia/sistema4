import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  active: boolean;
  popular: boolean;
  on_promotion: boolean;
  promotional_price?: number;
  created_at?: string;
  updated_at?: string;
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

export interface Booking {
  id: string;
  salon_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  booking_date: string;
  booking_time: string;
  services: string[];
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  notes?: string;
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

export interface TimeSlot {
  id: string;
  salon_id: string;
  date: string;
  time_slot: string;
  status: 'available' | 'booked' | 'blocked';
  created_at?: string;
  updated_at?: string;
}

// Services
export const getServices = async () => {
  if (!isSupabaseConfigured) {
    const { mockServices } = await import('./mockSupabase');
    return { data: mockServices, error: null };
  }
  return await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('popular', { ascending: false });
};

export const createService = async (service: Omit<Service, 'id' | 'created_at' | 'updated_at'>, salonId: string) => {
  return await supabase
    .from('services')
    .insert({ ...service, salon_id: salonId })
    .select()
    .single();
};

export const updateService = async (id: string, updates: Partial<Service>) => {
  return await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

export const deleteService = async (id: string) => {
  return await supabase
    .from('services')
    .delete()
    .eq('id', id);
};

// Salons
export const getSalonByUserId = async (userId: string) => {
  return await supabase
    .from('salons')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
};

// Reviews
export const getReviews = async (salonId?: string) => {
  if (!isSupabaseConfigured) {
    const { mockReviews } = await import('./mockSupabase');
    return { data: mockReviews, error: null };
  }
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (salonId) {
    query = query.eq('salon_id', salonId);
  }

  return await query;
};

export const createReview = async (reviewData: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'approved'>) => {
  if (!isSupabaseConfigured) {
    return { data: { id: Date.now().toString(), ...reviewData, approved: false }, error: null };
  }
  return await supabase
    .from('reviews')
    .insert({ ...reviewData, approved: false })
    .select()
    .single();
};

// Bookings
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {
  if (!isSupabaseConfigured) {
    return { data: { id: Date.now().toString(), ...bookingData, status: 'pending' as const }, error: null };
  }
  return await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();
};

export const getBookings = async (salonId: string) => {
  return await supabase
    .from('bookings')
    .select('*')
    .eq('salon_id', salonId)
    .order('booking_date', { ascending: true });
};

// Time Slots
export const getAvailableSlots = async (salonId: string, date: string) => {
  return await supabase
    .from('time_slots')
    .select('*')
    .eq('salon_id', salonId)
    .eq('date', date)
    .eq('status', 'available')
    .order('time_slot', { ascending: true });
};

// Auth
export const signOut = async () => {
  return await supabase.auth.signOut();
};
