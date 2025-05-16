import { useAuthStore } from "../store/authStore";
import { ISala, ISalaModule } from "../store/meetingStore";

const BASE_URL = import.meta.env.VITE_API_URL;

export async function getSalas(props: any) {
    console.log('props', props);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/sala/?page=${props.pageIndex}&size=${props.pageSize}`, {
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

export async function postSala(value: ISalaModule) {
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/sala/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(value),
    });

    if (!res.ok) throw new Error('Erro ao criar reunião');
    return res.json();
};

export async function finalizarSala(value: ISala) {
    const response = await fetch(`${BASE_URL}/api/sala/`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${useAuthStore.getState().token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
    });

    if (!response.ok) {
        throw new Error('Erro ao finalizar a reunião');
    }

    return response.json();
}