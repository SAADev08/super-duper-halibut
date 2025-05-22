import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { truncateMiddle } from "../utils";
import React from "react";

export interface TabelaBaseProps {
    data: any;
    isLoading: boolean;
    isError: boolean;
}
export default function TabelaBase(props: TabelaBaseProps) {
    const { data, isLoading, isError } = props;

    const columns = [
        {
            accessorKey: "id_base_conhecimento",
            header: "ID",
            cell: (info: any) => {
                return truncateMiddle(info.getValue());
            },
        },
        {
            accessorKey: "descricao",
            header: "Descrição",
            cell: (info: any) => info.getValue(),
        },
        {
            accessorKey: "sequencia",
            header: "Sequência",
            cell: (info: any) => info.getValue(),
        },
    ];

    const table = useReactTable({
        data: data,
        columns,
        getCoreRowModel: getCoreRowModel(),
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

    return (
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
                                            <td key={cell.id} className="py-4">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
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
        </div>
    );
}
