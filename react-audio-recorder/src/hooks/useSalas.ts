import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finalizarSala, getSalas, postSala } from '../api/salasService';

export function useHistoricoSalas(pagination: any) {
    return useQuery({
        queryKey: ['salas', pagination.pageIndex, pagination.pageSize],
        queryFn: () => getSalas(pagination),});
}

export function useCriarSala() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postSala,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salas'] });
        },
    });
}

export function useEditarSala() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: finalizarSala,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salas'] });
        },
    });
}
