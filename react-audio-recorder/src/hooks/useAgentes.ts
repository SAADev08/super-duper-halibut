import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { editAgente, getAgentes, getAllAgentes, postAgente } from "../api/agentesService";

export function useAgentes(pagination: any) {
    return useQuery({
        queryKey: ['agentes', pagination.pageIndex, pagination.pageSize],
        queryFn: () => getAgentes(pagination),
    });
}

export function useAllAgentes() {
    return useQuery({
        queryKey: ['agentes'],
        queryFn: () => getAllAgentes(),
    });
}

export function useCriarAgente() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postAgente,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agentes'] });
        },
    });
}

export function useEditarAgente() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: editAgente,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agentes'] });
        },
    });
}