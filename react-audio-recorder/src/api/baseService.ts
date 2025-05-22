import { useAuthStore } from "../store/authStore";
import { IKnowledgeBaseModule } from "../store/knowledgeStore";

const BASE_URL = import.meta.env.VITE_API_URL;

export async function getBasesConhecimento(props: any) {
    console.log('props', props);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/baseconhecimento/${props}`, {
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
}

export async function postBaseConhecimento(value: IKnowledgeBaseModule) {
    console.log('props', value);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/baseconhecimento/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
    });
    // if (!res.ok) throw new Error('Erro ao buscar salas');
    if (res.status === 401) {
        useAuthStore.getState().logout();
        throw new Error('Token expirado');
    }
    return res.json();
}