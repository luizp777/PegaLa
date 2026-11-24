import { useCallback, useEffect, useRef, useState } from 'react';

const NUMBER_WORDS_PT: Record<string, string> = {
  um: '1',
  uma: '1',
  dois: '2',
  duas: '2',
  tres: '3',
  três: '3',
  quatro: '4',
  cinco: '5',
  seis: '6',
  meia: '0,5',
  sete: '7',
  oito: '8',
  nove: '9',
  dez: '10',
  doze: '12',
};

/**
 * Converte frases faladas em português (números por extenso, expressões como `"um quilo e meio"` e conectivos)
 * em linhas separadas prontas para o {@link parseMultiLineInput}.
 *
 * @param transcript - Transcrição bruta capturada pelo microfone.
 * @returns Texto normalizado com um item por linha.
 */
export function normalizeSpokenPortuguese(transcript: string): string {
  let text = transcript.trim();
  if (!text) return '';

  // Replace compound spoken weight/quantity expressions BEFORE splitting on "e"
  text = text
    .replace(/\b(um|1)\s+(quilo|kilo|kg)\s+e\s+meio(\s+de)?\b/gi, '1.5kg')
    .replace(/\b(dois|2)\s+(quilos|kilos|kg)\s+e\s+meio(\s+de)?\b/gi, '2.5kg')
    .replace(/\b(um|1)\s+litro\s+e\s+meio(\s+de)?\b/gi, '1.5L')
    .replace(/\b(dois|2)\s+litros\s+e\s+meio(\s+de)?\b/gi, '2.5L')
    .replace(/\b(uma|1)\s+d[uú]zia\s+e\s+meia(\s+de)?\b/gi, '18 un')
    .replace(/\bmeio\s+quilo(\s+de)?\b/gi, '500g')
    .replace(/\bmeio\s+kilo(\s+de)?\b/gi, '500g')
    .replace(/\bmeio\s+litro(\s+de)?\b/gi, '500ml')
    .replace(/\bduzentos\s+gramas(\s+de)?\b/gi, '200g')
    .replace(/\bduzentas\s+gramas(\s+de)?\b/gi, '200g')
    .replace(/\btrezentos\s+gramas(\s+de)?\b/gi, '300g')
    .replace(/\bquinhentos\s+gramas(\s+de)?\b/gi, '500g');

  // Split multi-item spoken phrases on non-decimal commas, " e ", " mais ", or " também "
  const segments = text
    .split(/\s*(?:(?<!\d),(?!\d)|\be\b|\bmais\b|\btamb[eé]m\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const normalizedLines = segments.map((seg) => {
    // Convert leading Portuguese number words ("dois leites" -> "2 leites")
    const words = seg.split(/\s+/);
    if (words.length >= 2) {
      const firstLower = words[0].toLowerCase();
      if (NUMBER_WORDS_PT[firstLower]) {
        words[0] = NUMBER_WORDS_PT[firstLower];
      }
    }
    return words.join(' ');
  });

  return normalizedLines.join('\n');
}

/**
 * Alternativa individual retornada pela Web Speech API.
 */
interface SpeechRecognitionAlternativeLike {
  /** Texto transcrito pelo reconhecedor de fala. */
  transcript: string;
}

/**
 * Resultado parcial ou final de reconhecimento de fala.
 */
interface SpeechRecognitionResultLike {
  /** Indica se a transcrição deste segmento foi finalizada. */
  isFinal: boolean;
  /** Melhor alternativa reconhecida. */
  0: SpeechRecognitionAlternativeLike;
}

/**
 * Evento emitido quando o reconhecedor de fala produz novos resultados.
 */
interface SpeechRecognitionEventLike {
  /** Coleção indexada de resultados da sessão atual. */
  results: ArrayLike<SpeechRecognitionResultLike>;
}

/**
 * Contrato mínimo da instância `SpeechRecognition` / `webkitSpeechRecognition`.
 */
interface SpeechRecognitionLike {
  /** Idioma de reconhecimento (ex.: `pt-BR`). */
  lang: string;
  /** Define se transcrições parciais devem ser emitidas em tempo real. */
  interimResults: boolean;
  /** Define se a captura continua após pausas. */
  continuous: boolean;
  /** Número máximo de alternativas retornadas por frase. */
  maxAlternatives: number;
  /** Inicia a captura de áudio pelo microfone. */
  start: () => void;
  /** Encerra a captura processando o áudio pendente. */
  stop: () => void;
  /** Cancela imediatamente a sessão de reconhecimento. */
  abort: () => void;
  /** Callback acionado ao receber transcrições. */
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  /** Callback acionado em falhas de permissão, rede ou captura. */
  onerror: ((ev: { error: string }) => void) | null;
  /** Callback acionado ao término da sessão de reconhecimento. */
  onend: (() => void) | null;
}

/**
 * Construtor da Web Speech API disponível no objeto `window`.
 */
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Obtém o construtor `SpeechRecognition` nativo ou com prefixo `webkit`.
 *
 * @returns Construtor disponível ou `null` se o navegador não suportar reconhecimento de voz.
 */
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

/**
 * Hook React para captura de itens por voz em português do Brasil via Web Speech API.
 *
 * @param onTranscriptFinal - Callback executado quando uma frase final é normalizada.
 * @param onError - Callback opcional para exibir mensagens de erro amigáveis (ex.: permissão negada).
 * @returns Estado de suporte, status de escuta, texto parcial e controles `toggleListening` e `stopListening`.
 */
export function useVoiceInput(
  onTranscriptFinal: (normalizedText: string, rawTranscript: string) => void,
  onError?: (message: string) => void
) {
  const isSupported = getSpeechRecognitionCtor() !== null;
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscriptFinal);
  const errorCallbackRef = useRef(onError);

  useEffect(() => {
    callbackRef.current = onTranscriptFinal;
    errorCallbackRef.current = onError;
  }, [onTranscriptFinal, onError]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    try {
      const recognition = new Ctor();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let finalText = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript ?? '';
          if (res.isFinal) finalText += ` ${text}`;
          else interim += ` ${text}`;
        }
        setInterimText(interim.trim());
        if (finalText.trim()) {
          const raw = finalText.trim();
          const normalized = normalizeSpokenPortuguese(raw);
          setInterimText('');
          setIsListening(false);
          callbackRef.current(normalized, raw);
        }
      };

      recognition.onerror = (ev) => {
        setIsListening(false);
        setInterimText('');
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          errorCallbackRef.current?.('Permita o acesso ao microfone no navegador');
        } else if (ev.error === 'network') {
          errorCallbackRef.current?.('Reconhecimento de voz indisponível offline');
        } else if (ev.error === 'audio-capture') {
          errorCallbackRef.current?.('Nenhum microfone detectado no aparelho');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      setInterimText('');
      recognition.start();
    } catch {
      setIsListening(false);
      setInterimText('');
    }
  }, [isListening, stopListening]);

  return { isSupported, isListening, interimText, toggleListening, stopListening };
}
