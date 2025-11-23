import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  wordCount: number;
  duration: number;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    let fullTranscript = '';
    startTimeRef.current = Date.now();

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('음성 인식을 시작합니다. 편안하게 말씀해주세요.');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        fullTranscript += finalTranscript;
        const words = fullTranscript.trim().split(/\s+/).filter(w => w.length > 0);
        setWordCount(words.length);
      }

      setTranscript(fullTranscript + interimTranscript);
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error('음성이 감지되지 않았습니다. 다시 시도해주세요.');
      } else if (event.error === 'not-allowed') {
        toast.error('마이크 접근 권한이 필요합니다.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
      toast.info('음성 인식을 중지했습니다.');
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setWordCount(0);
    setDuration(0);
  }, []);

  return {
    transcript,
    isListening,
    wordCount,
    duration,
    startListening,
    stopListening,
    resetTranscript,
  };
};
