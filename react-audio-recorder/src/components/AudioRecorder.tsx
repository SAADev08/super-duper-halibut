import { useCallback, useEffect, useRef, useState } from "react";
import { sendAudioToAPI } from "../api/audioService";
import { useMeetingStore } from "../store/meetingStore";
import { useEditarSala } from "../hooks/useSalas";
import { useUIStore } from "../store/uiStore";
import { useTranscriptionStore } from "../store/transcriptionStore";
import { sendTextToAPI } from "../api/textService";
import { useTextStore } from "../store/textStore";
import CardMensagem from "./CardMensagem";
import { useMensagemStore } from "../store/messageStore";
import { Pause, Play } from "@phosphor-icons/react";

type RecordingStatus =
    | "idle"
    | "requesting"
    | "recording"
    | "waiting_for_sound"
    | "stopped"
    | "error";

interface AudioSegment {
    id: string;
    blob: Blob;
    url: string;
    timestamp: Date;
}

export default function AudioRecorder() {
    const [status, setStatus] = useState<RecordingStatus>("idle");
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [canStop, setCanStop] = useState<boolean>(false);
    const [recordingSource, setRecordingSource] = useState<
        "microphone" | "system"
    >("microphone");
    const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
    const [finalCombinedAudioUrl, setFinalCombinedAudioUrl] = useState<
        string | null
    >(null); // Para o áudio final combinado
    const [query, setQuery] = useState<string>(""); // Para a pergunta do usuário
    const [mensagensList, setMensagensList] = useState<any[]>([]); // Para armazenar as mensagens
    const [isFinalizado, setIsFinalizado] = useState(false); // Para verificar se a sala foi finalizada

    // Refs essenciais
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioLevelIntervalRef = useRef<number | null>(null);
    const minRecordTimerRef = useRef<number | null>(null);
    const silenceTimeoutRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0); // Timestamp do início do segmento de áudio

    // Refs para controle de estado e limpeza
    const isTemporaryStopRef = useRef(false); // Indica se a parada foi por silêncio
    const waitingForSoundToRestartRef = useRef(false); // Indica se está esperando som para reiniciar
    const originalMicStreamRef = useRef<MediaStream | null>(null);
    const originalScreenStreamRef = useRef<MediaStream | null>(null);
    const combinedStreamRef = useRef<MediaStream | null>(null); // Stream mixado sistema + microfone (persistente na sessão 'system')
    const audioDestinationNodeRef =
        useRef<MediaStreamAudioDestinationNode | null>(null);
    const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const displaySourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(
        null
    );
    const isManuallyPausedRef = useRef(false); // << NOVO REF para pausa manual

    const salaAtiva = useMeetingStore(s => s.salaAtiva);
    const { mutate: editarSala } = useEditarSala();
    const { setCurrentPage } = useUIStore();
    const { adicionarTranscricao, limparTranscricoes } =
        useTranscriptionStore.getState();
    const transcricoes = useTranscriptionStore(s => s.transcricoes);
    const { adicionarPerguntaEResposta, limparPerguntasERespostas } =
        useTextStore.getState();
    const perguntasERespostas = useTextStore(s => s.perguntasERespostas);
    const mensagensSala = useMensagemStore(s => s.mensagens);

    const MIN_RECORDING_TIME_MS = 3000; // 10 segundos
    const SILENCE_THRESHOLD = 45; // AJUSTAR VALOR PARA SILÊNCIO (conforme barulho ambiente)
    const SILENCE_DURATION_MS = 2000; // 2 segundos

    const tzoffset = new Date().getTimezoneOffset() * 60000;
    // --- Funções de Limpeza ---

    const stopMediaTracks = useCallback((stream: MediaStream | null) => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }, []);

    const cleanup = useCallback(
        (isFinalCleanup = true) => {
            console.log("Executando cleanup...", { isFinalCleanup });

            // Parar monitoramento e timers
            if (audioLevelIntervalRef.current)
                clearInterval(audioLevelIntervalRef.current);
            if (minRecordTimerRef.current)
                clearTimeout(minRecordTimerRef.current);
            if (silenceTimeoutRef.current)
                clearTimeout(silenceTimeoutRef.current);
            audioLevelIntervalRef.current = null;
            minRecordTimerRef.current = null;
            silenceTimeoutRef.current = null;

            // Parar MediaRecorder se ainda ativo
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== "inactive"
            ) {
                try {
                    mediaRecorderRef.current.stop(); // Isso pode disparar onstop novamente, mas onstop deve lidar com isso
                } catch (e) {
                    console.warn("Erro ao parar MediaRecorder no cleanup:", e);
                }
            }
            mediaRecorderRef.current = null;

            // Parar stream sendo gravado (microfone ou combinado)
            stopMediaTracks(audioStreamRef.current);
            audioStreamRef.current = null;

            // Apenas na limpeza final, parar streams originais e fechar context
            if (isFinalCleanup) {
                console.log("Executando limpeza FINAL");
                stopMediaTracks(originalMicStreamRef.current);
                stopMediaTracks(originalScreenStreamRef.current);
                originalMicStreamRef.current = null;
                originalScreenStreamRef.current = null;
                combinedStreamRef.current = null; // Limpa o stream combinado

                // Desconectar nós do AudioContext antes de fechar
                micSourceNodeRef.current?.disconnect();
                displaySourceNodeRef.current?.disconnect();
                micSourceNodeRef.current = null;
                displaySourceNodeRef.current = null;
                audioDestinationNodeRef.current = null;

                if (
                    audioContextRef.current &&
                    audioContextRef.current.state !== "closed"
                ) {
                    audioContextRef.current
                        .close()
                        .then(() => {
                            console.log("AudioContext fechado.");
                        })
                        .catch(e =>
                            console.error("Erro ao fechar AudioContext:", e)
                        );
                }
                audioContextRef.current = null;
                analyserRef.current = null; // Analyser está ligado ao context

                // Resetar estados
                setStatus("idle");
                setCanStop(false);
                setAudioLevel(0);
                setFinalCombinedAudioUrl(null); // Limpa URL combinada

                isManuallyPausedRef.current = false; // << RESETAR NA LIMPEZA FINAL
            }

            // Sempre limpar chunks e flags de estado
            chunksRef.current = [];
            waitingForSoundToRestartRef.current = false;
            isTemporaryStopRef.current = false; // Garantir que resetou
        },
        [stopMediaTracks]
    );

    // --- Monitoramento de Áudio ---

    const monitorAudioLevel = useCallback(() => {
        if (
            !analyserRef.current ||
            !audioContextRef.current ||
            audioContextRef.current.state === "closed"
        ) {
            console.warn(
                "Monitor de áudio não pode iniciar: Analyser ou AudioContext indisponível/fechado."
            );
            return;
        }

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Limpeza de timers anteriores
        if (audioLevelIntervalRef.current)
            clearInterval(audioLevelIntervalRef.current);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;

        console.log("Monitor de áudio iniciado/reiniciado.");

        audioLevelIntervalRef.current = window.setInterval(() => {
            // Parar se o contexto foi fechado ou não estamos mais gravando/esperando
            if (
                !audioContextRef.current ||
                audioContextRef.current.state === "closed" ||
                (!mediaRecorderRef.current &&
                    !waitingForSoundToRestartRef.current)
            ) {
                console.log(
                    "Parando monitor de áudio - contexto fechado ou estado inativo."
                );
                if (audioLevelIntervalRef.current)
                    clearInterval(audioLevelIntervalRef.current);
                audioLevelIntervalRef.current = null;
                return;
            }

            try {
                analyser.getByteFrequencyData(dataArray);
            } catch (error) {
                console.error(
                    "Erro ao obter dados do analyser (pode ocorrer durante cleanup):",
                    error
                );
                if (audioLevelIntervalRef.current)
                    clearInterval(audioLevelIntervalRef.current);
                audioLevelIntervalRef.current = null;
                return;
            }

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = bufferLength > 0 ? sum / bufferLength : 0;
            setAudioLevel(average);

            // VERIFICAÇÃO: Estamos aguardando som para reiniciar?
            if (
                waitingForSoundToRestartRef.current &&
                !isManuallyPausedRef.current && // << SÓ REINICIA AUTOMATICAMENTE SE NÃO ESTIVER PAUSADO MANUALMENTE
                average >= SILENCE_THRESHOLD
            ) {
                console.log(
                    `Som detectado (nível: ${average.toFixed(
                        2
                    )}). Reiniciando gravação.`
                );
                waitingForSoundToRestartRef.current = false; // Desativa flag ANTES de iniciar
                if (silenceTimeoutRef.current)
                    clearTimeout(silenceTimeoutRef.current); // Limpa timer de silêncio se houver
                silenceTimeoutRef.current = null;
                initializeMediaRecorder(); // Reinicia a gravação
                return; // Importante
            }

            // Não processar silêncio se já estiver esperando som ou pausado manualmente
            if (
                waitingForSoundToRestartRef.current ||
                isManuallyPausedRef.current
            )
                return;

            // --- Lógica de Parada por Silêncio ---
            const currentDurationMs = Date.now() - startTimeRef.current; // Tempo do segmento atual

            // Verificar se o MediaRecorder existe e está gravando
            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state !== "recording") {
                if (silenceTimeoutRef.current) {
                    // Limpa timer se o recorder parou por outro motivo
                    clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = null;
                }
                return; // Não faz nada se não estiver gravando ativamente
            }

            if (average < SILENCE_THRESHOLD) {
                // Só inicia timer de silêncio se:
                // 1. Tempo mínimo foi atingido
                // 2. Não há um timer de silêncio pendente
                if (
                    currentDurationMs >= MIN_RECORDING_TIME_MS &&
                    !silenceTimeoutRef.current
                ) {
                    console.log(
                        `Silêncio detectado (nível: ${average.toFixed(
                            2
                        )}). Iniciando timeout de ${SILENCE_DURATION_MS}ms para parar temporariamente.`
                    );
                    silenceTimeoutRef.current = window.setTimeout(() => {
                        // Verifica novamente se ainda está gravando antes de parar
                        if (
                            mediaRecorderRef.current &&
                            mediaRecorderRef.current.state === "recording"
                        ) {
                            console.log(
                                "Timeout de silêncio acionado! Parando temporariamente."
                            );
                            stopRecordingTemporarily();
                        } else {
                            console.log(
                                'Parada temporária cancelada - estado não é mais "recording".'
                            );
                        }
                        silenceTimeoutRef.current = null; // Limpa a ref do timer
                    }, SILENCE_DURATION_MS);
                }
            } else {
                // Se HOUVER som e HÁ um timer de silêncio rodando... cancela o timer.
                if (silenceTimeoutRef.current) {
                    console.log(
                        `Som detectado (nível: ${average.toFixed(
                            2
                        )}). Cancelando timeout de parada.`
                    );
                    clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = null;
                }
            }
        }, 100); // Verifica a cada 100ms
    }, [MIN_RECORDING_TIME_MS, SILENCE_DURATION_MS, SILENCE_THRESHOLD]);

    // --- Funções de Controle da Gravação ---

    // Função para configurar e iniciar o MediaRecorder (reutilizável)
    const initializeMediaRecorder = useCallback(() => {
        if (!audioStreamRef.current) {
            console.error(
                "Não é possível inicializar o MediaRecorder: stream de áudio ausente."
            );
            cleanup(); // Limpa em caso de erro na inicialização
            setStatus("error");
            return;
        }
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            console.warn(
                "Tentativa de inicializar MediaRecorder enquanto um já está ativo/gravando. Ignorando."
            );
            return;
        }

        try {
            // Usa o stream de áudio já preparado (microfone ou combinado)
            const streamToRecord = audioStreamRef.current;

            // Verificar se o stream tem tracks ativas
            if (
                streamToRecord.getAudioTracks().length === 0 ||
                !streamToRecord
                    .getAudioTracks()
                    .some(t => t.enabled && t.readyState === "live")
            ) {
                console.error(
                    "Stream de áudio não contém tracks de áudio ativas ou habilitadas."
                );
                alert(
                    "Erro: Nenhuma fonte de áudio ativa encontrada para gravar."
                );
                cleanup();
                setStatus("error");
                return;
            }

            const recorderOptions: any = { mimeType: "audio/webm" }; // Ou 'audio/mp3', usando webm por ser mais comum
            try {
                if (!MediaRecorder.isTypeSupported(recorderOptions.mimeType)) {
                    console.warn(
                        `${recorderOptions.mimeType} não suportado, tentando default.`
                    );
                    delete recorderOptions.mimeType;
                }
            } catch (e) {
                console.warn(
                    "Erro ao verificar suporte de mimeType, usando default:",
                    e
                );
                delete recorderOptions.mimeType;
            }

            const mediaRecorder = new MediaRecorder(
                streamToRecord,
                recorderOptions
            );
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = []; // Limpa chunks para o novo segmento

            mediaRecorder.ondataavailable = event => {
                // console.log("ondataavailable", event.data);
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                } else {
                    console.log("ondataavailable: chunk vazio recebido");
                }
            };

            mediaRecorder.onstop = () => {
                const data = new Date(new Date().getTime() - tzoffset)
                    .toISOString()
                    .split(".")[0];

                console.log(
                    `MediaRecorder parado. Estado temporário: ${isTemporaryStopRef.current}`
                );
                // Verifica se há dados para criar o blob
                if (chunksRef.current.length > 0) {
                    const blob = new Blob(chunksRef.current, {
                        type: mediaRecorder.mimeType || "audio/webm",
                    });
                    const url = URL.createObjectURL(blob);
                    const newSegment: AudioSegment = {
                        id: `segmento-${data}`,
                        blob,
                        url,
                        timestamp: new Date(new Date().getTime()),
                    };
                    setAudioSegments(prev => [...prev, newSegment]);
                    const infos = {
                        sala: salaAtiva?.id_sala,
                        audio: blob,
                    };
                    handleSendAudio(infos); // Envia os dados para a API
                    console.log(
                        "Segmento de áudio criado:",
                        newSegment.id,
                        url
                    );
                } else {
                    console.log(
                        "Nenhum chunk de áudio para criar o Blob neste segmento."
                    );
                }

                // Limpa os chunks DEPOIS de criar o blob
                chunksRef.current = [];

                // Se NÃO for uma parada temporária, faz a limpeza completa
                if (!isTemporaryStopRef.current) {
                    console.log("Parada final - executando cleanup completo.");
                    cleanup(true);
                    setStatus("stopped");
                } else {
                    // É uma parada temporária, apenas reseta a flag e muda o estado
                    console.log(
                        "Parada temporária - preparando para esperar som."
                    );
                    isTemporaryStopRef.current = false; // Reseta a flag para a próxima parada
                    waitingForSoundToRestartRef.current = true; // Agora espera som
                    setStatus("waiting_for_sound");
                    // Não chama cleanup() aqui!
                }
            };

            mediaRecorder.onerror = event => {
                console.error("Erro no MediaRecorder:", event);
                setStatus("error");
                cleanup(true); // Limpeza completa em caso de erro
            };

            // Inicia a gravação do novo segmento
            mediaRecorder.start();
            startTimeRef.current = Date.now(); // Marca o início deste segmento
            setStatus("recording");
            console.log("Novo segmento de gravação iniciado.");

            // Inicia o monitoramento de áudio
            monitorAudioLevel();

            // Lógica do tempo mínimo
            setCanStop(false); // Desabilita o stop manual no início
            if (minRecordTimerRef.current)
                clearTimeout(minRecordTimerRef.current);
            minRecordTimerRef.current = window.setTimeout(() => {
                console.log("Tempo mínimo do segmento atual (10s) atingido.");
                setCanStop(true); // Habilita o botão de parar manual
                minRecordTimerRef.current = null;
            }, MIN_RECORDING_TIME_MS);
        } catch (error: any) {
            console.error("Erro ao inicializar MediaRecorder:", error);
            alert(`Erro ao configurar o gravador: ${error.message}`);
            cleanup(true);
            setStatus("error");
        }
    }, [cleanup, monitorAudioLevel, MIN_RECORDING_TIME_MS]);

    // Função PRINCIPAL para iniciar a gravação (chamada pelo botão)
    const startInitialRecording = async () => {
        if (status !== "idle" && status !== "stopped" && status !== "error") {
            console.warn(
                "Tentativa de iniciar gravação em estado inválido:",
                status
            );
            return;
        }
        console.log("Iniciando processo de gravação...");
        setStatus("requesting");
        setAudioSegments([]); // Limpa segmentos anteriores
        setFinalCombinedAudioUrl(null); // Limpa URL combinada anterior

        isManuallyPausedRef.current = false; // << RESETAR AO INICIAR NOVA SESSÃO

        // Limpeza preventiva caso algo tenha ficado para trás
        cleanup(true);

        try {
            let micStream: MediaStream | null = null;
            let screenStream: MediaStream | null = null;
            let streamForRecorder: MediaStream | null = null;

            // 1. Obter Streams Originais
            console.log("Requisitando stream do microfone...");
            micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            originalMicStreamRef.current = micStream; // Guarda referência original
            console.log("Stream do microfone obtido.");

            if (recordingSource === "system") {
                console.log("Requisitando stream da tela (com áudio)...");
                try {
                    screenStream = await navigator.mediaDevices.getDisplayMedia(
                        {
                            video: true, // Necessário para getDisplayMedia
                            audio: true, // Solicita áudio do sistema
                        }
                    );
                    originalScreenStreamRef.current = screenStream; // Guarda referência original
                    console.log("Stream da tela obtido.");

                    // Validar áudio do sistema
                    if (screenStream.getAudioTracks().length === 0) {
                        alert(
                            "Áudio do sistema não foi capturado. Verifique se você permitiu o compartilhamento de áudio na janela de seleção de tela/aba."
                        );
                        cleanup(true); // Limpa o stream do microfone
                        setStatus("error");
                        return;
                    }
                    console.log(
                        "Áudio do sistema detectado no stream da tela."
                    );
                } catch (err: any) {
                    if (
                        err.name === "NotAllowedError" ||
                        err.name === "AbortError"
                    ) {
                        console.warn(
                            "Permissão para captura de tela/áudio negada ou cancelada pelo usuário."
                        );
                        alert(
                            "Você precisa permitir a captura de tela e áudio do sistema para usar esta opção."
                        );
                    } else {
                        console.error("Erro ao obter stream da tela:", err);
                        alert(`Erro ao capturar a tela: ${err.message}`);
                    }
                    cleanup(true);
                    setStatus("error");
                    return;
                }
            }

            // 2. Configurar AudioContext e Analyser (e mixagem se necessário)
            const context = new AudioContext();
            audioContextRef.current = context;
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const micSource = context.createMediaStreamSource(micStream);
            micSourceNodeRef.current = micSource; // Guarda ref para desconectar depois

            if (recordingSource === "system" && screenStream) {
                const displaySource =
                    context.createMediaStreamSource(screenStream);
                displaySourceNodeRef.current = displaySource; // Guarda ref para desconectar

                const destination = context.createMediaStreamDestination();
                audioDestinationNodeRef.current = destination; // Guarda ref para desconectar

                micSource.connect(destination);
                displaySource.connect(destination); // Mixa os dois

                // Conecta a saída mixada ao analyser para monitoramento correto
                destination.stream.getAudioTracks().forEach(track => {
                    const mixedSourceForAnalyser =
                        context.createMediaStreamSource(
                            new MediaStream([track])
                        );
                    mixedSourceForAnalyser.connect(analyser);
                });

                combinedStreamRef.current = destination.stream; // Guarda o stream combinado
                streamForRecorder = combinedStreamRef.current; // Usa o combinado para o recorder
                console.log(
                    "Streams de áudio combinados e conectados ao analyser."
                );
            } else {
                // Apenas microfone
                micSource.connect(analyser); // Conecta microfone diretamente ao analyser
                streamForRecorder = micStream; // Usa o stream do microfone para o recorder
                console.log("Stream do microfone conectado ao analyser.");
            }

            audioStreamRef.current = streamForRecorder; // Define o stream que o MediaRecorder usará

            // 3. Iniciar o primeiro MediaRecorder
            initializeMediaRecorder(); // Chama a função que configura e inicia o recorder
        } catch (error: any) {
            console.error("Erro GERAL ao iniciar a gravação:", error);
            if (error.name === "NotAllowedError") {
                alert(
                    `Erro: Permissão para acessar o microfone negada. Verifique as configurações do seu navegador.`
                );
            } else if (error.name === "NotFoundError") {
                alert(`Erro: Nenhum dispositivo de microfone encontrado.`);
            } else {
                alert(`Erro ao iniciar a gravação: ${error.message}`);
            }
            cleanup(true); // Limpeza completa em caso de erro
            setStatus("error");
        }
    };

    // Função para PARAR a gravação MANUALMENTE (botão)
    const stopRecordingManually = useCallback(() => {
        console.log("Parada manual solicitada...");
        isManuallyPausedRef.current = false; // << RESETAR PAUSA MANUAL
        isTemporaryStopRef.current = false; // Garante que não é uma parada temporária
        waitingForSoundToRestartRef.current = false; // Cancela espera por som

        // Limpa timers imediatamente
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (minRecordTimerRef.current) clearTimeout(minRecordTimerRef.current); // Limpa timer de 10s também
        silenceTimeoutRef.current = null;
        minRecordTimerRef.current = null;

        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            console.log("Parando MediaRecorder (manualmente)...");
            mediaRecorderRef.current.stop(); // Dispara 'onstop' que fará a limpeza final
        } else if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "inactive" &&
            status === "waiting_for_sound"
        ) {
            // Caso especial: usuário clica em parar enquanto estava esperando som
            console.log("Parando manualmente enquanto esperava por som.");
            cleanup(true); // Executa a limpeza final diretamente
            setStatus("stopped");
        } else {
            console.warn(
                "Não foi possível parar manualmente: MediaRecorder não existe ou não está gravando/esperando."
            );
            // Força cleanup
            cleanup(true);
            setStatus("stopped");
        }
    }, [cleanup]);

    // Função para parar temporariamente (identificado silêncio)
    const stopRecordingTemporarily = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            console.log("Parando gravação temporariamente (silêncio)...");
            isTemporaryStopRef.current = true; // Marca como parada temporária ANTES de chamar stop()
            mediaRecorderRef.current.stop(); // Dispara 'onstop' que vai tratar como temporário
        } else {
            console.warn(
                "Tentativa de parada temporária, mas não estava gravando."
            );
        }
    }, []);

    // --- NOVA FUNÇÃO PARA PAUSE/RESUME MANUAL ---
    const toggleManualPauseResume = useCallback(() => {
        if (status === "recording") {
            // Ação: PAUSAR
            console.log("Pausar gravação manualmente solicitado.");
            if (!canStop && MIN_RECORDING_TIME_MS > 0) {
                // Se MIN_RECORDING_TIME_MS for 0, permite pausar sempre
                console.log(
                    `Não pode pausar ainda, aguardando tempo mínimo de ${
                        MIN_RECORDING_TIME_MS / 1000
                    }s do segmento.`
                );
            }

            isManuallyPausedRef.current = true;
            stopRecordingTemporarily(); // Isso vai parar, salvar o segmento e mudar status para 'waiting_for_sound'
        } else if (
            status === "waiting_for_sound" &&
            isManuallyPausedRef.current
        ) {
            // Ação: RETOMAR
            console.log("Retomar gravação manualmente solicitado.");
            isManuallyPausedRef.current = false;
            waitingForSoundToRestartRef.current = false; // Importante para não conflitar com auto-restart

            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            initializeMediaRecorder(); // Inicia um novo segmento de gravação
        }
    }, [
        status,
        stopRecordingTemporarily,
        initializeMediaRecorder,
        canStop,
        MIN_RECORDING_TIME_MS,
    ]);

    // Função para gerar áudio combinado (CHAMAR DEPOIS QUE A GRAVAÇÃO PARAR)
    const generateCombinedAudio = useCallback(async () => {
        if (audioSegments.length === 0) {
            console.log("Nenhum segmento para combinar.");
            setFinalCombinedAudioUrl(null);
            return;
        }
        if (audioSegments.length === 1) {
            console.log("Apenas um segmento, usando-o como final.");
            return;
        }

        console.log(`Combinando ${audioSegments.length} segmentos...`);
        try {
            // Pega os blobs de todos os segmentos
            const blobs = audioSegments.map(segment => segment.blob);

            const mimeType = blobs[0]?.type || "audio/webm";

            // Cria um novo Blob concatenado
            const combinedBlob = new Blob(blobs, { type: mimeType });
            const url = URL.createObjectURL(combinedBlob);

            console.log("Blob combinado criado:", url, combinedBlob.size);
            setFinalCombinedAudioUrl(url); // Define a URL para exibição/download
        } catch (error) {
            console.error("Erro ao combinar segmentos de áudio:", error);
            alert("Ocorreu um erro ao gerar o arquivo de áudio final.");
            setFinalCombinedAudioUrl(null);
        }
    }, [audioSegments]);

    // Efeito para limpar recursos ao desmontar
    useEffect(() => {
        return () => {
            console.log("Componente desmontando. Executando cleanup final.");
            cleanup(true); // Garante limpeza completa ao sair
        };
    }, [cleanup]);

    useEffect(() => {
        if (
            status === "stopped" &&
            audioSegments.length > 0 &&
            recordingSource === "system"
        ) {
            generateCombinedAudio();
        }
    }, [status, audioSegments, generateCombinedAudio, recordingSource]);

    useEffect(() => {
        const novosDados = [...transcricoes, ...perguntasERespostas];
        console.log("Novos dados:", novosDados);

        setMensagensList((prev: any) => {
            const idsExistentes = new Set(
                prev.map((item: any) => item.id_mensagem)
            );

            const unicos = novosDados.filter(
                item => !idsExistentes.has(item.id_mensagem)
            );

            const listaAtualizada = [...prev, ...unicos];

            // Ordenar por data_hora
            listaAtualizada.sort((a, b) => {
                const dataA = new Date(a.data_hora).getTime();
                const dataB = new Date(b.data_hora).getTime();
                return dataB - dataA; // Mais recente primeiro
            });

            return listaAtualizada;
        });
    }, [transcricoes, perguntasERespostas]);

    useEffect(() => {
        console.log("Mensagens List:", mensagensList);
    }, [mensagensList]);

    useEffect(() => {
        if (salaAtiva) {
            if (salaAtiva.data_hora_fin) {
                console.log("Sala já finalizada");
                setIsFinalizado(true);
            }
        }
    }, [salaAtiva]);

    useEffect(() => {
        console.log(mensagensSala);
        if (mensagensSala !== undefined) {
            console.log("Mensagens Sala:", mensagensSala);
        }
    }, [mensagensSala]);

    const handleSendAudio = async (infos: any) => {
        console.log(infos);
        const data = new Date(new Date().getTime() - tzoffset)
            .toISOString()
            .split(".")[0];
        const formData = new FormData();
        formData.append("file", infos.audio, `segmento-${data}.webm`); // Nome do arquivo com timestamp
        formData.append("model", "whisper-1");
        formData.append("language", "pt");

        try {
            const response = await sendAudioToAPI(formData, infos.sala);
            console.log("Resposta da API:", response);
            const transcricao = {
                id_mensagem: response.id_mensagem,
                pergunta: response.pergunta,
                resposta: response.resposta,
                data_hora: response.data_hora,
            };
            adicionarTranscricao(transcricao);
            console.log("Transcrição adicionada:", transcricao);
        } catch (error) {
            console.error("Erro ao enviar áudio para a API:", error);
        }
    };
    const handleSendText = async () => {
        console.log(query);
        if (!query) {
            console.error("Pergunta vazia. Não enviando para a API.");
            return;
        }
        const obj = {
            pergunta: query,
        };
        try {
            const response = await sendTextToAPI(obj, salaAtiva?.id_sala);
            console.log("Resposta da API:", response);
            const texto = {
                id_mensagem: response.id_mensagem,
                pergunta: response.pergunta,
                resposta: response.resposta,
                data_hora: response.data_hora,
            };
            adicionarPerguntaEResposta(texto);
        } catch (error) {
            console.error("Erro ao enviar áudio para a API:", error);
        }
        setQuery(""); // Limpa o campo de texto após enviar
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSendText();
        }
    };

    const handleFinalizar = (sala: any) => {
        const data = new Date(new Date().getTime() - tzoffset)
            .toISOString()
            .split(".")[0];

        editarSala(
            {
                ...sala,
                data_hora_fin: data,
            },
            {
                onSuccess: () => {
                    setCurrentPage("salas");
                },
            }
        );
        limparTranscricoes();
        limparPerguntasERespostas();
    };

    // --- Renderização ---
    // Define estados mais claros para a lógica de renderização
    const isRecordingPhase =
        status === "recording" || status === "waiting_for_sound";
    const canInteractWithStart =
        status === "idle" || status === "stopped" || status === "error";
    const isRequesting = status === "requesting";

    // Determina se o botão Iniciar deve ser mostrado
    const showStartButton = canInteractWithStart || isRequesting;
    // Determina se o botão Parar deve ser mostrado
    const showStopButton = isRecordingPhase && !isManuallyPausedRef.current;

    // --- Lógica para o botão de Pause/Resume ---
    const showManualPauseResumeButton =
        (status === "recording" ||
            (status === "waiting_for_sound" && isManuallyPausedRef.current)) &&
        !isRequesting; // Só mostra se estiver gravando ou manualmente pausado

    const manualPauseResumeButtonText =
        status === "recording" ? "Pausar Gravação" : "Retomar Gravação";
    const manualPauseResumeButtonIcon =
        status === "recording" ? (
            <Pause size={20} className="mr-2" />
        ) : (
            <Play size={20} className="mr-2" />
        );

    return (
        // AudioRecorder Otimizado
        <div className="h-full w-full bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 h-full overflow-hidden">
                {/* Coluna da esquerda (controles de gravação) */}
                <div className="lg:col-span-1 flex flex-col overflow-auto">
                    <div className="space-y-4">
                        {/* Pesquisa em texto */}
                        <div
                            className={`border rounded-lg p-3 ${
                                isFinalizado && "opacity-50 pointer-events-none"
                            }`}
                        >
                            <h2 className="text-sm font-medium text-gray-700 mb-2">
                                Pesquisa em texto
                            </h2>
                            <fieldset className="fieldset">
                                <textarea
                                    className="textarea h-auto w-full resize-none outline-none"
                                    placeholder="Pesquisar ..."
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    onKeyDown={() => handleKeyDown}
                                    rows={2}
                                ></textarea>
                                <button
                                    onClick={handleSendText}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Pesquisar
                                </button>
                            </fieldset>
                        </div>

                        {/* Escolha da fonte de áudio */}
                        <div
                            className={`border rounded-lg p-3 ${
                                isFinalizado && "opacity-50 pointer-events-none"
                            }`}
                        >
                            <h2 className="text-sm font-medium text-gray-700 mb-2">
                                1. Escolha a fonte de áudio
                            </h2>
                            <div className="flex flex-wrap gap-3 justify-center">
                                <button
                                    onClick={() =>
                                        setRecordingSource("microphone")
                                    }
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        recordingSource === "microphone"
                                            ? "bg-gray-800 text-white"
                                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                    }`}
                                >
                                    Microfone
                                </button>

                                <button
                                    onClick={() => setRecordingSource("system")}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        recordingSource === "system"
                                            ? "bg-gray-800 text-white"
                                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                    }`}
                                >
                                    Microfone + Sistema
                                </button>
                            </div>
                        </div>

                        {/* Controle da Gravação */}
                        <div
                            className={`border rounded-lg p-3 ${
                                isFinalizado && "opacity-50 pointer-events-none"
                            }`}
                        >
                            <h2 className="text-sm font-medium text-gray-700 mb-2">
                                2. Controle a Gravação
                            </h2>
                            <div className="flex flex-wrap gap-3 justify-center items-center">
                                {showStartButton && (
                                    <button
                                        onClick={startInitialRecording}
                                        className="btn bg-red-500 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
                                        disabled={isRequesting}
                                        aria-live="polite"
                                    >
                                        {isRequesting ? (
                                            <svg
                                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                        ) : (
                                            <svg
                                                className="w-5 h-5 mr-2"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <circle cx="10" cy="10" r="6" />
                                            </svg>
                                        )}
                                        {isRequesting
                                            ? "Pedindo Permissão..."
                                            : "Iniciar Gravação"}
                                    </button>
                                )}
                                {/* BOTÃO DE PAUSE/RESUME MANUAL */}
                                {showManualPauseResumeButton && (
                                    <button
                                        onClick={toggleManualPauseResume}
                                        // Não desabilitar por canStop, pois pausar é diferente de parar segmento
                                        // disabled={status === "recording" && !canStop}
                                        className={`px-6 py-3 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            status === "recording"
                                                ? "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400"
                                                : "bg-green-500 hover:bg-green-600 focus:ring-green-400"
                                        }`}
                                    >
                                        {manualPauseResumeButtonIcon}
                                        {manualPauseResumeButtonText}
                                    </button>
                                )}
                                {showStopButton && (
                                    <button
                                        onClick={stopRecordingManually}
                                        disabled={
                                            status === "recording" && !canStop
                                        }
                                        className="bg-gray-700 text-white px-6 py-3 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg
                                            className="w-5 h-5 mr-2"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <rect
                                                x="6"
                                                y="6"
                                                width="8"
                                                height="8"
                                            />
                                        </svg>
                                        Parar Gravação
                                    </button>
                                )}
                            </div>

                            {/* Indicadores de Estado e Nível de Áudio */}
                            {(isRecordingPhase || isRequesting) && (
                                <div className="w-full max-w-md mt-4 p-3 bg-gray-100 rounded">
                                    <div className="flex justify-center items-center space-x-2 mb-3">
                                        {status === "recording" && (
                                            <span className="text-sm font-medium text-green-700 animate-pulse">
                                                Gravando...
                                            </span>
                                        )}
                                        {status === "waiting_for_sound" && (
                                            <span className="text-sm font-medium text-yellow-700">
                                                Aguardando som...
                                            </span>
                                        )}
                                        {status === "waiting_for_sound" &&
                                            isManuallyPausedRef.current && (
                                                <span className="text-sm font-medium text-orange-600">
                                                    Pausado manualmente...
                                                </span>
                                            )}
                                        {isRequesting && (
                                            <span className="text-sm font-medium text-blue-600">
                                                Requisitando acesso...
                                            </span>
                                        )}
                                    </div>

                                    {/* Mostra nível de áudio */}
                                    {isRecordingPhase &&
                                        !isManuallyPausedRef.current && (
                                            <>
                                                <div className="flex justify-between mb-1 text-xs text-gray-600">
                                                    <span>Nível de áudio</span>
                                                    <span>
                                                        {Math.round(audioLevel)}
                                                    </span>
                                                </div>
                                                <div className="h-2.5 w-full bg-gray-300 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-100 ease-linear ${
                                                            audioLevel <
                                                            SILENCE_THRESHOLD
                                                                ? "bg-red-500"
                                                                : "bg-blue-500"
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(
                                                                Math.max(
                                                                    0,
                                                                    (audioLevel /
                                                                        (SILENCE_THRESHOLD *
                                                                            2)) *
                                                                        100
                                                                ),
                                                                100
                                                            )}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                                {status === "recording" &&
                                                    !isManuallyPausedRef.current &&
                                                    !canStop && (
                                                        <p className="text-xs text-center text-gray-500 mt-2">
                                                            Gravando por no
                                                            mínimo 10
                                                            segundos...
                                                        </p>
                                                    )}
                                            </>
                                        )}
                                </div>
                            )}
                            {status === "stopped" &&
                                audioSegments.length > 0 && (
                                    <p className="text-sm text-green-600 font-medium mt-4">
                                        Gravação Concluída!
                                    </p>
                                )}
                            {status === "error" && (
                                <p className="text-sm text-red-600 font-medium mt-4">
                                    Ocorreu um erro.
                                </p>
                            )}
                        </div>

                        {/* Resultados da Gravação - Agora com details/summary */}
                        <div
                            className={`border rounded-lg p-3 ${
                                isFinalizado && "opacity-50 pointer-events-none"
                            }`}
                        >
                            <details>
                                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                                    3. Resultados da Gravação
                                </summary>
                                <div className="mt-3">
                                    {/* Áudio Final Combinado */}
                                    {finalCombinedAudioUrl && (
                                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                                            <h3 className="text-sm font-semibold mb-2 text-green-800">
                                                Áudio Completo (Combinado)
                                            </h3>
                                            <audio
                                                src={finalCombinedAudioUrl}
                                                controls
                                                className="w-full mb-2"
                                            ></audio>
                                            <a
                                                href={finalCombinedAudioUrl}
                                                download={`gravacao_completa_${
                                                    new Date(
                                                        new Date().getTime() -
                                                            tzoffset
                                                    )
                                                        .toISOString()
                                                        .split(".")[0]
                                                }.webm`}
                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                Download Completo
                                            </a>
                                        </div>
                                    )}

                                    {/* Segmentos Individuais */}
                                    <div className="max-h-48 overflow-auto">
                                        <h3 className="text-sm font-semibold mb-2 text-gray-600">
                                            Segmentos Gravados
                                        </h3>
                                        {audioSegments.length === 0 ? (
                                            <p className="text-gray-500 text-center py-2 font-thin text-sm italic">
                                                {status === "idle"
                                                    ? "A gravação ainda não começou."
                                                    : "Nenhum segmento foi gravado ainda."}
                                            </p>
                                        ) : (
                                            <ul className="space-y-3">
                                                {audioSegments.map(
                                                    (segment, index) => (
                                                        <li
                                                            key={segment.id}
                                                            className="p-3 bg-gray-50 border border-gray-200 rounded"
                                                        >
                                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                                <span className="font-medium text-sm text-gray-700 mb-2 sm:mb-0">
                                                                    Segmento{" "}
                                                                    {index + 1}{" "}
                                                                    <span className="text-xs text-gray-500">
                                                                        (
                                                                        {segment.timestamp.toLocaleTimeString()}
                                                                        )
                                                                    </span>
                                                                </span>
                                                                <a
                                                                    href={
                                                                        segment.url
                                                                    }
                                                                    download={`segmento_${
                                                                        index +
                                                                        1
                                                                    }_${
                                                                        new Date(
                                                                            new Date().getTime() -
                                                                                tzoffset
                                                                        )
                                                                            .toISOString()
                                                                            .split(
                                                                                "."
                                                                            )[0]
                                                                    }.webm`}
                                                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                                >
                                                                    Download
                                                                    Segmento
                                                                </a>
                                                            </div>
                                                            <audio
                                                                src={
                                                                    segment.url
                                                                }
                                                                controls
                                                                className="w-full mt-2"
                                                            ></audio>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Botão Finalizar */}
                        <div className="flex justify-center mt-4">
                            <button
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition-colors"
                                onClick={() => {
                                    if (isFinalizado) {
                                        setCurrentPage("salas");
                                    } else handleFinalizar(salaAtiva);
                                }}
                                disabled={status === "recording"}
                            >
                                {isFinalizado ? "Voltar" : "Finalizar Sala"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Coluna da direita (transcrições e resultados) */}
                <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
                    {/* Perguntas e Respostas */}
                    <div className="bg-gray-200 rounded-lg p-4 h-full flex flex-col">
                        <h2 className="font-medium text-gray-700 mb-3">
                            Perguntas e Respostas
                        </h2>
                        <div className="border rounded p-1 bg-gray-200 flex-1 overflow-y-auto">
                            {isFinalizado ? (
                                (console.log(isFinalizado, mensagensSala),
                                mensagensSala && mensagensSala.length > 0 ? (
                                    <div className="flex flex-row gap-4 overflow-x-hidden flex-wrap">
                                        {mensagensSala.map((msg: any) => (
                                            <CardMensagem
                                                key={msg.id_mensagem}
                                                id_mensagem={msg.id_mensagem}
                                                mensagemSala={
                                                    isFinalizado
                                                        ? msg
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4 font-thin text-sm italic">
                                        Nenhuma pergunta foi feita na sala.
                                    </p>
                                ))
                            ) : mensagensList.length > 0 ? (
                                <div className="flex flex-row gap-4 overflow-x-hidden flex-wrap">
                                    {mensagensList.map(msg => (
                                        // <div
                                        //     key={index}
                                        //     className="join join-vertical bg-base-100 rounded-lg"
                                        // >
                                        //     <div className="join-item text-xs text-gray-500 p-1">
                                        //         {new Date(
                                        //             transcricao.data_hora
                                        //         ).toLocaleDateString(
                                        //             "pt-BR"
                                        //         )}{" "}
                                        //         •{" "}
                                        //         {new Date(
                                        //             new Date(
                                        //                 transcricao.data_hora
                                        //             ).getTime() - tzoffset
                                        //         ).toLocaleTimeString("pt-BR")}
                                        //     </div>
                                        //     <div className="join-item collapse collapse-arrow border border-base-300 ">
                                        //         <input type="checkbox" />
                                        //         <div className="collapse-title font-semibold">
                                        //             Pergunta
                                        //         </div>
                                        //         <div className="collapse-content text-sm">
                                        //             {transcricao.pergunta}
                                        //         </div>
                                        //     </div>
                                        //     <div className="join-item collapse collapse-arrow border border-base-300 ">
                                        //         <input type="checkbox" />
                                        //         <div className="collapse-title font-semibold">
                                        //             Resposta
                                        //         </div>
                                        //         <div className="collapse-content text-sm">
                                        //             {transcricao.resposta}
                                        //         </div>
                                        //     </div>
                                        // </div>
                                        <CardMensagem
                                            id_mensagem={msg.id_mensagem}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4 font-thin text-sm italic">
                                    Nenhuma pergunta ainda.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        //versão 2
        // <div className="h-full w-full bg-white rounded-lg shadow-sm">
        //     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-full">
        //         {/* Coluna da esquerda (controles e resultados) */}
        //         {/* <div className="lg:col-span-1 space-y-6">
        //             <div className="flex gap-2">
        //                 {" "}
        //                 <label className="input w-full">
        //                     <MagnifyingGlass size={18} />
        //                     <input
        //                         type="search"
        //                         className="grow"
        //                         placeholder="Pesquisar ..."
        //                         value={query}
        //                         onChange={e => setQuery(e.target.value)}
        //                         onKeyDown={handleKeyDown}
        //                     />
        //                 </label>{" "}
        //                 <button
        //                     onClick={handleSendText}
        //                     className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        //                 >
        //                     Pesquisar
        //                 </button>
        //             </div>

        //             <div className="border rounded-lg p-4 max-h-screen overflow-auto">
        //                 <h2 className="font-medium text-gray-700 mb-3">
        //                     Respostas
        //                 </h2>
        //                 <div className="border rounded p-3 bg-gray-50 overflow-auto max-h-60">
        //                     {perguntasERespostas.length > 0 ? (
        //                         perguntasERespostas.map((item, index) => (
        //                             <div
        //                                 key={index}
        //                                 className="mb-2 p-2 border-b last:border-b-0"
        //                             >
        //                                 <div className="text-xs text-gray-500 mb-1">
        //                                     Data •{" "}
        //                                     {new Date(
        //                                         item.data_hora
        //                                     ).toLocaleDateString("pt-BR")}{" "}
        //                                     •{" "}
        //                                     {new Date(
        //                                         new Date(
        //                                             item.data_hora
        //                                         ).getTime() - tzoffset
        //                                     ).toLocaleTimeString("pt-BR")}
        //                                 </div>
        //                                 <div className="text-sm">
        //                                     <p className="text-gray-800 font-semibold">
        //                                         Pergunta:
        //                                     </p>
        //                                     {item.pergunta}
        //                                     <p className="text-gray-800 font-semibold">
        //                                         Resposta:
        //                                     </p>{" "}
        //                                     {item.resposta}
        //                                 </div>
        //                             </div>
        //                         ))
        //                     ) : (
        //                         <p className="text-gray-500 text-center py-4 font-thin text-sm italic">
        //                             Nenhuma pesquisa ainda.
        //                         </p>
        //                     )}
        //                 </div>
        //             </div>
        //         </div> */}

        //         {/* Coluna do meio (controles de gravação) */}
        //         <div className="lg:col-span-1 space-y-6">
        //             <div className="border rounded-lg p-4">
        //                 <h2 className="text-sm font-medium text-gray-700 mb-2">
        //                     Pesquisa em texto
        //                 </h2>
        //                 <fieldset className="fieldset">
        //                     <textarea
        //                         className="textarea h-auto w-full resize-none outline-none"
        //                         placeholder="Pesquisar ..."
        //                     ></textarea>
        //                     <button
        //                         onClick={handleSendText}
        //                         className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        //                     >
        //                         Pesquisar
        //                     </button>
        //                 </fieldset>
        //             </div>
        //             <div className="border rounded-lg p-4">
        //                 <h2 className="text-sm font-medium text-gray-700 mb-2">
        //                     1. Escolha a fonte de áudio
        //                 </h2>
        //                 <div className="flex flex-wrap gap-3 justify-center">
        //                     <button
        //                         onClick={() => setRecordingSource("microphone")}
        //                         className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        //                             recordingSource === "microphone"
        //                                 ? "bg-gray-800 text-white"
        //                                 : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        //                         }`}
        //                     >
        //                         Microfone
        //                     </button>

        //                     <button
        //                         onClick={() => setRecordingSource("system")}
        //                         className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        //                             recordingSource === "system"
        //                                 ? "bg-gray-800 text-white"
        //                                 : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        //                         }`}
        //                     >
        //                         Microfone + Sistema
        //                     </button>
        //                 </div>
        //             </div>

        //             <div className="border rounded-lg p-4">
        //                 <h2 className="text-sm font-medium text-gray-700 mb-2">
        //                     2. Controle a Gravação
        //                 </h2>
        //                 <div className="flex flex-wrap gap-3 justify-center">
        //                     {showStartButton && (
        //                         <button
        //                             onClick={startInitialRecording}
        //                             className="btn bg-red-500 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait" // cursor-wait quando desabilitado
        //                             disabled={isRequesting} // Desabilita APENAS durante 'requesting'
        //                             aria-live="polite" // Informa leitores de tela sobre mudanças
        //                         >
        //                             {isRequesting ? (
        //                                 <svg
        //                                     className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
        //                                     xmlns="http://www.w3.org/2000/svg"
        //                                     fill="none"
        //                                     viewBox="0 0 24 24"
        //                                 >
        //                                     <circle
        //                                         className="opacity-25"
        //                                         cx="12"
        //                                         cy="12"
        //                                         r="10"
        //                                         stroke="currentColor"
        //                                         strokeWidth="4"
        //                                     ></circle>
        //                                     <path
        //                                         className="opacity-75"
        //                                         fill="currentColor"
        //                                         d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        //                                     ></path>
        //                                 </svg>
        //                             ) : (
        //                                 <svg
        //                                     className="w-5 h-5 mr-2"
        //                                     fill="currentColor"
        //                                     viewBox="0 0 20 20"
        //                                 >
        //                                     <circle cx="10" cy="10" r="6" />
        //                                 </svg>
        //                             )}
        //                             {isRequesting
        //                                 ? "Pedindo Permissão..."
        //                                 : "Iniciar Gravação"}
        //                         </button>
        //                     )}
        //                     {showStopButton && (
        //                         <button
        //                             onClick={stopRecordingManually}
        //                             // Desabilitado se estiver gravando E o tempo mínimo não passou AINDA
        //                             disabled={
        //                                 status === "recording" && !canStop
        //                             }
        //                             className="bg-gray-700 text-white px-6 py-3 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        //                         >
        //                             <svg
        //                                 className="w-5 h-5 mr-2"
        //                                 fill="currentColor"
        //                                 viewBox="0 0 20 20"
        //                             >
        //                                 <rect
        //                                     x="6"
        //                                     y="6"
        //                                     width="8"
        //                                     height="8"
        //                                 />
        //                             </svg>
        //                             Parar Gravação
        //                         </button>
        //                     )}
        //                 </div>
        //                 {/* Indicadores de Estado e Nível de Áudio */}
        //                 {/* Mostra indicadores se gravando, esperando ou requisitando */}
        //                 {(isRecordingPhase || isRequesting) && (
        //                     <div className="w-full max-w-md mt-4 p-3 bg-gray-100 rounded">
        //                         <div className="flex justify-center items-center space-x-2 mb-3">
        //                             {status === "recording" && (
        //                                 <span className="text-sm font-medium text-green-700 animate-pulse">
        //                                     Gravando...
        //                                 </span>
        //                             )}
        //                             {status === "waiting_for_sound" && (
        //                                 <span className="text-sm font-medium text-yellow-700">
        //                                     Aguardando som...
        //                                 </span>
        //                             )}
        //                             {isRequesting && (
        //                                 <span className="text-sm font-medium text-blue-600">
        //                                     Requisitando acesso...
        //                                 </span>
        //                             )}
        //                         </div>

        //                         {/* Mostra nível de áudio apenas se gravando ou esperando */}
        //                         {isRecordingPhase && (
        //                             <>
        //                                 <div className="flex justify-between mb-1 text-xs text-gray-600">
        //                                     <span>Nível de áudio</span>
        //                                     <span>
        //                                         {Math.round(audioLevel)}
        //                                     </span>
        //                                 </div>
        //                                 <div className="h-2.5 w-full bg-gray-300 rounded-full overflow-hidden">
        //                                     <div
        //                                         className={`h-full rounded-full transition-all duration-100 ease-linear ${
        //                                             audioLevel <
        //                                             SILENCE_THRESHOLD
        //                                                 ? "bg-red-500"
        //                                                 : "bg-blue-500"
        //                                         }`}
        //                                         style={{
        //                                             width: `${Math.min(
        //                                                 Math.max(
        //                                                     0,
        //                                                     (audioLevel /
        //                                                         (SILENCE_THRESHOLD *
        //                                                             2)) *
        //                                                         100
        //                                                 ),
        //                                                 100
        //                                             )}%`,
        //                                         }}
        //                                     ></div>
        //                                 </div>
        //                                 {/* Mostra aviso de tempo mínimo apenas se gravando e canStop for false */}
        //                                 {status === "recording" && !canStop && (
        //                                     <p className="text-xs text-center text-gray-500 mt-2">
        //                                         Gravando por no mínimo 10
        //                                         segundos...
        //                                     </p>
        //                                 )}
        //                             </>
        //                         )}
        //                     </div>
        //                 )}
        //                 {status === "stopped" && audioSegments.length > 0 && (
        //                     <p className="text-sm text-green-600 font-medium mt-4">
        //                         Gravação Concluída!
        //                     </p>
        //                 )}
        //                 {status === "error" && (
        //                     <p className="text-sm text-red-600 font-medium mt-4">
        //                         Ocorreu um erro.
        //                     </p>
        //                 )}
        //             </div>

        //             <div className="border rounded-lg p-4">
        //                 <h2 className="text-sm font-medium text-gray-700 mb-2">
        //                     3. Resultados da Gravação
        //                 </h2>
        //                 {/* Áudio Final Combinado */}
        //                 {finalCombinedAudioUrl && (
        //                     <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded">
        //                         <h3 className="text-sm font-semibold mb-2 text-green-800">
        //                             Áudio Completo (Combinado)
        //                         </h3>
        //                         <audio
        //                             src={finalCombinedAudioUrl}
        //                             controls
        //                             className="w-full mb-2"
        //                         ></audio>
        //                         <a
        //                             href={finalCombinedAudioUrl}
        //                             download={`gravacao_completa_${
        //                                 new Date(
        //                                     new Date().getTime() - tzoffset
        //                                 )
        //                                     .toISOString()
        //                                     .split(".")[0]
        //                             }.webm`}
        //                             className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        //                         >
        //                             Download Completo
        //                         </a>
        //                     </div>
        //                 )}

        //                 {/* Segmentos Individuais */}
        //                 <div>
        //                     <h3 className="text-sm font-semibold mb-2 text-gray-600">
        //                         Segmentos Gravados
        //                     </h3>
        //                     {audioSegments.length === 0 ? (
        //                         <p className="text-gray-500 text-center py-4 font-thin text-sm italic">
        //                             {status === "idle"
        //                                 ? "A gravação ainda não começou."
        //                                 : "Nenhum segmento foi gravado ainda."}
        //                         </p>
        //                     ) : (
        //                         <ul className="space-y-3">
        //                             {audioSegments.map((segment, index) => (
        //                                 <li
        //                                     key={segment.id}
        //                                     className="p-3 bg-gray-50 border border-gray-200 rounded"
        //                                 >
        //                                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        //                                         <span className="font-medium text-sm text-gray-700 mb-2 sm:mb-0">
        //                                             Segmento {index + 1}{" "}
        //                                             <span className="text-xs text-gray-500">
        //                                                 (
        //                                                 {segment.timestamp.toLocaleTimeString()}
        //                                                 )
        //                                             </span>
        //                                         </span>
        //                                         <a
        //                                             href={segment.url}
        //                                             download={`segmento_${
        //                                                 index + 1
        //                                             }_${
        //                                                 new Date(
        //                                                     new Date().getTime() -
        //                                                         tzoffset
        //                                                 )
        //                                                     .toISOString()
        //                                                     .split(".")[0]
        //                                             }.webm`}
        //                                             className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        //                                         >
        //                                             Download Segmento
        //                                         </a>
        //                                     </div>
        //                                     <audio
        //                                         src={segment.url}
        //                                         controls
        //                                         className="w-full mt-2"
        //                                     ></audio>
        //                                 </li>
        //                             ))}
        //                         </ul>
        //                     )}
        //                 </div>
        //             </div>

        //             <div className="flex justify-center mt-6">
        //                 <button
        //                     className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition-colors"
        //                     onClick={() => handleFinalizar(salaAtiva)}
        //                     disabled={status === "recording"}
        //                 >
        //                     Finalizar Sala
        //                 </button>
        //             </div>
        //         </div>
        //         {/* Coluna da direita (transcrições e respostas) */}
        //         <div className="lg:col-span-2 flex flex-col h-full">
        //             <div className="bg-gray-100 rounded-lg p-4 flex-1 overflow-auto">
        //                 <h2 className="font-medium text-gray-700 mb-3">
        //                     Perguntas e Respostas
        //                 </h2>
        //                 <div className="border rounded p-3 bg-gray-50 h-screen
        //                  flex flex-col">
        //                     <div className="flex-1 overflow-auto">
        //                         {transcricoes.length > 0 ? (
        //                             transcricoes.map(transcricao => (
        //                                 <div className="mb-2 border-b pb-2">
        //                                     <div className="text-xs text-gray-500 mb-1">
        //                                         Data •{" "}
        //                                         {new Date(
        //                                             transcricao.data_hora
        //                                         ).toLocaleDateString(
        //                                             "pt-BR"
        //                                         )}{" "}
        //                                         •{" "}
        //                                         {new Date(
        //                                             new Date(
        //                                                 transcricao.data_hora
        //                                             ).getTime() - tzoffset
        //                                         ).toLocaleTimeString("pt-BR")}
        //                                     </div>
        //                                     <div className="text-sm">
        //                                         {transcricao.pergunta}
        //                                     </div>{" "}
        //                                 </div>
        //                             ))
        //                         ) : (
        //                             <p className="text-gray-500 text-center py-4 font-thin text-sm italic">
        //                                 Nenhum pergunta ainda.
        //                             </p>
        //                         )}
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //     </div>
        // </div>

        //versão 1
        // <div className="max-w-3xl mx-auto p-4 font-sans">
        //   <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Gravador de Áudio Inteligente</h1>

        //   {/* Seleção da Fonte */}
        //   <div className="mb-6 p-4 border rounded-lg bg-gray-50">
        //     <h2 className="text-lg font-semibold mb-3 text-gray-700">1. Escolha a Fonte de Áudio</h2>
        //     <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        //       <button
        //         onClick={() => setRecordingSource('microphone')}
        //         className={`w-full sm:w-auto px-4 py-2 rounded font-medium transition-colors duration-150 ${
        //           recordingSource === 'microphone'
        //             ? 'bg-blue-600 text-white shadow-md'
        //             : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
        //         }`}
        //          // Desabilita a troca de fonte se não estiver em estado inicial/parado
        //         disabled={!canInteractWithStart }
        //       >
        //         Microfone Apenas
        //       </button>
        //       <button
        //         onClick={() => setRecordingSource('system')}
        //         className={`w-full sm:w-auto px-4 py-2 rounded font-medium transition-colors duration-150 ${
        //           recordingSource === 'system'
        //             ? 'bg-teal-600 text-white shadow-md'
        //             : 'bg-white text-teal-600 border border-teal-300 hover:bg-teal-50'
        //         }`}
        //          // Desabilita a troca de fonte se não estiver em estado inicial/parado
        //         disabled={!canInteractWithStart }
        //       >
        //         Microfone + Áudio do Sistema
        //       </button>
        //     </div>
        //      {(!canInteractWithStart ) && <p className="text-xs text-gray-500 mt-2">Mude a fonte apenas quando a gravação estiver parada.</p>}
        //   </div>

        //   {/* Controles e Status */}
        //   <div className="mb-8 p-4 border rounded-lg bg-white shadow">
        //     <h2 className="text-lg font-semibold mb-4 text-gray-700">2. Controle a Gravação</h2>
        //     <div className="flex flex-col items-center">
        //       <div className="flex space-x-4 mb-4 min-h-[52px]">
        //         {showStartButton && (
        //           <button
        //             onClick={startInitialRecording}
        //             className="bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait" // cursor-wait quando desabilitado
        //             disabled={isRequesting} // Desabilita APENAS durante 'requesting'
        //             aria-live="polite" // Informa leitores de tela sobre mudanças
        //           >
        //             {isRequesting ? (
        //               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        //                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        //                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        //               </svg>
        //             ) : (
        //               <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        //                 <circle cx="10" cy="10" r="6" />
        //               </svg>
        //             )}
        //             {isRequesting ? 'Pedindo Permissão...' : 'Iniciar Gravação'}
        //           </button>
        //         )}

        //         {/* Botão Parar: Mostrado durante a fase de gravação */}
        //         {showStopButton && (
        //           <button
        //             onClick={stopRecordingManually}
        //             // Desabilitado se estiver gravando E o tempo mínimo não passou AINDA
        //             disabled={status === 'recording' && !canStop}
        //             className="bg-gray-700 text-white px-6 py-3 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        //           >
        //             <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
        //               <rect x="6" y="6" width="8" height="8" />
        //             </svg>
        //             Parar Gravação
        //           </button>
        //         )}
        //       </div>

        //       {/* Indicadores de Estado e Nível de Áudio */}
        //        {/* Mostra indicadores se gravando, esperando ou requisitando */}
        //        {(isRecordingPhase || isRequesting) && (
        //         <div className="w-full max-w-md mt-4 p-3 bg-gray-100 rounded">
        //            <div className="flex justify-center items-center space-x-2 mb-3">
        //              {status === 'recording' && <span className="text-sm font-medium text-green-700 animate-pulse">Gravando...</span>}
        //              {status === 'waiting_for_sound' && <span className="text-sm font-medium text-yellow-700">Aguardando som...</span>}
        //              {isRequesting && <span className="text-sm font-medium text-blue-600">Requisitando acesso...</span>}
        //            </div>

        //             {/* Mostra nível de áudio apenas se gravando ou esperando */}
        //            {isRecordingPhase && (
        //              <>
        //                <div className="flex justify-between mb-1 text-xs text-gray-600">
        //                  <span>Nível de áudio</span>
        //                  <span>{Math.round(audioLevel)}</span>
        //                </div>
        //                <div className="h-2.5 w-full bg-gray-300 rounded-full overflow-hidden">
        //                  <div
        //                    className={`h-full rounded-full transition-all duration-100 ease-linear ${
        //                      audioLevel < SILENCE_THRESHOLD ? 'bg-red-500' : 'bg-blue-500'
        //                    }`}
        //                    style={{ width: `${Math.min(Math.max(0, (audioLevel / (SILENCE_THRESHOLD * 2)) * 100), 100)}%` }}
        //                  ></div>
        //                </div>
        //                 {/* Mostra aviso de tempo mínimo apenas se gravando e canStop for false */}
        //                {status === 'recording' && !canStop && <p className="text-xs text-center text-gray-500 mt-2">Gravando por no mínimo 10 segundos...</p>}
        //              </>
        //            )}
        //         </div>
        //        )}
        //        {status === 'stopped' && audioSegments.length > 0 && <p className="text-sm text-green-600 font-medium mt-4">Gravação Concluída!</p>}
        //        {status === 'error' && <p className="text-sm text-red-600 font-medium mt-4">Ocorreu um erro.</p>}
        //     </div>
        //   </div>

        //   {/* Lista de Segmentos e Áudio Final */}
        //   <div className="mb-8 p-4 border rounded-lg bg-white shadow">
        //      <h2 className="text-lg font-semibold mb-4 text-gray-700">3. Resultados da Gravação</h2>

        //      {/* Áudio Final Combinado */}
        //      {finalCombinedAudioUrl && (
        //         <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded">
        //             <h3 className="text-md font-semibold mb-2 text-green-800">Áudio Completo (Combinado)</h3>
        //             <audio src={finalCombinedAudioUrl} controls className="w-full mb-2"></audio>
        //             <a
        //                 href={finalCombinedAudioUrl}
        //                 download={`gravacao_completa_${new Date(new Date().getTime() - tzoffset)
        //                   .toISOString()
        //                   .split(".")[0]}.webm`}
        //                 className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        //             >
        //                 Download Completo
        //             </a>
        //         </div>
        //      )}

        //     {/* Segmentos Individuais */}
        //     <div>
        //         <h3 className="text-md font-semibold mb-2 text-gray-600">Segmentos Gravados</h3>
        //         {audioSegments.length === 0 ? (
        //         <p className="text-gray-500 text-center py-4 italic">
        //             {status === 'idle' ? "A gravação ainda não começou." : "Nenhum segmento foi gravado ainda."}
        //         </p>
        //         ) : (
        //         <ul className="space-y-3">
        //             {audioSegments.map((segment, index) => (
        //             <li key={segment.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
        //                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        //                     <span className="font-medium text-sm text-gray-700 mb-2 sm:mb-0">
        //                         Segmento {index + 1} <span className="text-xs text-gray-500">({segment.timestamp.toLocaleTimeString()})</span>
        //                      </span>
        //                     <a
        //                         href={segment.url}
        //                         download={`segmento_${index + 1}_${new Date(new Date().getTime() - tzoffset)
        //                           .toISOString()
        //                           .split(".")[0]}.webm`}
        //                         className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        //                     >
        //                         Download Segmento
        //                     </a>
        //                 </div>
        //                  <audio src={segment.url} controls className="w-full mt-2"></audio>
        //             </li>
        //             ))}
        //         </ul>
        //         )}
        //     </div>
        //   </div>

        //   <div className="p-4 border rounded-lg bg-white shadow">
        //     <h2 className="text-lg font-semibold mb-4 text-gray-700">4. Finalizar a Sala</h2>
        //     <div className="flex flex-col items-center">
        //       <div className="flex space-x-4 mb-4 min-h-[52px]">

        //           <button
        //             onClick={() => handleFinalizar(salaAtiva)}
        //             className="bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center shadow transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait" // cursor-wait quando desabilitado
        //             disabled={status === 'recording'} // Desabilita APENAS durante gravação
        //           >
        //             Finalizar Sala
        //           </button>

        //       </div>
        //     </div>
        //   </div>
        // </div>
    );
}
