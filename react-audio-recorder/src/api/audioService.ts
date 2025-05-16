import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

export async function sendAudioToAPI(infos: any, sala: string) {
    const token = useAuthStore.getState().token;

    if (!token) {
        throw new Error('Usuário não autenticado.');
    }

    const response = await fetch(`${API_URL}/api/sala/stt/${sala}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: infos,
    });

    if (!response.ok) {
        throw new Error('Erro ao enviar texto');
    }

    return response.json();
}
