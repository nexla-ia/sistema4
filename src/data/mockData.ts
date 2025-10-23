// Mock data for the application

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  active: boolean;
  popular: boolean;
  on_promotion: boolean;
  promotional_price?: number;
}

export interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  date: string;
  time: string;
  services: Service[];
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_price: number;
  notes?: string;
}

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  date: string;
}

export const mockServices: Service[] = [
  {
    id: '1',
    name: 'Massagem Relaxante',
    description: 'Massagem corporal completa para relaxamento profundo e alívio de tensões',
    price: 120,
    duration_minutes: 60,
    category: 'Massagens',
    active: true,
    popular: true,
    on_promotion: false
  },
  {
    id: '2',
    name: 'Acupuntura',
    description: 'Tratamento com agulhas para equilíbrio energético e bem-estar',
    price: 90,
    duration_minutes: 45,
    category: 'Terapias Alternativas',
    active: true,
    popular: true,
    on_promotion: true,
    promotional_price: 70
  },
  {
    id: '3',
    name: 'Reflexologia',
    description: 'Massagem nos pés que trabalha pontos reflexos do corpo',
    price: 80,
    duration_minutes: 40,
    category: 'Massagens',
    active: true,
    popular: false,
    on_promotion: false
  },
  {
    id: '4',
    name: 'Aromaterapia',
    description: 'Terapia com óleos essenciais para equilíbrio físico e emocional',
    price: 100,
    duration_minutes: 50,
    category: 'Terapias Alternativas',
    active: true,
    popular: false,
    on_promotion: false
  }
];

export const mockBookings: Booking[] = [];

export const mockReviews: Review[] = [
  {
    id: '1',
    customer_name: 'Maria Silva',
    rating: 5,
    comment: 'Excelente atendimento! A massagem relaxante foi maravilhosa e me senti renovada.',
    date: '2024-10-15'
  },
  {
    id: '2',
    customer_name: 'João Santos',
    rating: 5,
    comment: 'Profissionais muito qualificados. A acupuntura realmente ajudou com minhas dores.',
    date: '2024-10-18'
  },
  {
    id: '3',
    customer_name: 'Ana Costa',
    rating: 5,
    comment: 'Ambiente tranquilo e acolhedor. Recomendo a todos!',
    date: '2024-10-20'
  }
];

// Storage helpers
const STORAGE_KEYS = {
  SERVICES: 'centro_terapeutico_services',
  BOOKINGS: 'centro_terapeutico_bookings',
  REVIEWS: 'centro_terapeutico_reviews'
};

export const storage = {
  // Services
  getServices: (): Service[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return stored ? JSON.parse(stored) : mockServices;
  },

  saveServices: (services: Service[]) => {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  },

  addService: (service: Omit<Service, 'id'>): Service => {
    const services = storage.getServices();
    const newService = { ...service, id: Date.now().toString() };
    services.push(newService);
    storage.saveServices(services);
    return newService;
  },

  updateService: (id: string, updates: Partial<Service>): Service | null => {
    const services = storage.getServices();
    const index = services.findIndex(s => s.id === id);
    if (index === -1) return null;
    services[index] = { ...services[index], ...updates };
    storage.saveServices(services);
    return services[index];
  },

  deleteService: (id: string): boolean => {
    const services = storage.getServices();
    const filtered = services.filter(s => s.id !== id);
    if (filtered.length === services.length) return false;
    storage.saveServices(filtered);
    return true;
  },

  // Bookings
  getBookings: (): Booking[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    return stored ? JSON.parse(stored) : mockBookings;
  },

  saveBookings: (bookings: Booking[]) => {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  },

  addBooking: (booking: Omit<Booking, 'id'>): Booking => {
    const bookings = storage.getBookings();
    const newBooking = { ...booking, id: Date.now().toString() };
    bookings.push(newBooking);
    storage.saveBookings(bookings);
    return newBooking;
  },

  updateBooking: (id: string, updates: Partial<Booking>): Booking | null => {
    const bookings = storage.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index === -1) return null;
    bookings[index] = { ...bookings[index], ...updates };
    storage.saveBookings(bookings);
    return bookings[index];
  },

  deleteBooking: (id: string): boolean => {
    const bookings = storage.getBookings();
    const filtered = bookings.filter(b => b.id !== id);
    if (filtered.length === bookings.length) return false;
    storage.saveBookings(filtered);
    return true;
  },

  // Reviews
  getReviews: (): Review[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    return stored ? JSON.parse(stored) : mockReviews;
  },

  saveReviews: (reviews: Review[]) => {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  },

  addReview: (review: Omit<Review, 'id'>): Review => {
    const reviews = storage.getReviews();
    const newReview = { ...review, id: Date.now().toString() };
    reviews.push(newReview);
    storage.saveReviews(reviews);
    return newReview;
  },

  deleteReview: (id: string): boolean => {
    const reviews = storage.getReviews();
    const filtered = reviews.filter(r => r.id !== id);
    if (filtered.length === reviews.length) return false;
    storage.saveReviews(filtered);
    return true;
  }
};
