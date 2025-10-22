import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';
import { db, Service, Salon } from '../lib/localDatabase';
import { Calendar, Clock, User, Phone, Mail, MessageSquare, ArrowLeft, Check } from 'lucide-react';

interface BookingFormProps {
  selectedServices: Service[];
  onBack: () => void;
  salon: Salon | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const BookingForm = ({ selectedServices, onBack, salon }: BookingFormProps) => {
  const { addBooking } = useApp();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    observations: ''
  });
  const [confirmed, setConfirmed] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const { modal, hideModal, showSuccess, showError } = useModal();

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentHour = new Date().getHours();
    const startDay = currentHour < 18 ? 0 : 1;

    for (let i = startDay; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      date.setHours(0, 0, 0, 0);

      if (date.getDay() !== 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          day: date.getDate(),
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' })
        });
      }
    }

    return dates.slice(0, 14);
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const fetchAvailableSlots = (date: string) => {
    console.log('Buscando horários para:', date);
    setLoading(true);
    try {
      const slots = db.getAvailableSlots(date);
      const formattedSlots = slots.map(slot => ({
        time: slot.time_slot,
        available: slot.status === 'available'
      }));
      setAvailableSlots(formattedSlots);
    } catch (error) {
      console.error('Erro ao buscar slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    fetchAvailableSlots(date);
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) {
      showError('Dados Incompletos', 'Por favor, selecione uma data e horário.');
      return;
    }

    if (!customerData.name || !customerData.phone) {
      showError('Dados Incompletos', 'Por favor, preencha seu nome e telefone.');
      return;
    }

    try {
      addBooking({
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        date: selectedDate,
        time: selectedTime,
        services: selectedServices.map(s => s.id),
        observations: customerData.observations
      });

      setConfirmed(true);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      showError('Erro', 'Erro ao criar agendamento.');
    }
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, service) => total + service.price, 0);
  };

  const getTotalDuration = () => {
    const totalMinutes = selectedServices.reduce((total, service) => total + service.duration_minutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours}h${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  };

  if (confirmed) {
    return (
      <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Agendamento Realizado!
            </h2>

            <p className="text-lg text-gray-600 mb-8">
              Seu horário está confirmado!
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Resumo:</h3>
              <div className="space-y-2 text-left">
                <p><strong>Data:</strong> {formatDateForDisplay(selectedDate)}</p>
                <p><strong>Horário:</strong> {selectedTime}</p>
                <p><strong>Duração:</strong> {getTotalDuration()}</p>
                <p><strong>Valor Total:</strong> R$ {getTotalPrice()}</p>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-3 rounded-full font-semibold hover:from-rose-600 hover:to-pink-700 transition-all duration-300"
            >
              Fazer Novo Agendamento
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-clinic-500 to-clinic-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <button onClick={onBack} className="text-white hover:text-clinic-100 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold text-white">Agendar Horário</h2>
              <div className="w-6"></div>
            </div>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-rose-500" />
                  Escolha a data
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {generateAvailableDates().map(dateInfo => (
                    <button
                      key={dateInfo.date}
                      onClick={() => handleDateSelect(dateInfo.date)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${selectedDate === dateInfo.date
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-200 hover:border-rose-300'
                        }`}
                    >
                      <div className="text-sm text-gray-500">{dateInfo.weekday}</div>
                      <div className="text-xl font-bold text-gray-900">{dateInfo.day}</div>
                      <div className="text-sm text-gray-500">{dateInfo.month}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedDate}
                    className="bg-clinic-500 text-white px-6 py-3 rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-clinic-600 transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-rose-500" />
                  Escolha o horário
                </h3>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`p-3 rounded-xl border-2 transition-all ${selectedTime === slot.time
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : slot.available
                            ? 'border-gray-200 hover:border-rose-300 bg-green-50'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-gray-600 hover:text-gray-800">
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!selectedTime}
                    className="bg-clinic-500 text-white px-6 py-3 rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-clinic-600 transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-rose-500" />
                  Seus dados
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo *</label>
                    <input
                      type="text"
                      value={customerData.name}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="Digite seu nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp/Telefone *</label>
                    <input
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail (opcional)</label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                    <textarea
                      value={customerData.observations}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, observations: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                      placeholder="Ex: primeira vez no centro, dores nas costas, etc."
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button onClick={() => setStep(2)} className="text-gray-600 hover:text-gray-800">
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!customerData.name || !customerData.phone || loading}
                    className="bg-gradient-to-r from-clinic-500 to-clinic-600 text-white px-8 py-3 rounded-xl font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-clinic-600 hover:to-clinic-700 transition-all"
                  >
                    {loading ? 'Confirmando...' : 'Confirmar Agendamento'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
    </section>
  );
};

export default BookingForm;
