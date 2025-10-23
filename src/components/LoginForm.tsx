import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/mockSupabase';

interface LoginFormProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

const LoginForm = ({ onLoginSuccess, onBack }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (email !== 'centroobemestar@gmail.com') {
      setError('Email não autorizado');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        onLoginSuccess();
      }
    } catch (err) {
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinic-50 to-clinic-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <button
          onClick={onBack}
          className="mb-6 text-gray-600 hover:text-gray-800 flex items-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Área Administrativa
          </h2>
          <p className="text-gray-600">
            Faça login para acessar o painel administrativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-clinic-500 focus:border-transparent transition-all"
              placeholder="seu@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-clinic-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-clinic-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-clinic-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
