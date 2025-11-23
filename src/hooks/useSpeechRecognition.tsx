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
  const finalTranscriptRef = useRef<string>('');
  const shouldRestartRef = useRef<boolean>(false);

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

    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
      finalTranscriptRef.current = '';
    }
    
    shouldRestartRef.current = true;

    recognition.onstart = () => {
      setIsListening(true);
      if (finalTranscriptRef.current === '') {
        toast.success('음성 인식을 시작합니다. 편안하게 말씀해주세요.');
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      // 최종 확정된 결과만 누적
      for (let i = 0; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      // 최종 확정된 텍스트가 있으면 ref에 추가
      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }

      // 단어 수 계산
      const words = finalTranscriptRef.current.trim().split(/\s+/).filter(w => w.length > 0);
      setWordCount(words.length);

      // 최종 + 임시 텍스트 표시
      setTranscript(finalTranscriptRef.current + interimTranscript);
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // no-speech 에러는 자동 재시작으로 처리
        return;
      } else if (event.error === 'not-allowed') {
        toast.error('마이크 접근 권한이 필요합니다.');
        shouldRestartRef.current = false;
      } else if (event.error === 'aborted') {
        // 사용자가 명시적으로 중지한 경우
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      // 사용자가 명시적으로 중지하지 않았다면 자동으로 재시작
      if (shouldRestartRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Recognition restart failed:', e);
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Stop recognition failed:', e);
      }
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
    startTimeRef.current = 0;
    finalTranscriptRef.current = '';
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
