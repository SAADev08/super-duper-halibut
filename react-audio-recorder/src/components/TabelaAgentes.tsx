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
import {
    CaretDoubleLeft,
    CaretDoubleRight,
    CaretLeft,
    CaretRight,
    NotePencil,
} from "@phosphor-icons/react";
import { getAgente } from "../api/agentesService";
import { useAgenteStore } from "../store/agentStore";

export interface TabelaAgentesProps {
    data: any;
    isLoading: boolean;
    isError: boolean;
    pagination: PaginationState;
    setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}
export default function TabelaAgentes(props: TabelaAgentesProps) {
    const { data, isLoading, isError, pagination, setPagination } = props;
    const [totalPages, setTotalPages] = useState(0);

    function handleEdit(agent: any) {
        async function fetchAgente() {
            const agente = await getAgente(agent.id_agente);
            console.log("agente", agente);
            useAgenteStore.getState().setAgenteSelecionado(agente);
        }

        fetchAgente();
    }

    const columns = [
        {
            accessorKey: "id_agente",
            header: "ID",
            cell: (info: any) => {
                return truncateMiddle(info.getValue());
            },
        },
        {
            accessorKey: "nome",
            header: "Nome",
            cell: (info: any) => info.getValue(),
        },
        {
            accessorKey: "comportamento",
            header: "Comportamento",
            cell: (info: any) => info.getValue(),
        },
        {
            accessorKey: "modelo",
            header: "Modelo",
            cell: (info: any) => info.getValue(),
        },
        {
            accessorKey: "acoes",
            header: "Ações",
            cell: (info: any) => {
                return (
                    <button
                        className="p-2 cursor-pointer"
                        onClick={() => {
                            console.log(info.row.original);
                            handleEdit(info.row.original);
                        }}
                    >
                        <NotePencil
                            size={16}
                            className="h-5 w-5 text-slate-500 hover:text-slate-400"
                        />
                    </button>
                );
            },
        },
    ];

    const table = useReactTable({
        data: data.dados,
        columns,
        pageCount: Math.ceil(data.total_registros / pagination.pageSize),
        manualPagination: true,
        state: {
            pagination,
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });

    useEffect(() => {
        setTotalPages(Math.ceil(data.total_registros / pagination.pageSize));
    }, [pagination, data.total_registros]);
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
