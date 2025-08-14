import React, { useState } from 'react';
import { Clock, DollarSign, Sparkles } from 'lucide-react';

// Service Card Component with expandable description
interface ServiceCardProps {
  service: any;
  isSelected: boolean;
  onSelect: (service: any) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Truncate description to approximately 80 characters
  const truncatedDescription = service.description && service.description.length > 80 
    ? service.description.substring(0, 80) + '...' 
    : service.description;

  return (
    <div
      className={`group relative bg-white rounded-xl md:rounded-2xl border-2 transition-all duration-500 hover:shadow-2xl cursor-pointer transform hover:-translate-y-1 md:hover:-translate-y-2 hover:rotate-1 ${
        isSelected
          ? 'border-clinic-500 shadow-2xl shadow-clinic-500/20 scale-105 ring-2 ring-clinic-200'
          : 'border-gray-200 hover:border-clinic-400 hover:shadow-clinic-500/10'
      }`}
      onClick={() => onSelect(service)}
    >
      {service.popular && (
        <div className="absolute -top-2 md:-top-3 left-2 md:left-4 bg-gradient-to-r from-clinic-500 via-clinic-600 to-clinic-700 text-white px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium shadow-lg animate-pulse">
          <Sparkles className="w-3 h-3 inline mr-1 animate-spin" />
          Popular
        </div>
      )}
      
      <div className="p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-clinic-50/50 to-clinic-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg md:text-xl font-semibold text-gray-900 group-hover:text-clinic-600 transition-colors duration-300">{service.name}</h4>
            <span className="text-xs bg-clinic-100 text-clinic-600 px-2 py-1 rounded-full font-medium">
              {service.category}
            </span>
          </div>
          
          {service.description && (
            <div className="mb-3 md:mb-4">
              <p className="text-gray-600 text-xs md:text-sm group-hover:text-gray-700 transition-colors duration-300 leading-relaxed">
                {isExpanded ? service.description : truncatedDescription}
              </p>
              
              {service.description.length > 80 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card selection when clicking expand button
                    setIsExpanded(!isExpanded);
                  }}
                  className="mt-2 text-clinic-600 hover:text-clinic-700 font-medium text-xs transition-colors duration-300 flex items-center space-x-1"
                >
                  <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
                  <svg 
                    className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <div className="flex items-center space-x-1 text-green-600 group-hover:text-green-700 transition-colors duration-300">
              <DollarSign className="w-4 h-4 group-hover:animate-bounce" />
              <span className="font-bold text-base md:text-lg">R$ {service.price}</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
              <Clock className="w-4 h-4 group-hover:animate-pulse" />
              <span className="text-xs md:text-sm">{service.duration_minutes}min</span>
            </div>
          </div>
        
          <button
            className={`w-full py-2 md:py-3 rounded-lg md:rounded-xl font-medium text-sm md:text-base transition-all duration-500 transform hover:scale-105 ${
              isSelected
                ? 'bg-gradient-to-r from-clinic-500 to-clinic-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gradient-to-r hover:from-clinic-100 hover:to-clinic-200 hover:text-clinic-700 hover:shadow-md'
            }`}
          >
            {isSelected ? 'Selecionado' : 'Selecionar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Services = ({ services, onServiceSelect, selectedServices }) => {
  const categories = [...new Set(services.map(service => service.category))];
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(service => service.category === selectedCategory);

  return (
    <section className="py-8 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nossas Terapias
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Escolha entre nossa ampla gama de terapias realizadas por profissionais experientes e qualificados
          </p>
        </div>

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 md:mb-12">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-medium text-sm md:text-base transition-all duration-300 transform hover:scale-105 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-clinic-500 to-clinic-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-clinic-100 hover:text-clinic-700'
              }`}
            >
              Todas as Terapias
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-medium text-sm md:text-base transition-all duration-300 transform hover:scale-105 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-clinic-500 to-clinic-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-clinic-100 hover:text-clinic-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={!!selectedServices.find(s => s.id === service.id)}
              onSelect={onServiceSelect}
            />
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma terapia encontrada
            </h3>
            <p className="text-gray-600">
              Não há terapias disponíveis na categoria "{selectedCategory}".
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Services;