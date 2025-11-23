import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mic, MicOff, Send, FileText, CheckCircle, RefreshCw, Play, Pause } from "lucide-react";
import Footer from "@/components/Footer";
import FormattedFeedback from "@/components/FormattedFeedback";
import AudioAnalysisChart from "@/components/AudioAnalysisChart";
import VideoPreview from "@/components/VideoPreview";

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

const EssayInterview = () => {
  const navigate = useNavigate();
  const [essay, setEssay] = useState("");
  const [savedEssay, setSavedEssay] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioScores, setAudioScores] = useState<{
    pronunciation: number;
    speed: number;
    fluency: number;
    intonation: number;
    delivery: number;
  } | null>(null);
  const [enableCamera, setEnableCamera] = useState(false);
  const [tab, setTab] = useState("essay");
  const [followUpChain, setFollowUpChain] = useState<Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number | null;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [questionCount, setQuestionCount] = useState(10);

  useEffect(() => {
    loadUserSettings();
    loadSavedEssay();
  }, []);

  const loadUserSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_model, essay_question_count, enable_camera')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        setSelectedModel(data.ai_model || 'google/gemini-2.5-flash');
        setQuestionCount(data.essay_question_count || 10);
        setEnableCamera(data.enable_camera || false);
      }
    }
  };

  const loadSavedEssay = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('essays')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSavedEssay(data.content);
        setEssay(data.content);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleSaveEssay = async () => {
    if (!essay.trim()) {
      toast.error('자기소개서를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Check for grammar and style
      const { data: checkData, error: checkError } = await supabase.functions.invoke('essay-check', {
        body: { essay }
      });

      if (checkError) throw checkError;

      if (checkData.suggestions && checkData.suggestions.length > 0) {
        toast.info('맞춤법 및 문장 검토 완료!');
      }

      // Save essay
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error: saveError } = await supabase
        .from('essays')
        .insert({
          user_id: user.id,
          content: essay
        });

      if (saveError) {
        // If essay already exists, update it
        const { error: updateError } = await supabase
          .from('essays')
          .update({ content: essay, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
      }

      setSavedEssay(essay);
      toast.success('자기소개서가 저장되었습니다.');
    } catch (error: any) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!savedEssay.trim()) {
      toast.error('자기소개서를 먼저 저장해주세요.');
      return;
    }

    if (essay !== savedEssay) {
      toast.error('변경된 내용을 먼저 저장해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { essay: savedEssay, count: questionCount }
      });

      if (error) throw error;

      setQuestions(data.questions || []);
      setCurrentQuestionIndex(0);
      setTab("interview");
      toast.success('질문이 생성되었습니다!');
    } catch (error: any) {
      toast.error('질문 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          setAudioChunks([audioBlob]);
          setRecordedAudioBlob(audioBlob);
          
          // Convert to base64 and submit
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            if (base64Audio) {
              await handleSubmitAudio(base64Audio);
            }
          };

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        toast.success('음성 녹음을 시작합니다.');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('마이크 접근 권한이 필요합니다.');
      }
    }
  };

  const handleSubmitAudio = async (audioBase64: string) => {
    setLoading(true);
    setFeedback("");
    setScore(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            audioBase64,
            question: questions[currentQuestionIndex],
            type: 'essay_based'
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get audio analysis');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let extractedScore: number | null = null;
      let scores = { pronunciation: 0, speed: 0, fluency: 0, intonation: 0, delivery: 0 };

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
                
                // Extract individual scores
                const pronunciationMatch = accumulatedText.match(/발음.*?(\d+)점/);
                const speedMatch = accumulatedText.match(/속도.*?(\d+)점/);
                const fluencyMatch = accumulatedText.match(/유창성.*?(\d+)점/);
                const intonationMatch = accumulatedText.match(/억양.*?(\d+)점/);
                const deliveryMatch = accumulatedText.match(/전달력.*?(\d+)점/);
                
                if (pronunciationMatch) scores.pronunciation = parseInt(pronunciationMatch[1]);
                if (speedMatch) scores.speed = parseInt(speedMatch[1]);
                if (fluencyMatch) scores.fluency = parseInt(fluencyMatch[1]);
                if (intonationMatch) scores.intonation = parseInt(intonationMatch[1]);
                if (deliveryMatch) scores.delivery = parseInt(deliveryMatch[1]);
                
                setAudioScores(scores);
                
                // Try to extract total score
                const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
                if (scoreMatch && !extractedScore) {
                  extractedScore = parseInt(scoreMatch[1]);
                  setScore(extractedScore);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Final score extraction
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
            session_type: 'essay_based',
            question: questions[currentQuestionIndex],
            answer: '음성 답변',
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
            p_reason: '자소서 기반 면접 연습 완료',
            p_session_id: sessionData.id
          });
          toast.success(`피드백을 받았습니다! +${mileageAmount} 마일리지`);
        } else {
          toast.success('피드백을 받았습니다!');
        }
      }
    } catch (error: any) {
      console.error('Audio analysis error:', error);
      toast.error('음성 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
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
            question: questions[currentQuestionIndex],
            answer,
            essay: savedEssay,
            type: 'essay_based',
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

      // Final score extraction
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
            session_type: 'essay_based',
            question: questions[currentQuestionIndex],
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
            p_reason: '자소서 기반 면접 연습 완료',
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

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswer("");
      setFeedback("");
      setScore(null);
      setFollowUpChain([]);
      setRecordedAudioBlob(null);
      setAudioScores(null);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setAnswer("");
      setFeedback("");
      setScore(null);
      setFollowUpChain([]);
      setRecordedAudioBlob(null);
      setAudioScores(null);
    }
  };

  const playRecordedAudio = async () => {
    if (!recordedAudioBlob) return;
    
    const audio = new Audio(URL.createObjectURL(recordedAudioBlob));
    audio.onended = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    audio.play();
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
            essay: savedEssay,
            type: 'essay_based',
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

      toast.success('피드백을 받았습니다!');
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

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="essay">자기소개서 작성</TabsTrigger>
            <TabsTrigger value="interview" disabled={questions.length === 0}>
              면접 연습
            </TabsTrigger>
          </TabsList>

          <TabsContent value="essay">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  자기소개서 입력
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="자기소개서를 입력하세요..."
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  rows={15}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEssay}
                    disabled={loading}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    저장 및 검토
                  </Button>
                  <Button
                    onClick={handleGenerateQuestions}
                    disabled={loading || !savedEssay.trim() || essay !== savedEssay}
                    variant="default"
                    className="flex-1"
                  >
                    질문 생성하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interview">
            {questions.length > 0 && (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePreviousQuestion}
                          disabled={currentQuestionIndex === 0}
                        >
                          이전 질문
                        </Button>
                        <span>질문 {currentQuestionIndex + 1} / {questions.length}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNextQuestion}
                          disabled={currentQuestionIndex === questions.length - 1}
                        >
                          다음 질문
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateQuestions}
                        disabled={loading}
                        title="새로운 질문 생성"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-6 bg-muted rounded-lg mb-6">
                      <p className="text-lg font-medium">{questions[currentQuestionIndex]}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant={isRecording ? "destructive" : "default"}
                          onClick={toggleRecording}
                          className="flex-1"
                        >
                          {isRecording ? (
                            <>
                              <MicOff className="h-4 w-4 mr-2" />
                              녹음 중지
                            </>
                          ) : (
                            <>
                              <Mic className="h-4 w-4 mr-2" />
                              음성으로 답변
                            </>
                          )}
                        </Button>
                      </div>

                      <Textarea
                        placeholder="여기에 답변을 입력하세요..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={8}
                        className="resize-none"
                      />
                      
                      {isRecording && (
                        <div className="flex items-center gap-2 text-destructive animate-pulse">
                          <div className="h-3 w-3 rounded-full bg-destructive" />
                          <span className="text-sm font-medium">녹음 중... (답변이 끝나면 다시 클릭하세요)</span>
                        </div>
                      )}

                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={loading || !answer.trim()}
                        className="w-full"
                      >
                        {loading ? (
                          "분석 중..."
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            AI 피드백 받기
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
                        <div className="flex items-center gap-2">
                          {recordedAudioBlob && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={playRecordedAudio}
                              disabled={isPlayingAudio}
                            >
                              {isPlayingAudio ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                          )}
                          {score !== null && (
                            <div className="text-2xl font-bold text-accent">
                              {score}점 / 100점
                            </div>
                          )}
                        </div>
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
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default EssayInterview;
