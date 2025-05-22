import { IAgenteModule } from "../store/agentStore";
import { useAuthStore } from "../store/authStore";

const BASE_URL = import.meta.env.VITE_API_URL;

export async function getAgentes(props:any) {
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/agente/?page=${props.pageIndex}&size=${props.pageSize}`, {
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

export async function getAllAgentes() {
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/agente/`, {
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

export async function getAgente(agenteId: string) {
    console.log('props', agenteId);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/agente/${agenteId}`, {
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

export async function postAgente(value: IAgenteModule) {
    console.log('props', value);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/agente/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(value),
    });

    if (!res.ok) throw new Error('Erro ao criar agente');
    return res.json();
}

export async function editAgente(value: IAgenteModule) {
    console.log('props', value);
    const token = useAuthStore.getState().token;

    const res = await fetch(`${BASE_URL}/api/agente/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(value),
    });

    if (!res.ok) throw new Error('Erro ao editar agente');
    return res.json();
}