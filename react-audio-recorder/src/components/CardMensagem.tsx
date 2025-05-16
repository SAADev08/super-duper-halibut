import { useEffect } from "react";
import { useMensagem } from "../hooks/useMensagens";
import { DownloadSimple } from "@phosphor-icons/react";

export default function CardMensagem({ id_mensagem, mensagemSala: msg }: any) {
    const { data: mensagemHook, isLoading } = useMensagem(id_mensagem, {
        enabled: !msg,
    });

    const mensagem = msg || mensagemHook;

    var tzoffset = new Date().getTimezoneOffset() * 60000;

    useEffect(() => {
        if (mensagem) {
            console.log("mensagem", mensagem);
        }
    }, [mensagem]);

    if (isLoading || !mensagem) {
        return <div>Carregando...</div>;
    }

    return (
        <div className="join join-vertical bg-base-100 rounded-lg w-60">
            <div className="join-item text-xs text-gray-500 p-1">
                {new Date(mensagem.data_hora).toLocaleDateString("pt-BR")} •{" "}
                {new Date(
                    new Date(mensagem.data_hora).getTime() - tzoffset
                ).toLocaleTimeString("pt-BR")}
            </div>
            <div className="join-item collapse collapse-arrow border border-base-300 ">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">Pergunta</div>
                <div className="collapse-content text-sm">
                    <div className="max-h-40 overflow-y-auto pr-1">
                        {mensagem.pergunta}
                    </div>
                </div>
            </div>
            <div className="join-item collapse collapse-arrow border border-base-300">
                <input type="checkbox" defaultChecked />
                <div className="collapse-title font-semibold">Resposta</div>
                <div className="collapse-content text-sm pr-1">
                    <div
                        className="max-h-52 overflow-y-auto p-1 whitespace-pre-line break-words"
                        style={{
                            overflowWrap: "break-word",
                            wordWrap: "break-word",
                            wordBreak: "break-word",
                        }}
                    >
                        {mensagem.resposta !== null
                            ? mensagem.resposta
                                  .split(/(https?:\/\/[^\s]+)/g)
                                  .map((part: any, index: number) =>
                                      part.match(/(https?:\/\/[^\s]+)/g) ? (
                                          <a
                                              key={index}
                                              href={part}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                              {part}
                                          </a>
                                      ) : (
                                          part
                                      )
                                  )
                            : mensagem.resposta}
                    </div>
                </div>
            </div>
            {mensagem.path_audio !== null && mensagem.path_audio !== "" && (
                <div className="join-item border border-base-300 p-2">
                    <div className="flex text-sm justify-between items-center gap-1">
                        <audio
                            src={mensagem.path_audio}
                            controls
                            className="h-6"
                        ></audio>
                        <a
                            href={mensagem.path_audio}
                            download={`audio_${
                                new Date(new Date().getTime() - tzoffset)
                                    .toISOString()
                                    .split(".")[0]
                            }.webm`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            <DownloadSimple size={16} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
