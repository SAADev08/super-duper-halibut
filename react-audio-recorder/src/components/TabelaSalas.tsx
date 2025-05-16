import {
    CaretDoubleLeft,
    CaretDoubleRight,
    CaretDown,
    CaretLeft,
    CaretRight,
    CaretUp,
    Eye,
} from "@phosphor-icons/react";
import {
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getPaginationRowModel,
    PaginationState,
    useReactTable,
} from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import { truncateMiddle } from "../utils";
import { ISala, useMeetingStore } from "../store/meetingStore";
import AudioRecorder from "./AudioRecorder";
import { useUIStore } from "../store/uiStore";
import { getMensagensSala } from "../api/mensagensService";
import { useMensagemStore } from "../store/messageStore";

export interface TabelaProps {
    data: any;
    isLoading: boolean;
    isError: boolean;
    pagination: PaginationState;
    setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}
// const ExpandedRowContent = ({ info }: any) => {
//     return (
//         <div className="p-6 bg-slate-50 border-t border-b border-slate-200 shadow-inner">
//             <h4 className="font-medium text-lg mb-4 text-slate-700">
//                 Informações Adicionais
//             </h4>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-3">
//                     <div className="flex items-start gap-2">
//                         <span className="font-medium text-slate-700 min-w-24">
//                             Segmento:
//                         </span>
//                         <span className="text-slate-600"></span>
//                     </div>
//                     <div className="flex items-start gap-2">
//                         <span className="font-medium text-slate-700 min-w-24">
//                             Transcrição:
//                         </span>
//                         <span className="text-slate-600"></span>
//                     </div>
//                 </div>
//                 <div className="space-y-3">
//                     <div className="flex items-start gap-2">
//                         <span className="font-medium text-slate-700 min-w-24">
//                             Texto:
//                         </span>
//                         <span className="text-slate-600"></span>
//                     </div>
//                     <div className="flex items-start gap-2">
//                         <span className="font-medium text-slate-700 min-w-24">
//                             Resposta:
//                         </span>
//                         <span className="text-slate-600"></span>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

export default function TabelaSalas(props: TabelaProps) {
    const { data, pagination, setPagination, isError, isLoading } = props;
    const [totalPages, setTotalPages] = useState(0);

    const { setCurrentPage } = useUIStore();
    const setSalaAtiva = useMeetingStore(state => state.setSalaAtiva);

    function handleVerSala(sala: any) {
        async function fetchMensagens() {
            const mensagens = await getMensagensSala(sala.id_sala);
            console.log("mensagens", mensagens);
            useMensagemStore.getState().setMensagensCompletas(mensagens);

            setSalaAtiva(sala);
            setCurrentPage("gravar");
        }

        fetchMensagens();
    }
    // Definição das colunas
    const columns = [
        // {
        //     id: "expander",
        //     header: () => null,
        //     cell: ({ row }: any) => (
        //         <button
        //             onClick={() => row.toggleExpanded()}
        //             className="p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        //             aria-label={
        //                 row.getIsExpanded()
        //                     ? "Recolher detalhes"
        //                     : "Expandir detalhes"
        //             }
        //         >
        //             {row.getIsExpanded() ? (
        //                 <CaretDown
        //                     size={16}
        //                     className="h-5 w-5 text-slate-500"
        //                 />
        //             ) : (
        //                 <CaretUp size={16} className="h-5 w-5 text-slate-500" />
        //             )}
        //         </button>
        //     ),
        // },
        {
            accessorKey: "id_sala",
            header: "ID",
            cell: (info: any) => {
                return truncateMiddle(info.getValue());
            },
        },
        {
            accessorKey: "data_hora_in",
            header: "Data Inicial",
            cell: (info: any) => {
                let newDate = info.getValue().split("T")[0];
                let arrDate = newDate.split("-");
                return (
                    arrDate[2] +
                    "/" +
                    arrDate[1] +
                    "/" +
                    arrDate[0] +
                    " " +
                    info.getValue().split("T")[1]
                );
            },
        },
        {
            accessorKey: "data_hora_fin",
            header: "Data Final",
            cell: (info: any) => {
                if (info.getValue() === null || info.getValue() === undefined) {
                    return "Sala em Andamento";
                } else {
                    let newDate = info.getValue().split("T")[0];
                    let arrDate = newDate.split("-");

                    return (
                        arrDate[2] +
                        "/" +
                        arrDate[1] +
                        "/" +
                        arrDate[0] +
                        " " +
                        info.getValue().split("T")[1]
                    );
                }
            },
        },
        {
            accessorKey: "descricao",
            header: "Descrição",
            cell: (info: any) => info.getValue(),
        },
        {
            accessorKey: "visualizar",
            header: "Visualizar",
            cell: (info: any) => {
                return (
                    <button
                        className="p-2 cursor-pointer"
                        onClick={() => {
                            console.log(info.row.original);
                            handleVerSala(info.row.original);

                            // setSalaAtiva(info.row.original);
                            // setCurrentPage("gravar");
                        }}
                    >
                        <Eye
                            size={16}
                            className="h-5 w-5 text-slate-500 hover:text-slate-400"
                        />
                    </button>
                );
            },
        },
    ];

    // Configuração da tabela
    const table = useReactTable({
        data: data.dados,
        columns,
        state: {
            pagination,
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        pageCount: Math.ceil(data.total_registros / pagination.pageSize),
        manualPagination: true,
    });

    if (isLoading) {
        return (
            <div className="w-full flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="alert alert-error">
                <span>
                    Erro ao carregar os dados. Por favor, tente novamente.
                </span>
            </div>
        );
    }

    useEffect(() => {
        setTotalPages(Math.ceil(data.total_registros / pagination.pageSize));
    }, [pagination, data.total_registros]);

    return (
        <>
            {/* Tabela */}
            <div className="bg-white rounded-lg shadow">
                <div className="overflow-auto max-h-[calc(100vh-300px)]">
                    <table className="table table-zebra w-full">
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr
                                    key={headerGroup.id}
                                    className="bg-slate-50 border-y border-slate-200"
                                >
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className="text-slate-700"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef
                                                          .header,
                                                      header.getContext()
                                                  )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map(row => (
                                    <React.Fragment key={row.id}>
                                        <tr
                                            className={`hover:bg-slate-50 transition-colors ${
                                                row.getIsExpanded()
                                                    ? "bg-slate-50"
                                                    : "bg-white"
                                            }`}
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <td
                                                    key={cell.id}
                                                    className="py-4"
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
                                                        cell.getContext()
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                        {/* {row.getIsExpanded() && (
                                            <tr>
                                                <td
                                                    colSpan={columns.length}
                                                    className="p-0 bg-slate-50"
                                                >
                                                    <ExpandedRowContent
                                                        info={
                                                            row.original
                                                                .informacoesAdicionais
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        )} */}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="text-center py-10 text-slate-500"
                                    >
                                        Nenhum registro encontrado
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                <div className="border-t border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                            Linhas por página:
                        </span>
                        <select
                            value={pagination.pageSize}
                            onChange={e => {
                                table.setPageSize(Number(e.target.value));
                            }}
                            className="select select-bordered select-sm bg-white"
                        >
                            {[10, 20, 30, 40, 50].map(pageSize => (
                                <option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-sm mr-4">
                            Página {pagination.pageIndex + 1} de {totalPages}
                        </span>

                        <button
                            className="btn btn-sm btn-square"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <CaretDoubleLeft size={16} />{" "}
                        </button>

                        <button
                            className="btn btn-sm btn-square"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <CaretLeft size={16} />{" "}
                        </button>

                        <button
                            className="btn btn-sm btn-square"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <CaretRight size={16} />
                        </button>

                        <button
                            className="btn btn-sm btn-square"
                            onClick={() =>
                                table.setPageIndex(table.getPageCount() - 1)
                            }
                            disabled={!table.getCanNextPage()}
                        >
                            <CaretDoubleRight size={16} />{" "}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
