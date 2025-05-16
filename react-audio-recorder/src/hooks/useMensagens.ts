import { useQuery } from "@tanstack/react-query";
import { getMensagem, getMensagensSala } from "../api/mensagensService";
import { IMensagem } from "../store/messageStore";

export function useMensagens(sala_temp: any) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['mensagens', sala_temp],
        queryFn: () => getMensagensSala(sala_temp),
        refetchOnWindowFocus: false,
    });

    return { data, isLoading, isError };

}

export function useMensagem(mensagemId: string | null, options?: { enabled?: boolean }) {
  console.log("mensagemId", mensagemId, "options", options, !!mensagemId && options?.enabled === true);
  const isEnabled = !!mensagemId && (options?.enabled === true); // default: true se houver id
  
  return useQuery<IMensagem, Error>({
        queryKey: ['mensagem', mensagemId],
        queryFn: () => {
          if(!mensagemId) {
            return Promise.reject(new Error("ID da mensagem é nulo"))
          }
          return getMensagem(mensagemId)
        },
        enabled: isEnabled,
        refetchInterval: (data) => {
            console.log("data", data);
            if (isEnabled){
              if (data.state.data === undefined || data.state.data.resposta === null) {
                console.log('refetching', data.state.data);
                return 3000; // 3 seconds
              }
              console.log("resposta completa", data.state.data.resposta);
              return false;
            }
            return false;
        },
        refetchIntervalInBackground: true, // Continua o polling mesmo com a aba em background
        staleTime: 0, // Para garantir que o polling sempre busque se ativo
      });
}