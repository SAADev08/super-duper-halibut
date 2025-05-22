import { useEffect, useState } from "react";
import { modelosLLM } from "../utils";
import * as yup from "yup";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCriarAgente, useEditarAgente } from "../hooks/useAgentes";

type FormValues = {
    nome: string;
    modelo: string;
    comportamento: string;
    z_api_id_instancia?: string;
    z_api_token?: string;
    z_api_client_token?: string;
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    cont?: any;
}

export default function ModalAgente({ isOpen, onClose, cont }: ModalProps) {
    const [valueText, setValueText] = useState("");

    const { mutate: criarAgente } = useCriarAgente();
    const { mutate: editarAgente } = useEditarAgente();

    const schema = yup.object({
        nome: yup.string().required("Nome é obrigatório"),
        modelo: yup.string().required("Modelo é obrigatório"),
        comportamento: yup.string().required("Comportamento é obrigatório"),
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitSuccessful },
        setValue,
        getValues,
        reset,
        watch,
    } = useForm<FormValues>({
        resolver: yupResolver(schema),
    });

    const selected = watch("modelo");

    const onSubmit: SubmitHandler<FormValues> = data => {
        console.log(data, cont);
        if (cont) {
            const obj = {
                ...data,
                id_agente: cont.id_agente,
                conta_temp: cont.conta_temp,
            };
            editarAgente(obj, {
                onSuccess: () => {
                    onClose();
                },
                onError: error => {
                    console.error("Erro ao editar agente:", error);
                },
            });
        } else {
            const obj = {
                ...data,
                z_api_id_instancia: data.z_api_id_instancia || null,
                z_api_token: data.z_api_token || null,
                z_api_client_token: data.z_api_client_token || null,
            };
            console.log(obj);
            criarAgente(obj, {
                onSuccess: () => {
                    onClose();
                },
                onError: error => {
                    console.error("Erro ao criar agente:", error);
                },
            });
        }
    };

    // useEffect(() => {
    //     if (isSubmitSuccessful) {
    //         reset();
    //         setValueText("");
    //     }
    // }, [isSubmitSuccessful, reset]);

    useEffect(() => {
        console.log("cont", cont);
        if (cont) {
            setValue("nome", cont.nome);
            setValue("modelo", cont.modelo);
            setValue("comportamento", cont.comportamento);
            setValueText(cont.comportamento);
            setValue("z_api_id_instancia", cont.z_api_id_instancia);
            setValue("z_api_token", cont.z_api_token);
            setValue("z_api_client_token", cont.z_api_client_token);
        }
    }, [isOpen, cont]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="modal modal-open">
                <div className="modal-box max-w-[85vw] md:max-w-[65vw] bg-white">
                    <h2 className="text-lg font-bold mb-4">Criar Agente</h2>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="px-4 bg-white sm:p-6">
                            <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6 md:col-span-3 lg:col-span-3">
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        htmlFor="nome"
                                    >
                                        Nome do Agente
                                    </label>
                                    <input
                                        {...register("nome", {
                                            required: true,
                                        })}
                                        type="text"
                                        id="nome"
                                        placeholder="Nome do Agente"
                                        className="input border border-gray-300 focus:border-none rounded-lg w-full p-2"
                                    />
                                    <p className="font-light text-red-500">
                                        {errors.nome?.message}
                                    </p>
                                </div>{" "}
                                <div className="col-span-6 md:col-span-3 lg:col-span-3">
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        htmlFor="modelo"
                                    >
                                        Modelo
                                    </label>
                                    {/* Campo hidden que integra com react-hook-form */}
                                    <input
                                        type="hidden"
                                        {...register("modelo", {
                                            required: true,
                                        })}
                                    />

                                    <div className="dropdown w-full">
                                        <label
                                            tabIndex={0}
                                            className="btn font-normal w-full rounded-lg justify-between bg-white border hover:border-2 border-gray-300 hover:border-black"
                                        >
                                            {selected
                                                ? modelosLLM.find(
                                                      o => o.value === selected
                                                  )?.label
                                                : "Selecione um modelo"}
                                        </label>
                                        <div className="dropdown-content menu shadow bg-white w-full rounded-box max-h-60 overflow-y-auto border border-gray-200">
                                            {" "}
                                            <ul tabIndex={0}>
                                                {modelosLLM.map(o => (
                                                    <li
                                                        key={o.id}
                                                        value={o.value}
                                                        onClick={() =>
                                                            setValue(
                                                                "modelo",
                                                                o.value
                                                            )
                                                        }
                                                    >
                                                        <a className="flex flex-col items-start p-2 w-full hover:bg-gray-100">
                                                            <span className="font-medium">
                                                                {o.label}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                {o.description}
                                                            </span>
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p className="font-light text-red-500">
                                                {errors.modelo?.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-6 ">
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        htmlFor="comportamento"
                                    >
                                        Comportamento do Agente
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            {...register("comportamento", {
                                                required: true,
                                            })}
                                            className="textarea h-auto w-full resize-none rounded-lg outline-none pr-16 focus:border-none"
                                            placeholder="Descrição do comportamento"
                                            rows={2}
                                            onChange={e =>
                                                setValueText(e.target.value)
                                            }
                                            maxLength={250}
                                        ></textarea>
                                        <span className="absolute bottom-2 right-5 text-xs text-gray-500">
                                            {valueText.length} / {250}
                                        </span>
                                    </div>
                                    <p className="font-light text-red-500">
                                        {errors.comportamento?.message}
                                    </p>
                                </div>
                                <div className="divider m-0 col-span-6"></div>
                                <div className="col-span-6 -mt-5">
                                    <span className="absolute text-xs text-gray-500">
                                        Opcional
                                    </span>
                                </div>
                                <div className="col-span-6 md:col-span-3 lg:col-span-2">
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        htmlFor="z_api_id_instancia"
                                    >
                                        Z-api ID da Instância
                                    </label>
                                    <input
                                        type="text"
                                        id="z_api_id_instancia"
                                        className="border border-gray-300 rounded-lg w-full p-2"
                                    />
                                </div>
                                <div className="col-span-6 md:col-span-3 lg:col-span-2">
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        htmlFor="z_api_token"
                                    >
                                        Z-api Token
                                    </label>
                                    <input
                                        type="text"
                                        id="z_api_token"
                                        className="border border-gray-300 rounded-lg w-full p-2"
                                    />
                                </div>
                                <div className="col-span-6 md:col-span-3 lg:col-span-2">
                                    <label
                                        className="block text-sm font-medium mb-2"
                                        htmlFor="z_api_client_token"
                                    >
                                        Z-api Token de Cliente
                                    </label>
                                    <input
                                        type="text"
                                        id="z_api_client_token"
                                        className="border border-gray-300 rounded-lg w-full p-2"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-action">
                            <button
                                type="button"
                                onClick={() => {
                                    reset();
                                    setValueText("");
                                    onClose();
                                }}
                                className="mr-2 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                {cont ? "Editar" : "Criar"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
