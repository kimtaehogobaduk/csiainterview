import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mic, MicOff, RefreshCw, Send, Square } from "lucide-react";
import { getRandomQuestion } from "@/constants/questions";
import Footer from "@/components/Footer";
import FormattedFeedback from "@/components/FormattedFeedback";
import AudioAnalysisChart from "@/components/AudioAnalysisChart";
import VideoPreview from "@/components/VideoPreview";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface FollowUpItem {
  question: string;
  answer: string;
  feedback: string;
  score: number | null;
}

const FollowUpQuestionCard = ({ 
  item, 
  index, 
  loading, 
  onSubmit 
}: { 
  item: FollowUpItem; 
  index: number; 
  loading: boolean;
  onSubmit: (answer: string, question: string) => Promise<void>;
}) => {
  const [nextAnswer, setNextAnswer] = useState("");
  const [showInput, setShowInput] = useState(false);

  return (
    <>
      <Card className="shadow-soft border-accent/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-accent">추가 질문 {index + 1}</CardTitle>
            {item.score !== null && (
              <div className="text-xl font-bold">{item.score}점</div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">{item.question}</p>
          </div>
          <div className="p-4 bg-background rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">내 답변:</p>
            <p>{item.answer}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">피드백:</p>
            <FormattedFeedback content={item.feedback} />
          </div>
          {!showInput && (
            <Button onClick={() => setShowInput(true)} variant="outline" className="w-full">
              추가 질문에 답변하기
            </Button>
          )}
        </CardContent>
      </Card>

      {showInput && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>추가 질문 {index + 2}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="추가 답변을 입력하세요..."
              value={nextAnswer}
              onChange={(e) => setNextAnswer(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <Button
              onClick={async () => {
                await onSubmit(nextAnswer, `${item.question}에 대한 추가 질문: ${item.feedback.split('\n')[0]}`);
                setNextAnswer("");
                setShowInput(false);
              }}
              disabled={loading || !nextAnswer.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              AI 피드백 받기
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
};

const CommonInterview = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [audioScores, setAudioScores] = useState<{
    pronunciation: number;
    speed: number;
    fluency: number;
    intonation: number;
    delivery: number;
  } | null>(null);
  const [enableCamera, setEnableCamera] = useState(false);
  const [followUpChain, setFollowUpChain] = useState<Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number | null;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  
  const { 
    transcript, 
    isListening, 
    wordCount, 
    duration,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition();

  useEffect(() => {
    setQuestion(getRandomQuestion());
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_model, enable_camera')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        setSelectedModel(data.ai_model || 'google/gemini-2.5-flash');
        setEnableCamera(data.enable_camera || false);
      }
    }
  };

  const handleNewQuestion = () => {
    setQuestion(getRandomQuestion());
    setAnswer("");
    setFeedback("");
    setScore(null);
    setFollowUpChain([]);
    setAudioScores(null);
    resetTranscript();
  };

  const handleSubmitFollowUp = async (followUpAnswer: string, parentQuestion: string) => {
    if (!followUpAnswer.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            question: parentQuestion,
            answer: followUpAnswer,
            type: 'common',
            isFollowUp: true,
            model: selectedModel
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get feedback');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let extractedScore: number | null = null;

      // Add placeholder for streaming update
      const tempIndex = followUpChain.length;
      setFollowUpChain(prev => [...prev, {
        question: parentQuestion,
        answer: followUpAnswer,
        feedback: '',
        score: null
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedText += content;
                
                // Update streaming content
                setFollowUpChain(prev => prev.map((item, idx) => 
                  idx === tempIndex 
                    ? { ...item, feedback: accumulatedText }
                    : item
                ));
                
                // Try to extract score
                const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
                if (scoreMatch && !extractedScore) {
                  extractedScore = parseInt(scoreMatch[1]);
                  setFollowUpChain(prev => prev.map((item, idx) => 
                    idx === tempIndex 
                      ? { ...item, score: extractedScore }
                      : item
                  ));
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Save session and award mileage
      const { data: { user } } = await supabase.auth.getUser();
      if (user && accumulatedText) {
        const { data: sessionData, error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'common',
            question: parentQuestion,
            answer: followUpAnswer,
            ai_feedback: accumulatedText,
            score: extractedScore
          })
          .select('id')
          .single();

        if (!saveError && extractedScore && sessionData) {
          const mileageAmount = extractedScore + 20;
          await supabase.rpc('award_mileage', {
            p_user_id: user.id,
            p_amount: mileageAmount,
            p_reason: '공통 면접 추가 질문 완료',
            p_session_id: sessionData.id
          });
          toast.success(`피드백을 받았습니다! +${mileageAmount} 마일리지`);
        } else {
          toast.success('피드백을 받았습니다!');
        }
      }
    } catch (error: any) {
      toast.error('피드백을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceAnswer = async () => {
    if (!transcript.trim()) {
      toast.error('음성 인식 결과가 없습니다.');
      return;
    }

    setLoading(true);
    setFeedback("");
    setScore(null);
    setAudioScores(null);

    try {
      const wordsPerMinute = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            question,
            answer: transcript,
            type: 'common_audio',
            model: selectedModel,
            audioMetrics: {
              wordsPerMinute,
              wordCount,
              duration: Math.round(duration)
            }
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get feedback');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let extractedScore: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedText += content;
                setFeedback(accumulatedText);
                
                const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
                if (scoreMatch && !extractedScore) {
                  extractedScore = parseInt(scoreMatch[1]);
                  setScore(extractedScore);
                }

                // Extract individual scores
                const pronunciationMatch = accumulatedText.match(/발음[^\d]*(\d+)점/);
                const speedMatch = accumulatedText.match(/속도[^\d]*(\d+)점/);
                const fluencyMatch = accumulatedText.match(/유창성[^\d]*(\d+)점/);
                const intonationMatch = accumulatedText.match(/억양[^\d]*(\d+)점/);
                const deliveryMatch = accumulatedText.match(/전달[^\d]*(\d+)점/);

                if (pronunciationMatch && speedMatch && fluencyMatch && intonationMatch && deliveryMatch) {
                  setAudioScores({
                    pronunciation: parseInt(pronunciationMatch[1]),
                    speed: parseInt(speedMatch[1]),
                    fluency: parseInt(fluencyMatch[1]),
                    intonation: parseInt(intonationMatch[1]),
                    delivery: parseInt(deliveryMatch[1])
                  });
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user && accumulatedText) {
        const { data: sessionData, error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'common',
            question,
            answer: transcript,
            ai_feedback: accumulatedText,
            score: extractedScore
          })
          .select('id')
          .single();

        if (!saveError && extractedScore && sessionData) {
          const mileageAmount = extractedScore + 30;
          await supabase.rpc('award_mileage', {
            p_user_id: user.id,
            p_amount: mileageAmount,
            p_reason: '공통 면접 연습 완료',
            p_session_id: sessionData.id
          });
          toast.success(`피드백을 받았습니다! +${mileageAmount} 마일리지`);
        } else {
          toast.success('피드백을 받았습니다!');
        }
      }
    } catch (error: any) {
      console.error('Voice analysis error:', error);
      toast.error('음성 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }

    setLoading(true);
    setFeedback("");
    setScore(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            question,
            answer,
            type: 'common',
            model: selectedModel
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get feedback');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let extractedScore: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedText += content;
                setFeedback(accumulatedText);
                
                // Try to extract score
                const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
                if (scoreMatch && !extractedScore) {
                  extractedScore = parseInt(scoreMatch[1]);
                  setScore(extractedScore);
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      // Final score extraction if not found during streaming
      if (!extractedScore) {
        const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
        if (scoreMatch) {
          extractedScore = parseInt(scoreMatch[1]);
          setScore(extractedScore);
        }
      }
      
      // Save session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sessionData, error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'common',
            question,
            answer,
            ai_feedback: accumulatedText,
            score: extractedScore
          })
          .select('id')
          .single();

        // Award mileage based on score
        if (!saveError && extractedScore && sessionData) {
          const mileageAmount = extractedScore + 30; // 점수 + 30을 마일리지로 지급
          await supabase.rpc('award_mileage', {
            p_user_id: user.id,
            p_amount: mileageAmount,
            p_reason: '공통 면접 연습 완료',
            p_session_id: sessionData.id
          });
          toast.success(`피드백을 받았습니다! +${mileageAmount} 마일리지`);
        } else {
          toast.success('피드백을 받았습니다!');
        }
      }
    } catch (error: any) {
      toast.error('피드백을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">공통 면접 질문</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewQuestion}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                새 질문
              </Button>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-muted rounded-lg mb-6">
                <p className="text-lg font-medium">{question}</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={isListening ? "destructive" : "default"}
                    onClick={isListening ? stopListening : startListening}
                    className="flex-1"
                    disabled={loading}
                  >
                    {isListening ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        음성 인식 중지
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        음성으로 답변
                      </>
                    )}
                  </Button>
                  {transcript && (
                    <Button
                      onClick={handleVoiceAnswer}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      음성 답변 제출
                    </Button>
                  )}
                </div>

                {transcript && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium text-primary">인식된 내용:</p>
                    <p className="text-sm">{transcript}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>단어 수: {wordCount}</span>
                      <span>속도: {duration > 0 ? Math.round((wordCount / duration) * 60) : 0} 단어/분</span>
                      <span>소요 시간: {Math.round(duration)}초</span>
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder="또는 여기에 답변을 입력하세요..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                
                {isListening && (
                  <div className="flex items-center gap-2 text-primary animate-pulse">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium">음성 인식 중... (답변이 끝나면 중지를 클릭하세요)</span>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={loading || !answer.trim()}
                  className="w-full"
                >
                  {loading ? (
                    "분석 중..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      텍스트 답변 제출
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {feedback && (
            <Card className="shadow-soft border-primary/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-primary">AI 피드백</CardTitle>
                  {score !== null && (
                    <div className="text-2xl font-bold text-accent">
                      {score}점 / 100점
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormattedFeedback content={feedback} />
              </CardContent>
            </Card>
          )}

          {audioScores && (
            <AudioAnalysisChart scores={audioScores} />
          )}

          {/* Follow-up questions chain */}
          {followUpChain.map((item, index) => (
            <FollowUpQuestionCard
              key={index}
              item={item}
              index={index}
              loading={loading}
              onSubmit={handleSubmitFollowUp}
            />
          ))}
          </div>

          {enableCamera && (
            <div className="lg:col-span-1">
              <VideoPreview />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CommonInterview;
