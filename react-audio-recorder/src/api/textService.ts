import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;

export async function sendTextToAPI(pergunta: any, sala?: string) {
    console.log('endpoint', pergunta, sala);
    const token = useAuthStore.getState().token;

    if (!token) {
        throw new Error('Usuário não autenticado.');
    }

    const response = await fetch(`${API_URL}/api/sala/text/${sala}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(pergunta) ,
    });

    if (!response.ok) {
        throw new Error('Erro ao enviar áudio');
    }

    return response.json();
}
