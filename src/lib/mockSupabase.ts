// Mock implementation of Supabase to use localStorage instead
import { storage, type Service as MockService } from '../data/mockData';

export interface Service extends MockService {
  salon_id?: string;
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

// Mock Supabase functions
export const getServices = async () => {
  return { data: storage.getServices(), error: null };
};

export const createService = async (service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'salon_id'>, salonId: string) => {
  const newService = storage.addService(service);
  return { data: newService, error: null };
};

export const updateService = async (id: string, updates: Partial<Service>) => {
  const updated = storage.updateService(id, updates);
  return { data: updated, error: updated ? null : new Error('Service not found') };
};

export const deleteService = async (id: string) => {
  const success = storage.deleteService(id);
  return { error: success ? null : new Error('Service not found') };
};

export const signOut = async () => {
  return { error: null };
};

export const getSalonByUserId = async (userId: string) => {
  return {
    data: {
      id: crypto.randomUUID(),
      name: 'Centro Terapêutico',
      active: true
    } as Salon,
    error: null
  };
};

export const getReviews = async () => {
  return { data: storage.getReviews(), error: null };
};

export const createReview = async (reviewData: { customer_name: string; rating: number; comment: string }) => {
  const newReview = storage.addReview({
    ...reviewData,
    date: new Date().toISOString()
  });
  return { data: newReview, error: null };
};

export const createBooking = async (bookingData: any) => {
  const booking = storage.addBooking({
    customer_name: bookingData.customer.name,
    customer_phone: bookingData.customer.phone,
    customer_email: bookingData.customer.email,
    date: bookingData.date,
    time: bookingData.time,
    services: bookingData.services.map((id: string) =>
      storage.getServices().find(s => s.id === id)
    ).filter(Boolean),
    status: 'confirmed',
    total_price: 0,
    notes: bookingData.notes
  });
  return { data: booking, error: null };
};

export const getAvailableSlots = async (date: string) => {
  // Generate mock time slots
  const slots = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({
        id: `${date}-${time}`,
        salon_id: '1',
        date,
        time_slot: time,
        status: 'available' as const
      });
    }
  }
  return { data: slots, error: null };
};

// Mock supabase object
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Simple mock authentication
      if (email === 'admin@admin.com' && password === 'admin') {
        return {
          data: {
            user: { id: '1', email },
            session: { access_token: 'mock-token' }
          },
          error: null
        };
      }
      return {
        data: { user: null, session: null },
        error: new Error('Invalid credentials')
      };
    },
    signOut: async () => {
      return { error: null };
    },
    getUser: async () => {
      return {
        data: { user: { id: '1', email: 'admin@admin.com' } },
        error: null
      };
    }
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        limit: () => ({
          maybeSingle: async () => ({
            data: {
              id: '1',
              name: 'Centro Terapêutico',
              active: true
            },
            error: null
          })
        })
      })
    })
  })
};

export type { Service as ServiceType };


// Re-export storage for compatibility
export { storage } from '../data/mockData';
