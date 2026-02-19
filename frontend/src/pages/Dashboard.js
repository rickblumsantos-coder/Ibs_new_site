import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/utils/api';
import { Users, Car, Calendar, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Clientes',
      value: stats?.total_clients || 0,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-950/30',
    },
    {
      title: 'Total Ve\u00edculos',
      value: stats?.total_vehicles || 0,
      icon: Car,
      color: 'text-green-500',
      bg: 'bg-green-950/30',
    },
    {
      title: 'Agendamentos Pendentes',
      value: stats?.pending_appointments || 0,
      icon: Calendar,
      color: 'text-yellow-500',
      bg: 'bg-yellow-950/30',
    },
    {
      title: 'Or\u00e7amentos Pendentes',
      value: stats?.pending_quotes || 0,
      icon: FileText,
      color: 'text-orange-500',
      bg: 'bg-orange-950/30',
    },
    {
      title: 'Receita do M\u00eas',
      value: `R$ ${(stats?.monthly_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-red-500',
      bg: 'bg-red-950/30',
    },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-blue-950/30 text-blue-400 border-blue-900',
      confirmed: 'bg-green-950/30 text-green-400 border-green-900',
      completed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      cancelled: 'bg-red-950/30 text-red-400 border-red-900',
    };
    const labels = {
      scheduled: 'Agendado',
      confirmed: 'Confirmado',
      completed: 'Conclu\u00eddo',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-zinc-400">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="dashboard-page">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-zinc-50">
            DASHBOARD
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Vis\u00e3o geral do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-800 rounded-sm p-5 relative overflow-hidden"
                data-testid={`stat-card-${idx}`}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 ${card.bg} rounded-full blur-2xl opacity-50`}></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
                      {card.title}
                    </span>
                    <Icon className={`w-5 h-5 ${card.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="text-3xl font-heading font-bold text-zinc-50">{card.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-sm">
          <div className="border-b border-zinc-800 p-4 bg-zinc-900/50">
            <h2 className="text-lg font-heading font-bold uppercase text-zinc-50">
              Agendamentos Recentes
            </h2>
          </div>
          <div className="p-4">
            {stats?.recent_appointments?.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">Nenhum agendamento encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="recent-appointments-table">
                  <thead>
                    <tr className="bg-zinc-900/50 text-zinc-400 uppercase text-xs font-bold tracking-wider h-10">
                      <th className="text-left px-4">Cliente</th>
                      <th className="text-left px-4">Ve\u00edculo</th>
                      <th className="text-left px-4">Data</th>
                      <th className="text-left px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recent_appointments?.map((apt, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors h-12"
                      >
                        <td className="text-sm text-zinc-200 px-4">{apt.client_name}</td>
                        <td className="text-sm text-zinc-200 px-4 font-mono">{apt.vehicle}</td>
                        <td className="text-sm text-zinc-200 px-4 font-mono">
                          {format(new Date(apt.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </td>
                        <td className="px-4">{getStatusBadge(apt.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
