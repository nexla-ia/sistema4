import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, Service, Booking, Salon } from '../lib/localDatabase';

interface AppContextType {
  services: Service[];
  bookings: Booking[];
  salon: Salon | null;
  addBooking: (booking: any) => void;
  loadServices: () => void;
  loadBookings: () => void;
  loadSalon: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salon, setSalon] = useState<Salon | null>(null);

  const loadServices = () => {
    try {
      const data = db.getServices();
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadBookings = () => {
    try {
      const data = db.getBookings();
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadSalon = () => {
    try {
      const data = db.getSalon();
      setSalon(data);
    } catch (error) {
      console.error('Error loading salon:', error);
    }
  };

  const addBooking = (bookingData: any) => {
    try {
      const newBooking = db.createBooking({
        customer: {
          name: bookingData.customerName,
          phone: bookingData.customerPhone,
          email: bookingData.customerEmail
        },
        date: bookingData.date,
        time: bookingData.time,
        services: bookingData.services,
        notes: bookingData.observations
      });

      setBookings(prev => [...prev, newBooking]);
    } catch (error) {
      console.error('Error adding booking:', error);
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