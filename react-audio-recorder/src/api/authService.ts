interface LoginRequest {
    login: string;
    senha: string;
}

interface LoginResponse {
    token: string;
    id_pessoa: string;
    nome: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export async function loginProcess(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Erro no login');
    }

    return response.json();
}