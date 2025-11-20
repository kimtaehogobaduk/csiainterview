import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mic, MicOff, Send, FileText, CheckCircle, RefreshCw } from "lucide-react";
import Footer from "@/components/Footer";

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
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-muted-foreground mb-2">피드백:</p>
            <p className="whitespace-pre-wrap">{item.feedback}</p>
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
  const [recognition, setRecognition] = useState<any>(null);
  const [tab, setTab] = useState("essay");
  const [followUpChain, setFollowUpChain] = useState<Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number | null;
  }>>([]);

  useEffect(() => {
    loadSavedEssay();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'ko-KR';

      recognitionInstance.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswer(prev => prev + ' ' + transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        toast.error('음성 인식 오류가 발생했습니다.');
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

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
      console.error('Load essay error:', error);
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
      console.error('Error:', error);
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
        body: { essay: savedEssay }
      });

      if (error) throw error;

      setQuestions(data.questions || []);
      setCurrentQuestionIndex(0);
      setTab("interview");
      toast.success('질문이 생성되었습니다!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('질문 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!recognition) {
      toast.error('음성 인식이 지원되지 않는 브라우저입니다.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
      toast.success('음성 인식을 시작합니다.');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('interview-feedback', {
        body: {
          question: questions[currentQuestionIndex],
          answer,
          essay: savedEssay,
          type: 'essay_based'
        }
      });

      if (error) throw error;

      setFeedback(data.feedback);
      setScore(data.score);

      // Save session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'essay_based',
            question: questions[currentQuestionIndex],
            answer,
            ai_feedback: data.feedback,
            score: data.score
          });

        if (saveError) throw saveError;
      }

      toast.success('피드백을 받았습니다!');
    } catch (error: any) {
      console.error('Error:', error);
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
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setAnswer("");
      setFeedback("");
      setScore(null);
      setFollowUpChain([]);
    }
  };

  const handleSubmitFollowUp = async (followUpAnswer: string, parentQuestion: string) => {
    if (!followUpAnswer.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('interview-feedback', {
        body: {
          question: parentQuestion,
          answer: followUpAnswer,
          essay: savedEssay,
          type: 'essay_based',
          isFollowUp: true
        }
      });

      if (error) throw error;

      setFollowUpChain(prev => [...prev, {
        question: parentQuestion,
        answer: followUpAnswer,
        feedback: data.feedback,
        score: data.score
      }]);

      toast.success('피드백을 받았습니다!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('피드백을 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
              <div className="space-y-6">
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
                        placeholder="여기에 답변을 입력하거나 음성으로 녹음하세요..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={8}
                        className="resize-none"
                      />

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
                        {score !== null && (
                          <div className="text-2xl font-bold text-accent">
                            {score}점 / 100점
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{feedback}</p>
                      </div>
                    </CardContent>
                  </Card>
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
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default EssayInterview;
