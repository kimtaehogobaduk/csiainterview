import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mic, MicOff, RefreshCw, Send } from "lucide-react";
import { getRandomQuestion } from "@/constants/questions";
import Footer from "@/components/Footer";
import FormattedFeedback from "@/components/FormattedFeedback";
import ModelSelector from "@/components/ModelSelector";

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
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [followUpChain, setFollowUpChain] = useState<Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number | null;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");

  useEffect(() => {
    setQuestion(getRandomQuestion());

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

  const handleNewQuestion = () => {
    setQuestion(getRandomQuestion());
    setAnswer("");
    setFeedback("");
    setScore(null);
    setFollowUpChain([]);
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
          type: 'common',
          isFollowUp: true,
          model: selectedModel
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

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('interview-feedback', {
        body: {
          question,
          answer,
          type: 'common',
          model: selectedModel
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
            session_type: 'common',
            question,
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

        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                면접 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </CardContent>
          </Card>

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
                  onClick={handleSubmit}
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
                <FormattedFeedback content={feedback} />
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
      </div>
      <Footer />
    </div>
  );
};

export default CommonInterview;
