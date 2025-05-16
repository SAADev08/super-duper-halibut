import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Usuario {
    id_pessoa: string;
    nome: string;
}

interface AuthState {
    token: string | null;
    usuario: Usuario | null;
    setAuth: (token: string, usuario: Usuario) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            usuario: null,
            setAuth: (token, usuario) => set({ token, usuario }),
            logout: () => set({ token: null, usuario: null }),
        }),
        {
            name: 'auth-storage', // chave no localStorage
        }
    )
);
