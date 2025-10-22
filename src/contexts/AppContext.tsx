import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  date: string;
  time: string;
  services: string[];
  notes?: string;
}

interface Salon {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface AppContextType {
  services: Service[];
  bookings: Booking[];
  salon: Salon | null;
  addBooking: (booking: any) => Promise<void>;
  loadServices: () => Promise<void>;
  loadBookings: () => Promise<void>;
  loadSalon: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadSalon = async () => {
    try {
      const { data, error } = await supabase
        .from('salon')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setSalon(data);
    } catch (error) {
      console.error('Error loading salon:', error);
    }
  };

  const addBooking = async (bookingData: any) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_name: bookingData.customerName,
          customer_phone: bookingData.customerPhone,
          customer_email: bookingData.customerEmail,
          date: bookingData.date,
          time: bookingData.time,
          services: bookingData.services,
          notes: bookingData.observations
        })
        .select()
        .single();

      if (error) throw error;

      setBookings(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error adding booking:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadServices();
    loadBookings();
    loadSalon();
  }, []);

  const value: AppContextType = {
    services,
    bookings,
    salon,
    addBooking,
    loadServices,
    loadBookings,
    loadSalon
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};