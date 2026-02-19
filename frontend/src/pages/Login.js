import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1549047608-55b2fd4b8427?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBjYXIlMjB3b3Jrc2hvcCUyMG1lY2hhbmljJTIwZGFyayUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzcxNDY4MDE5fDA&ixlib=rb-4.1.0&q=85')",
        }}
      >
        <div className="absolute inset-0 bg-black/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-zinc-950/90 backdrop-blur-sm border border-zinc-800 rounded-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading font-bold uppercase tracking-tight text-red-600 mb-2">
              IBS AUTO CENTER
            </h1>
            <p className="text-zinc-400 text-sm uppercase tracking-wider">Sistema de Gestão</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold uppercase text-zinc-500">
                Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-sm h-10 text-white"
                  placeholder="Digite seu usuário"
                  required
                  data-testid="username-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase text-zinc-500">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-sm h-10 text-white"
                  placeholder="Digite sua senha"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wide rounded-sm h-10 transition-all active:scale-95"
              data-testid="login-submit-button"
            >
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-600">
            <p>Credenciais padrão: ibs / ibs1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}