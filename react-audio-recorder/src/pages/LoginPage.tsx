import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import { useAuthStore } from '../store/authStore'; 

export function LoginPage() {
  const { mutate, isPending } = useLogin();
  const setAuth = useAuthStore((state) => state.setAuth);

  // Estados do formulário
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    mutate(
      { login, senha },
      {
        onSuccess: (data) => {
          const token = data.token;
          const usuario = {
            id_pessoa: data.id_pessoa,
            nome: data.nome,
          }
          setAuth(token, usuario);
        },
        onError: (error) => {
          console.error('Erro no login:', error);
          alert('Usuário ou senha inválidos!');
        },
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            placeholder="login"
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
