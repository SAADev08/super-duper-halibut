import { useMutation } from '@tanstack/react-query';
import { loginProcess } from '../api/authService';

export function useLogin() {
    return useMutation({
        mutationFn: loginProcess,
    });
}
