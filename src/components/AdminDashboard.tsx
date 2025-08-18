import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';
import { Calendar, Users, Settings, BarChart3, Clock, Plus, Edit, Trash2, Check, X, LogOut, Star, MessageCircle, UserX, AlertTriangle } from 'lucide-react';
import { 
  getServices, 
  getBookings, 
  createService, 
  updateService, 
  deleteService, 
  updateBookingStatus,
  signOut,
  saveBlockedSlots,
  updateSalonOpeningHours,
  getAllReviews,
  approveReview,
  deleteReview,
  type Service, 
  type Booking, 
  type Salon,
  type Review
} from '../lib/supabase';
import ScheduleManager from './ScheduleManager';

interface AdminDashboardProps {
  salon: Salon | null;
  onLogout?: () => void;
}

const AdminDashboard = ({ salon, onLogout }: AdminDashboardProps) => {
  const {
    modal,
    showSuccess,
    showError,
    showConfirm,
    hideModal,
  } = useModal();

  const modalComponent = (
    <Modal
      isOpen={modal.isOpen}
      onClose={hideModal}
      title={modal.title}
      message={modal.message}
      type={modal.type}
      confirmText={modal.confirmText}
      cancelText={modal.cancelText}
      onConfirm={modal.onConfirm}
      showCancel={modal.showCancel}
    />
  );

  const [activeTab, setActiveTab] = useState('bookings');
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [reportFilter, setReportFilter] = useState('total');
  const [showNoShowModal, setShowNoShowModal] = useState(false);
  const [selectedBookingForNoShow, setSelectedBookingForNoShow] = useState<string | null>(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: 0,
    duration_minutes: 30,
    category: 'Geral',
    popular: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesResult, bookingsResult, reviewsResult] = await Promise.all([
        getServices(),
        getBookings(salon.id),
        getAllReviews(salon.id)
      ]);

      if (servicesResult.data) {
        setServices(servicesResult.data);
      } else {
        console.warn('No services found or error loading services:', servicesResult.error);
        setServices([]);
      }

      if (bookingsResult.data) {
        // Processar bookings para incluir dados do cliente
        const processedBookings = bookingsResult.data.map(booking => ({
          ...booking,
          customer: booking.customer // Use customer consistently
        }));
        setBookings(processedBookings);
      } else {
        console.warn('No bookings found or error loading bookings:', bookingsResult.error);
        setBookings([]);
      }

      if (reviewsResult.data) {
        setReviews(reviewsResult.data);
      } else {
        console.warn('No reviews found or error loading reviews:', reviewsResult.error);
        setReviews([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setServices([]);
      setBookings([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    try {
      if (!salon) {
        showError('Erro', 'Salão não encontrado');
        return;
      }

      const serviceData = {
        ...newService,
        active: true
      };

      const { data, error } = await createService(serviceData, salon.id);
      if (error) throw error;

      if (data) {
        setServices(prev => [...prev, data]);
        const serviceName = newService.name;
        setNewService({
          name: '',
          description: '',
          price: 0,
          duration_minutes: 30,
          category: 'Geral',
          popular: false
        });
        setShowAddService(false);
        showSuccess('Serviço Adicionado!', `O serviço "${serviceName}" foi adicionado com sucesso e já está disponível para agendamento.`);
      }
    } catch (error) {
      console.error('Error adding service:', error);
      showError('Erro', 'Erro ao adicionar serviço. Tente novamente.');
    }
  };

  const handleUpdateService = async (service: Service) => {
    try {
      const { data, error } = await updateService(service.id, service);
      if (error) throw error;

      if (data) {
        setServices(prev => prev.map(s => s.id === service.id ? data : s));
        setEditingService(null);
        alert('Serviço atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      alert('Erro ao atualizar serviço');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await deleteService(serviceId);
      if (error) throw error;

      setServices(prev => prev.filter(s => s.id !== serviceId));
      alert('Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Erro ao excluir serviço');
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      const { data, error } = await updateBookingStatus(bookingId, status);
      if (error) throw error;

      if (data) {
        // Se for "no_show", adicionar o motivo nas notas
        if (status === 'no_show' && noShowReason) {
          const updatedBooking = { ...data, notes: `${data.notes ? data.notes + ' | ' : ''}Não compareceu: ${noShowReason}` };
          setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
        } else {
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
        }
        
        // Find the booking to get customer name
        const booking = bookings.find(b => b.id === bookingId);
        const customerName = booking?.customer?.name || 'Cliente';
        
        if (status === 'completed') {
          showSuccess(
            'Agendamento Concluído!', 
            `O atendimento de ${customerName} foi marcado como concluído com sucesso.`
          );
        } else if (status === 'confirmed') {
          showSuccess(
            'Agendamento Confirmado!', 
            `O agendamento de ${customerName} foi confirmado com sucesso.`
          );
        } else if (status === 'cancelled') {
          showSuccess(
            'Agendamento Cancelado', 
            `O agendamento de ${customerName} foi cancelado.`
          );
        } else if (status === 'no_show') {
          showSuccess(
            'Marcado como Não Compareceu', 
            `O agendamento de ${customerName} foi marcado como "não compareceu"${noShowReason ? ` - Motivo: ${noShowReason}` : ''}.`
          );
        } else {
          showSuccess('Status Atualizado!', 'Status do agendamento atualizado com sucesso!');
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      showError('Erro', 'Erro ao atualizar status do agendamento. Tente novamente.');
    }
  };

  const handleNoShowClick = (bookingId: string) => {
    setSelectedBookingForNoShow(bookingId);
    setNoShowReason('');
    setShowNoShowModal(true);
  };

  const handleNoShowConfirm = async () => {
    if (!selectedBookingForNoShow) return;
    
    await handleUpdateBookingStatus(selectedBookingForNoShow, 'no_show');
    setShowNoShowModal(false);
    setSelectedBookingForNoShow(null);
    setNoShowReason('');
  };

  const handleLogout = async () => {
    showConfirm(
      'Confirmar Saída',
      'Tem certeza que deseja sair do sistema? Você precisará fazer login novamente para acessar o painel administrativo.',
      async () => {
        try {
          await signOut();
          if (onLogout) {
            onLogout();
          }
        } catch (error) {
          console.error('Error signing out:', error);
          showError('Erro', 'Erro ao sair do sistema. Tente novamente.');
        }
      },
      'Sair',
      'Cancelar'
    );
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      const { error } = await approveReview(reviewId);
      if (error) throw error;
      
      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, approved: true } : r
      ));
      alert('Avaliação aprovada!');
    } catch (error) {
      console.error('Error approving review:', error);
      alert('Erro ao aprovar avaliação');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return;

    try {
      const { error } = await deleteReview(reviewId);
      if (error) throw error;
      
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      alert('Avaliação excluída!');
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Erro ao excluir avaliação');
    }
  };

  // Filter bookings based on selected time period
  const getFilteredBookings = () => {
  const now = new Date();
  // Definimos hoje no fuso local (00:00) para evitar shift de timezone
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return bookings.filter((booking) => {
    // Convertemos a string "YYYY-MM-DD" para Date usando ano, mês e dia separadamente;
    // assim o fuso local é preservado e não há deslocamento indesejado.
    const [yearStr, monthStr, dayStr] = booking.booking_date.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1; // monthIndex é zero‑based
    const d = parseInt(dayStr, 10);
    const bookingDate = new Date(y, m, d);

    switch (reportFilter) {
      case 'today':
        // Seleciona apenas os agendamentos do dia atual
        return bookingDate >= today && bookingDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);

      case 'week': {
        // Início da semana (domingo) e fim (7 dias depois)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return bookingDate >= weekStart && bookingDate < weekEnd;
      }

      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return bookingDate >= monthStart && bookingDate < monthEnd;
      }

      case 'lastMonth': {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        return bookingDate >= lastMonthStart && bookingDate < lastMonthEnd;
      }

      case 'total':
      default:
        return true;
    }
  });
};


  // Get unique customers from filtered bookings
  const getUniqueCustomers = (filteredBookings: Booking[]) => {
    const customerMap = new Map();
    
    filteredBookings.forEach(booking => {
      if (booking.customer) {
        const customerId = booking.customer.id;
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            ...booking.customer,
            bookingsCount: 0,
            totalSpent: 0,
            lastBooking: booking.booking_date
          });
        }
        
        const customer = customerMap.get(customerId);
        customer.bookingsCount++;
        customer.totalSpent += booking.total_price;
        
        // Update last booking if this one is more recent
        if ((booking.booking_date) > (customer.lastBooking)) {
          customer.lastBooking = booking.booking_date;
        }
      }
    });
    
    return Array.from(customerMap.values()).sort((a, b) => 
      b.lastBooking.localeCompare(a.lastBooking)
    );
  };

  const filteredBookings = getFilteredBookings();
  const uniqueCustomers = getUniqueCustomers(filteredBookings);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      case 'no_show': return 'Não compareceu';
      default: return status;
    }
  };

  if (!salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nenhuma clínica configurada</h2>
          <p className="text-gray-600 mb-4">
            Não foi possível encontrar uma clínica vinculada à sua conta.
            <br />
            Verifique se a clínica foi criada corretamente no banco de dados.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
            <h3 className="font-semibold text-yellow-800 mb-2">Para resolver:</h3>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. Acesse o Supabase Dashboard</li>
              <li>2. Vá em Table Editor → salons</li>
              <li>3. Verifique se existe um registro com seu user_id</li>
              <li>4. Se não existir, crie um novo registro</li>
            </ol>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-clinic-500 text-white px-4 py-2 rounded-lg hover:bg-clinic-600 transition-colors"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clinic-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-gray-600 mt-2">{salon.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors bg-white border border-gray-300 px-4 py-2 rounded-lg hover:border-red-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'bookings', name: 'Agendamentos', icon: Calendar },
              { id: 'services', name: 'Serviços', icon: Settings },
              { id: 'schedule', name: 'Horários', icon: Clock },
              { id: 'analytics', name: 'Relatórios', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-clinic-500 text-clinic-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Agendamentos Recentes</h2>
              
              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum agendamento encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Serviços
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map(booking => (
                        <tr key={booking.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {booking.customer?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.customer?.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                                {(() => {
                                  const [y, m, d] = booking.booking_date.split('-');
                                  return `${d}/${m}/${y}`; // dia/mês/ano (pt-BR)
                                })()}
                              </div>
                            <div className="text-sm text-gray-500">
                              {booking.booking_time}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {booking.booking_services?.map(bs => bs.service?.name).join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            R$ {booking.total_price}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {getStatusText(booking.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                    className="text-green-600 hover:text-green-900"
                                    title="Confirmar"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                                    className="text-red-600 hover:text-red-900"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {booking.status === 'confirmed' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                    className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 bg-blue-100 rounded"
                                    title="Marcar como concluído"
                                  >
                                    Concluir
                                  </button>
                                  <button
                                    onClick={() => handleNoShowClick(booking.id)}
                                    className="text-orange-600 hover:text-orange-900 text-xs px-2 py-1 bg-orange-100 rounded flex items-center space-x-1"
                                    title="Marcar como não compareceu"
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>Não veio</span>
                                  </button>
                                </>
                              )}
                              {booking.status === 'completed' && (
                                <span className="text-green-600 text-xs">Concluído</span>
                              )}
                              {booking.status === 'no_show' && (
                                <span className="text-orange-600 text-xs flex items-center space-x-1">
                                  <UserX className="w-3 h-3" />
                                  <span>Não compareceu</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Gerenciar Serviços</h2>
                <button
                  onClick={() => setShowAddService(true)}
                  className="bg-clinic-500 text-white px-4 py-2 rounded-lg hover:bg-clinic-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Serviço</span>
                </button>
              </div>

              {/* Empty State */}
              {services.length === 0 && !showAddService && (
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nenhum serviço cadastrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece adicionando os serviços que você oferece aos seus clientes.
                  </p>
                  <button
                    onClick={() => setShowAddService(true)}
                    className="bg-clinic-500 text-white px-6 py-3 rounded-lg hover:bg-clinic-600 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Adicionar Primeiro Serviço</span>
                  </button>
                </div>
              )}

              {/* Add Service Form */}
              {showAddService && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Novo Serviço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                      <input
                        type="text"
                        value={newService.name}
                       onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                       onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                       placeholder="Ex: Massagem Relaxante"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      <input
                        type="text"
                        value={newService.category}
                       onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                       onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                       placeholder="Ex: Massoterapia"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                      <input
                       type="text"
                       inputMode="decimal"
                       value={newService.price === 0 ? '' : newService.price.toString()}
                       onChange={(e) => {
                         const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                         const numValue = value === '' ? 0 : parseFloat(value) || 0;
                         setNewService(prev => ({ ...prev, price: numValue }));
                       }}
                       onFocus={(e) => {
                         if (e.target.value === '0') {
                           e.target.value = '';
                         }
                         e.target.select();
                       }}
                       onBlur={(e) => {
                         if (e.target.value === '') {
                           setNewService(prev => ({ ...prev, price: 0 }));
                         }
                       }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                       placeholder="0,00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
                     <select
                        value={newService.duration_minutes}
                       onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                     >
                       <option value={15}>15 minutos</option>
                       <option value={30}>30 minutos</option>
                       <option value={45}>45 minutos</option>
                       <option value={60}>1 hora</option>
                       <option value={90}>1h 30min</option>
                       <option value={120}>2 horas</option>
                     </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <textarea
                        value={newService.description}
                       onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                       onFocus={(e) => e.target.select()}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                       placeholder="Descreva o serviço oferecido..."
                      />
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newService.popular}
                          onChange={(e) => setNewService(prev => ({ ...prev, popular: e.target.checked }))}
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <div>✅ {stats.completedBookings} concluídos</div>
                          {stats.noShowBookings > 0 && (
                            <div>❌ {stats.noShowBookings} não compareceram</div>
                          )}
                          {stats.cancelledBookings > 0 && (
                            <div>🚫 {stats.cancelledBookings} cancelados</div>
                          )}
                        </div>
                          className="rounded border-gray-300 text-clinic-600 focus:ring-clinic-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Serviço popular</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setShowAddService(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddService}
                      className="px-4 py-2 bg-clinic-500 text-white rounded-lg hover:bg-clinic-600 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* Services List */}
              <div className="space-y-4">
                {services.map(service => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                    {editingService?.id === service.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                          <input
                            type="text"
                            value={editingService.name}
                           onChange={(e) => setEditingService(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                           onFocus={(e) => e.target.select()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                          <input
                           type="text"
                           inputMode="decimal"
                           value={editingService.price === 0 ? '' : editingService.price.toString()}
                           onChange={(e) => {
                             const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                             const numValue = value === '' ? 0 : parseFloat(value) || 0;
                             setEditingService(prev => prev ? ({ ...prev, price: numValue }) : null);
                           }}
                           onFocus={(e) => {
                             if (e.target.value === '0') {
                               e.target.value = '';
                             }
                             e.target.select();
                           }}
                           onBlur={(e) => {
                             if (e.target.value === '') {
                               setEditingService(prev => prev ? ({ ...prev, price: 0 }) : null);
                             }
                           }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-clinic-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 md:col-span-2">
                          <button
                            onClick={() => setEditingService(null)}
                            className="px-3 py-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleUpdateService(editingService)}
                            className="px-3 py-1 bg-clinic-500 text-white rounded hover:bg-clinic-600 transition-colors"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{service.name}</h3>
                          <p className="text-sm text-gray-500">{service.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <span>R$ {service.price}</span>
                            <span>{service.duration_minutes}min</span>
                            <span className="bg-gray-100 px-2 py-1 rounded">{service.category}</span>
                            {service.popular && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Popular</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingService(service)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <ScheduleManager salon={salon} />
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Gerenciar Avaliações</h2>
              
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma avaliação encontrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div
                      key={review.id}
                      className={`border rounded-lg p-4 ${
                        review.approved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{review.customer_name}</h4>
                          <div className="flex items-center mt-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              ({review.rating}/5)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            review.approved 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {review.approved ? 'Aprovada' : 'Pendente'}
                          </span>
                          {!review.approved && (
                            <button
                              onClick={() => handleApproveReview(review.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Aprovar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-2">"{review.comment}"</p>
                      
                      <p className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Relatórios</h2>
            
            {/* Filter Buttons */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'today', label: 'Hoje' },
                  { key: 'week', label: 'Esta Semana' },
                  { key: 'month', label: 'Este Mês' },
                  { key: 'lastMonth', label: 'Mês Anterior' },
                  { key: 'total', label: 'Total' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setReportFilter(filter.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      reportFilter === filter.key
                        ? 'bg-clinic-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Clientes Únicos</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {uniqueCustomers.length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Agendamentos</p>
                    <p className="text-2xl font-bold text-green-900">{filteredBookings.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-6">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Receita Total</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      R$ {filteredBookings.reduce((sum, b) => sum + b.total_price, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customers List */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Lista de Clientes ({uniqueCustomers.length})
              </h3>
              
              {uniqueCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum cliente encontrado no período selecionado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agendamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Gasto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Último Agendamento
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uniqueCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-clinic-100 rounded-full flex items-center justify-center">
                                <span className="text-clinic-600 font-medium text-sm">
                                  {customer.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {customer.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{customer.phone}</div>
                            {customer.email && (
                              <div className="text-sm text-gray-500">{customer.email}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {customer.bookingsCount} agendamento{customer.bookingsCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            R$ {customer.totalSpent.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(() => {
                              const d = customer.lastBooking; // ex: "2025-08-08"
                              if (!d) return '-';
                              const [year, month, day] = d.split('-');
                              return `${day}/${month}/${year}`;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
      
      {/* Modal Component */}
      {/* Modal para "Não Compareceu" */}
      {showNoShowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <UserX className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Cliente Não Compareceu</h3>
                </div>
                <button
                  onClick={() => setShowNoShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-700 mb-4">
                Marcar este agendamento como "não compareceu". Você pode adicionar um motivo opcional.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo (opcional)
                </label>
                <textarea
                  value={noShowReason}
                  onChange={(e) => setNoShowReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: Não atendeu ligações, não respondeu mensagens, emergência familiar, etc."
                />
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-orange-800">Importante</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Esta ação irá liberar o horário para novos agendamentos e registrar que o cliente não compareceu.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowNoShowModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNoShowConfirm}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center space-x-2"
                >
                  <UserX className="w-4 h-4" />
                  <span>Confirmar Não Compareceu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Modal
        isOpen={modal.isOpen}
        onClose={hideModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={modal.onConfirm}
        showCancel={modal.showCancel}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </>
  );
};

export default AdminDashboard;