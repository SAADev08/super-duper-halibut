import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasesConhecimento, postBaseConhecimento } from "../api/baseService";

export function useBasesConhecimento(id_agente: string) {
    return useQuery({
        queryKey: ['bases', id_agente],
        queryFn: () => getBasesConhecimento(id_agente),
        enabled: !!id_agente, // Só executa se houver um id_agente válido
        staleTime: 0,       // Considera os dados imediatamente desatualizados
    })
}

// export function useBasesConnhecimentoById(id_base_conhecimento: string) {
//     return useQuery({
//         queryKey: ['bases', id_base_conhecimento],
//         queryFn: () => getBasesConhecimento(id_base_conhecimento),
//     })
// }

export function useCriarBaseConhecimento() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postBaseConhecimento,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bases'] });
        },
    });
}