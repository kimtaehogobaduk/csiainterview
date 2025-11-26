import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mic, Send, FileText, CheckCircle, RefreshCw, Square, Bookmark } from "lucide-react";
import Footer from "@/components/Footer";
import FormattedFeedback from "@/components/FormattedFeedback";
import AudioAnalysisChart from "@/components/AudioAnalysisChart";
import VideoPreview, { VideoPreviewHandle } from "@/components/VideoPreview";
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

const EssayInterview = () => {
  const navigate = useNavigate();
  const videoRef = useRef<VideoPreviewHandle>(null);
  const [essay, setEssay] = useState("");
  const [savedEssay, setSavedEssay] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
  const [tab, setTab] = useState("essay");
  const [followUpChain, setFollowUpChain] = useState<Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number | null;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [questionCount, setQuestionCount] = useState(10);
  
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
    loadUserSettings();
    loadSavedEssay();
  }, []);

  useEffect(() => {
    if (essay && savedEssay) {
      const timeoutId = setTimeout(() => {
        if (essay !== savedEssay) {
          handleSaveEssay();
        }
      }, 10000);

      return () => clearTimeout(timeoutId);
    }
  }, [essay, savedEssay]);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('essays')
        .select('content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        setEssay(data.content);
        setSavedEssay(data.content);
      }
    }
  };

  const handleSaveEssay = async () => {
    if (!essay.trim()) {
      toast.error('자기소개서를 작성해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const { error: saveError } = await supabase
        .from('essays')
        .insert({
          user_id: user.id,
          content: essay
        });

      if (saveError) {
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

      // Stop recording and get video if camera is enabled
      let videoBlob: Blob | null = null;
      let videoFrame: string | null = null;
      if (enableCamera && videoRef.current) {
        videoBlob = await videoRef.current.stopRecording();
        videoFrame = await videoRef.current.captureFrame();
      }

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
            answer: transcript,
            essay: savedEssay,
            type: 'essay_based_audio',
            model: selectedModel,
            audioMetrics: {
              wordsPerMinute,
              wordCount,
              duration: Math.round(duration)
            },
            videoFrame
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

      // Final score extraction if not found during streaming
      if (!extractedScore) {
        const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
        if (scoreMatch) {
          extractedScore = parseInt(scoreMatch[1]);
          setScore(extractedScore);
        }
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user && accumulatedText) {
        let videoUrl: string | null = null;

        // Upload video if available
        if (videoBlob && user) {
          const timestamp = Date.now();
          const fileName = `${user.id}/${timestamp}.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from('interview-videos')
            .upload(fileName, videoBlob, {
              contentType: 'video/webm'
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('interview-videos')
              .getPublicUrl(fileName);
            videoUrl = urlData.publicUrl;
          }
        }

        const { data: sessionData, error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'essay_based',
            question: questions[currentQuestionIndex],
            answer: transcript,
            ai_feedback: accumulatedText,
            score: extractedScore,
            video_url: videoUrl
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
      } else if (!user) {
        toast.success('피드백을 받았습니다! (로그인하면 기록이 저장되고 마일리지를 받을 수 있습니다)');
      }
    } catch (error: any) {
      console.error('Voice analysis error:', error);
      toast.error('음성 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
                
                setFollowUpChain(prev => prev.map((item, idx) => 
                  idx === tempIndex 
                    ? { ...item, feedback: accumulatedText }
                    : item
                ));
                
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

      // Final score extraction if not found during streaming
      if (!extractedScore) {
        const scoreMatch = accumulatedText.match(/총점\s*(\d+)점/);
        if (scoreMatch) {
          extractedScore = parseInt(scoreMatch[1]);
          setFollowUpChain(prev => prev.map((item, idx) => 
            idx === tempIndex 
              ? { ...item, score: extractedScore }
              : item
          ));
        }
      }

      // Save session and award mileage
      const { data: { user } } = await supabase.auth.getUser();
      if (user && accumulatedText) {
        const { data: sessionData, error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'essay_based',
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
            p_reason: '자소서 기반 면접 추가 질문 완료',
            p_session_id: sessionData.id
          });
          toast.success(`피드백을 받았습니다! +${mileageAmount} 마일리지`);
        } else {
          toast.success('피드백을 받았습니다!');
        }
      } else if (!user) {
        toast.success('피드백을 받았습니다! (로그인하면 기록이 저장되고 마일리지를 받을 수 있습니다)');
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
      setAudioScores(null);
      resetTranscript();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setAnswer("");
      setFeedback("");
      setScore(null);
      setFollowUpChain([]);
      setAudioScores(null);
      resetTranscript();
    }
  };

  const handleRefreshQuestions = async () => {
    if (!savedEssay.trim()) {
      toast.error('자기소개서를 먼저 저장해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('expand-questions', {
        body: { essay: savedEssay, currentQuestions: questions }
      });

      if (error) throw error;

      setQuestions(data.questions || []);
      toast.success('새로운 질문이 생성되었습니다!');
    } catch (error: any) {
      toast.error('질문 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_questions')
        .insert({
          user_id: user.id,
          question: questions[currentQuestionIndex],
          source: 'essay_based',
          essay: savedEssay
        });

      if (error) throw error;
      toast.success('질문이 저장되었습니다!');
    } catch (error: any) {
      toast.error('질문 저장에 실패했습니다.');
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
      // Stop recording and get video if camera is enabled
      let videoBlob: Blob | null = null;
      let videoFrame: string | null = null;
      if (enableCamera && videoRef.current) {
        if (videoRef.current.isRecording) {
          videoBlob = await videoRef.current.stopRecording();
        }
        videoFrame = await videoRef.current.captureFrame();
      }

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
            model: selectedModel,
            videoFrame
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
                
                const scoreMatch = accumulatedText.match(/총점\s*:?\s*(\d+)\s*점/i);
                if (scoreMatch && !extractedScore) {
                  extractedScore = parseInt(scoreMatch[1]);
                  setScore(extractedScore);
                  console.log('Score extracted:', extractedScore);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Final score extraction if not found during streaming
      if (!extractedScore) {
        const scoreMatch = accumulatedText.match(/총점\s*:?\s*(\d+)\s*점/i);
        if (scoreMatch) {
          extractedScore = parseInt(scoreMatch[1]);
          setScore(extractedScore);
          console.log('Score extracted (final):', extractedScore);
        } else {
          console.warn('Score not found in feedback:', accumulatedText.substring(0, 100));
        }
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user && accumulatedText) {
        let videoUrl: string | null = null;

        // Upload video if available
        if (videoBlob && user) {
          const timestamp = Date.now();
          const fileName = `${user.id}/${timestamp}.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from('interview-videos')
            .upload(fileName, videoBlob, {
              contentType: 'video/webm'
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('interview-videos')
              .getPublicUrl(fileName);
            videoUrl = urlData.publicUrl;
          }
        }

        const { data: sessionData, error: saveError } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: user.id,
            session_type: 'essay_based',
            question: questions[currentQuestionIndex],
            answer,
            ai_feedback: accumulatedText,
            score: extractedScore,
            video_url: videoUrl
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
      } else if (!user) {
        toast.success('피드백을 받았습니다! (로그인하면 기록이 저장되고 마일리지를 받을 수 있습니다)');
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

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="essay">
              <FileText className="h-4 w-4 mr-2" />
              자기소개서 작성
            </TabsTrigger>
            <TabsTrigger value="interview" disabled={questions.length === 0}>
              <Mic className="h-4 w-4 mr-2" />
              면접 연습
            </TabsTrigger>
          </TabsList>

          <TabsContent value="essay">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>자기소개서</span>
                  {savedEssay && essay === savedEssay && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      저장됨
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="자기소개서를 작성하세요..."
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  rows={15}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEssay}
                    disabled={loading || !essay.trim() || essay === savedEssay}
                    className="flex-1"
                  >
                    저장
                  </Button>
                  <Button
                    onClick={handleGenerateQuestions}
                    disabled={loading || !savedEssay.trim() || essay !== savedEssay}
                    variant="default"
                    className="flex-1"
                  >
                    {loading ? "생성 중..." : `면접 질문 ${questionCount}개 생성`}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  * 자기소개서는 10초마다 자동으로 저장됩니다.
                </p>
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
                          onClick={handleRefreshQuestions}
                          disabled={loading}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          새 질문
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-6 bg-muted rounded-lg mb-6">
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-lg font-medium flex-1">{questions[currentQuestionIndex]}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveQuestion}
                            className="shrink-0"
                          >
                            <Bookmark className="h-4 w-4 mr-2" />
                            저장
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (enableCamera && videoRef.current && !videoRef.current.isRecording) {
                            videoRef.current.startRecording();
                          }
                          if (!isListening) startListening();
                          else stopListening();
                        }}
                        variant={isListening ? "destructive" : "default"}
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
                          onClick={handleSubmitAnswer}
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
                  <VideoPreview ref={videoRef} />
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
