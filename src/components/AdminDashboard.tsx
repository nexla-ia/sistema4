import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useModal } from '../hooks/useModal';
import { Settings, Plus, Edit, Trash2, LogOut } from 'lucide-react';
import {
  getServices,
  createService,
  updateService,
  deleteService,
  signOut,
  type Service,
  type Salon
} from '../lib/supabase';

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

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddService, setShowAddService] = useState(false);
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
      const servicesResult = await getServices();

      if (servicesResult.data) {
        setServices(servicesResult.data);
      } else {
        console.warn('No services found or error loading services:', servicesResult.error);
        setServices([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    try {
      console.log('Tentando adicionar serviço. Salon:', salon);

      if (!salon) {
        showError('Erro', 'Salão não encontrado');
        return;
      }

      if (!salon.id || typeof salon.id !== 'string' || salon.id.length < 30) {
        console.error('Salon ID inválido:', salon.id);
        showError('Erro', 'ID do salão inválido. Faça logout e login novamente.');
        return;
      }

      const serviceData = {
        ...newService,
        active: true
      };

      console.log('Criando serviço com salon_id:', salon.id);
      const { data, error } = await createService(serviceData, salon.id);
      if (error) {
        console.error('Erro detalhado ao criar serviço:', error);
        throw error;
      }

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
        showSuccess('Serviço Atualizado!', 'O serviço foi atualizado com sucesso.');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      showError('Erro', 'Erro ao atualizar serviço. Tente novamente.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    showConfirm(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.',
      async () => {
        try {
          const { error } = await deleteService(serviceId);
          if (error) throw error;

          setServices(prev => prev.filter(s => s.id !== serviceId));
          showSuccess('Serviço Excluído!', 'O serviço foi excluído com sucesso.');
        } catch (error) {
          console.error('Error deleting service:', error);
          showError('Erro', 'Erro ao excluir serviço. Tente novamente.');
        }
      },
      'Excluir',
      'Cancelar'
    );
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

        {/* Services Content */}
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
                       placeholder="Ex: 50 ou 50.50"
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
                           placeholder="Ex: 50 ou 50.50"
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
      </div>
      </div>

      {/* Modal Component */}
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