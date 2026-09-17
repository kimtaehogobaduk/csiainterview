import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, School, Brain, Sparkles, ArrowRight, Search } from "lucide-react";
import { SCHOOLS, SCHOOL_INFO } from "@/constants/schools";

const AI_MODELS = [
  { value: 'google/gemini-3.8-flash', label: 'Gemini 2.5 Flash (권장)', description: '빠르고 정확한 응답' },
  { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 2.5 Pro', description: '더 깊은 분석과 피드백' },
  { value: 'openai/gpt-5.4-mini', label: 'GPT-5 Mini', description: '균형 잡힌 성능' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Settings
  const [desiredSchool, setDesiredSchool] = useState("cheongshim");
  const [customSchoolName, setCustomSchoolName] = useState("");
  const [showCustomSchoolInput, setShowCustomSchoolInput] = useState(false);
  const [researchingSchool, setResearchingSchool] = useState(false);
  const [aiModel, setAiModel] = useState("google/gemini-3.8-flash");
  const [questionCount, setQuestionCount] = useState(10);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if onboarding is already completed
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.onboarding_completed) {
      navigate('/');
      return;
    }

    if (profile?.full_name) {
      setFullName(profile.full_name);
    }

    setCheckingAuth(false);
  };

  const handleSchoolChange = (value: string) => {
    if (value === 'other') {
      setShowCustomSchoolInput(true);
      setDesiredSchool('other');
    } else {
      setShowCustomSchoolInput(false);
      setDesiredSchool(value);
      setCustomSchoolName("");
    }
  };

  const handleResearchSchool = async () => {
    if (!customSchoolName.trim()) {
      toast.error('학교 이름을 입력해주세요.');
      return;
    }

    setResearchingSchool(true);
    try {
      const { data, error } = await supabase.functions.invoke('research-school', {
        body: { schoolName: customSchoolName }
      });

      if (error) throw error;

      if (data?.schoolInfo) {
        setDesiredSchool(`custom:${data.schoolInfo.name}`);
        toast.success(`${data.schoolInfo.name} 정보를 불러왔습니다!`);
      }
    } catch (error) {
      console.error('Failed to research school:', error);
      toast.error('학교 정보를 가져오는데 실패했습니다.');
    } finally {
      setResearchingSchool(false);
    }
  };

  const handleComplete = async () => {
    if (!fullName.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          desired_school: desiredSchool,
          ai_model: aiModel,
          essay_question_count: questionCount,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('설정이 완료되었습니다! 환영합니다!');
      navigate('/');
    } catch (error: any) {
      toast.error('설정 저장에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              {step === 1 && <School className="h-8 w-8 text-primary" />}
              {step === 2 && <Brain className="h-8 w-8 text-primary" />}
              {step === 3 && <Sparkles className="h-8 w-8 text-primary" />}
            </div>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 && "환영합니다! 👋"}
            {step === 2 && "희망 학교 선택"}
            {step === 3 && "AI 설정"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "면접 준비를 시작하기 전에 기본 정보를 설정해주세요."}
            {step === 2 && "지원하려는 학교를 선택하면 맞춤형 면접 질문을 받을 수 있습니다."}
            {step === 3 && "AI 모델과 질문 개수를 설정해주세요."}
          </CardDescription>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">이름 (실명)</Label>
                <Input
                  id="fullName"
                  placeholder="홍길동"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  커뮤니티에서 닉네임으로 사용됩니다.
                </p>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full"
                disabled={!fullName.trim()}
              >
                다음
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>희망 학교</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SCHOOLS.map((school) => (
                    <Button
                      key={school.value}
                      variant={desiredSchool === school.value || (school.value === 'other' && showCustomSchoolInput) ? "default" : "outline"}
                      className="h-auto py-3 px-3 text-sm justify-start"
                      onClick={() => handleSchoolChange(school.value)}
                    >
                      {school.label}
                    </Button>
                  ))}
                </div>
              </div>

              {showCustomSchoolInput && (
                <div className="space-y-2">
                  <Label>학교 이름 입력</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="예: 용인외국어고등학교"
                      value={customSchoolName}
                      onChange={(e) => setCustomSchoolName(e.target.value)}
                    />
                    <Button
                      onClick={handleResearchSchool}
                      disabled={researchingSchool || !customSchoolName.trim()}
                    >
                      {researchingSchool ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {desiredSchool.startsWith('custom:') && (
                    <p className="text-sm text-green-600">
                      ✓ {desiredSchool.replace('custom:', '')} 정보를 불러왔습니다.
                    </p>
                  )}
                </div>
              )}

              {desiredSchool && !showCustomSchoolInput && SCHOOL_INFO[desiredSchool] && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-1">{SCHOOL_INFO[desiredSchool].name}</p>
                  <p className="text-muted-foreground text-xs">
                    {SCHOOL_INFO[desiredSchool].characteristics}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  이전
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1"
                  disabled={!desiredSchool || (showCustomSchoolInput && !desiredSchool.startsWith('custom:'))}
                >
                  다음
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>AI 모델</Label>
                <div className="space-y-2">
                  {AI_MODELS.map((model) => (
                    <Button
                      key={model.value}
                      variant={aiModel === model.value ? "default" : "outline"}
                      className="w-full h-auto py-3 px-4 justify-start"
                      onClick={() => setAiModel(model.value)}
                    >
                      <div className="text-left">
                        <p className="font-medium">{model.label}</p>
                        <p className="text-xs opacity-70">{model.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>자소서 면접 질문 개수: {questionCount}개</Label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  자소서 기반 면접에서 생성될 질문 개수입니다.
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  이전
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  시작하기
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
