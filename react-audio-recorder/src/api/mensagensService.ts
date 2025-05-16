import { useAuthStore } from "../store/authStore";

const BASE_URL = import.meta.env.VITE_API_URL;

export async function getMensagensSala(salaId: string) {
    console.log('props', salaId);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/mensagem/sala/${salaId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    // if (!res.ok) throw new Error('Erro ao buscar salas');
    if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error('Token expirado');
    }
    return res.json();
};

export async function getMensagem(mensagemId: string) {
    console.log('props', mensagemId);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/mensagem/${mensagemId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    // if (!res.ok) throw new Error('Erro ao buscar salas');
    if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error('Token expirado');
    }
    return res.json();
};