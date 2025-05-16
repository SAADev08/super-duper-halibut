import { useCriarSala, useHistoricoSalas } from "../hooks/useSalas";
import { ISala, useMeetingStore } from "../store/meetingStore";
import { useEffect, useState } from "react";
import ModalCriarSala from "../components/ModalCriarSala";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import TabelaSalas from "../components/TabelaSalas";
import { PaginationState } from "@tanstack/react-table";

export function MeetingPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { data: salas, isLoading, isError } = useHistoricoSalas(pagination);
    const { mutate: criarSala } = useCriarSala();
    const setSalaAtiva = useMeetingStore(state => state.setSalaAtiva);
    const { setCurrentPage } = useUIStore();

    var tzoffset = new Date().getTimezoneOffset() * 60000;

    const handleNovaReuniao = (descricao: string) => {
        let data = new Date(new Date().getTime() - tzoffset)
            .toISOString()
            .split(".")[0];
        const userId = useAuthStore.getState().usuario?.id_pessoa;
        criarSala(
            {
                data_hora_in: data,
                descricao,
                pessoa_temp: userId,
            },
            {
                onSuccess: novaSala => {
                    setSalaAtiva(novaSala);
                    setCurrentPage("gravar");
                },
            }
        );
    };

    useEffect(() => {
        console.log(useAuthStore.getState().usuario);
    });

    useEffect(() => {
        if (salas !== undefined) {
            console.log("salas", salas);
        }
    }, [salas]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Histórico de salas</h1>
            <div className="flex gap-6">
                <button
                    className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => setIsModalOpen(true)}
                >
                    Criar nova sala
                </button>
                <button
                    className="bg-red-500 hover:bg-red-600 text-white mb-4 px-4 py-2 rounded transition-colors"
                    onClick={() => setCurrentPage("home")}
                >
                    Voltar
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg">
                {/* <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-200">
                        <th className="py-2 px-4 text-left">ID</th>
                        <th className="py-2 px-4 text-left">Data Inicial</th>
                        <th className="py-2 px-4 text-left">Data Final</th>
                        <th className="py-2 px-4 text-left">Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salas?.map((sala: ISala) => (
                            <tr key={sala.id_sala} className="border-b">
                                <td className="py-2 px-4">{sala.id_sala}</td>
                                <td className="py-2 px-4">{sala.data_hora_in}</td>
                                <td className="py-2 px-4">{sala.data_hora_fin}</td>
                                <td className="py-2 px-4">{sala.descricao}</td>
                            </tr>
                        ))}
                       
                    </tbody>
                </table> */}
                {salas !== undefined && salas.dados.length > 0 ? (
                    <TabelaSalas
                        data={salas}
                        pagination={pagination}
                        setPagination={setPagination}
                        isLoading={isLoading}
                        isError={isError}
                    />
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-gray-500">
                            Nenhuma sala encontrada.
                        </p>
                    </div>
                )}
            </div>
            <ModalCriarSala
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleNovaReuniao}
            />
        </div>
    );
}
