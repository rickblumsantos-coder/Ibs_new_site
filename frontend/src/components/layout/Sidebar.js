import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Calendar, 
  FileText, 
  Package, 
  Wrench, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: Car, label: 'Veículos', path: '/veiculos' },
    { icon: Calendar, label: 'Agendamentos', path: '/agendamentos' },
    { icon: FileText, label: 'Orçamentos', path: '/orcamentos' },
    { icon: Wrench, label: 'Serviços', path: '/servicos' },
    { icon: Package, label: 'Peças', path: '/pecas' },
    { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-sm"
        data-testid="mobile-menu-toggle"
      >
        {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-screen bg-zinc-950 border-r border-zinc-800 transition-all duration-300 z-40 ${
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        } w-64`}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-zinc-800">
            <h1 className="text-2xl font-heading font-bold uppercase tracking-tight text-red-600">
              IBS AUTO CENTER
            </h1>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Sistema de Gestão</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-900"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5 mr-3" strokeWidth={1.5} />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;