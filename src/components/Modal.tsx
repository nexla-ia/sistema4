import React from 'react';
import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancelar',
  onConfirm,
  showCancel = false
}: ModalProps) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'error':
        return 'from-red-50 to-rose-50 border-red-200';
      case 'warning':
        return 'from-yellow-50 to-amber-50 border-yellow-200';
      default:
        return 'from-blue-50 to-indigo-50 border-blue-200';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // Check if this is the delete confirmation modal
  const isDeleteModal = title.includes('Confirmar Limpeza');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br ${getColors()} rounded-2xl shadow-2xl border-2 max-w-md w-full mx-4 transform transition-all duration-300 scale-100`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-700 mb-6 leading-relaxed">{message}</p>
          
          {/* Dropdown details for delete modal */}
          {isDeleteModal && (
            <div className="mb-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-between w-full p-3 bg-white/70 rounded-lg border border-gray-200 hover:bg-white/90 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  📋 Ver detalhes do que será removido/preservado
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDetails && (
                <div className="mt-3 p-4 bg-white/80 rounded-lg border border-gray-200 animate-fade-in-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h6 className="font-semibold text-red-900 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Será Removido:
                      </h6>
                      <ul className="text-red-800 space-y-1 ml-4">
                        <li>• Horários disponíveis</li>
                        <li>• Horários bloqueados</li>
                        <li>• Slots vazios</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-semibold text-green-900 mb-2 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Será Preservado:
                      </h6>
                      <ul className="text-green-800 space-y-1 ml-4">
                        <li>• Agendamentos confirmados</li>
                        <li>• Dados dos clientes</li>
                        <li>• Histórico de atendimentos</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Quando usar:</strong> Esta função é útil quando você quer reconfigurar completamente sua agenda ou corrigir problemas nos horários gerados.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                type === 'success' 
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : type === 'error'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : type === 'warning'
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;