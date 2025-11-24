import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, FileText, MessageSquare, Save, Trash2, Video, Palette, Trophy, TrendingUp } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import ModelSelector from "@/components/ModelSelector";
import ProfileCustomization from "@/components/ProfileCustomization";

interface Profile {
  full_name: string;
  email: string;
  ai_model: string;
  essay_question_count: number;
  mileage?: number;
  enable_camera?: boolean;
}

interface Essay {
  id: string;
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  session_type: string;
  question: string;
  answer: string;
  score: number | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile>({ 
    full_name: "", 
    email: "",
    ai_model: "google/gemini-2.5-flash",
    essay_question_count: 10,
    mileage: 0,
    enable_camera: false
  });
  const [essays, setEssays] = useState<Essay[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setUser(user);
    await Promise.all([loadProfile(user.id), loadEssays(), loadSessions(), loadLeaderboardRank(user.id)]);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, ai_model, essay_question_count, mileage, enable_camera")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    setProfile({
      full_name: data.full_name || "",
      email: data.email || "",
      ai_model: data.ai_model || "google/gemini-2.5-flash",
      essay_question_count: data.essay_question_count || 10,
      mileage: data.mileage || 0,
      enable_camera: data.enable_camera || false
    });
  };

  const loadEssays = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("essays")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading essays:", error);
      return;
    }

    setEssays(data || []);
  };

  const loadSessions = async () => {
    setStatsLoading(true);
    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }

    setSessions(data || []);
    setStatsLoading(false);
  };

  const loadLeaderboardRank = async (userId: string) => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Get all leaderboard data for current month
      const { data, error } = await supabase
        .from('monthly_leaderboard')
        .select('user_id, total_mileage')
        .eq('month', month)
        .order('total_mileage', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setTotalUsers(data.length);
        const userRank = data.findIndex(entry => entry.user_id === userId);
        if (userRank !== -1) {
          setLeaderboardRank(userRank + 1);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard rank:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          full_name: profile.full_name,
          ai_model: profile.ai_model,
          essay_question_count: profile.essay_question_count,
          enable_camera: profile.enable_camera
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("프로필이 업데이트되었습니다.");
    } catch (error: any) {
      toast.error("업데이트에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEssay = async (essayId: string) => {
    if (!confirm("자기소개서를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("essays")
        .delete()
        .eq("id", essayId);

      if (error) throw error;
      toast.success("자기소개서가 삭제되었습니다.");
      loadEssays();
    } catch (error: any) {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const getSessionTypeName = (type: string) => {
    return type === "common" ? "공통 면접" : "자소서 기반";
  };

  const avgScore = sessions.filter(s => s.score !== null).length > 0
    ? Math.round(sessions.filter(s => s.score !== null).reduce((acc, s) => acc + (s.score || 0), 0) / sessions.filter(s => s.score !== null).length)
    : 0;

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

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">내 정보</h1>
          <p className="text-muted-foreground">프로필 관리 및 학습 기록 확인</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              프로필
            </TabsTrigger>
            <TabsTrigger value="customization">
              <Palette className="h-4 w-4 mr-2" />
              꾸미기
            </TabsTrigger>
            <TabsTrigger value="essays">
              <FileText className="h-4 w-4 mr-2" />
              자기소개서
            </TabsTrigger>
            <TabsTrigger value="history">
              <MessageSquare className="h-4 w-4 mr-2" />
              연습 기록
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>기본 정보</CardTitle>
                  <CardDescription>회원 정보를 수정할 수 있습니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>이름</Label>
                    <Input
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>이메일</Label>
                    <Input value={profile.email} disabled />
                  </div>
                  <ModelSelector 
                    value={profile.ai_model} 
                    onChange={(value) => setProfile({ ...profile, ai_model: value })}
                  />
                  <div className="space-y-2">
                    <Label>자소서 면접 질문 개수</Label>
                    <select
                      value={profile.essay_question_count === 5 || profile.essay_question_count === 10 || profile.essay_question_count === 15 || profile.essay_question_count === 20 ? profile.essay_question_count : 'custom'}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          const customValue = prompt('질문 개수를 입력하세요 (1-50)', String(profile.essay_question_count));
                          if (customValue) {
                            const num = parseInt(customValue);
                            if (num >= 1 && num <= 50) {
                              setProfile({ ...profile, essay_question_count: num });
                            } else {
                              toast.error('1-50 사이의 숫자를 입력해주세요.');
                            }
                          }
                        } else {
                          setProfile({ ...profile, essay_question_count: parseInt(value) });
                        }
                      }}
                      className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="5">5개</option>
                      <option value="10">10개 (기본)</option>
                      <option value="15">15개</option>
                      <option value="20">20개</option>
                      <option value="custom">기타 ({profile.essay_question_count !== 5 && profile.essay_question_count !== 10 && profile.essay_question_count !== 15 && profile.essay_question_count !== 20 ? `${profile.essay_question_count}개` : '직접 입력'})</option>
                    </select>
                    <p className="text-xs text-muted-foreground">자소서 기반 면접에서 생성될 질문의 개수를 선택하세요</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          카메라 영상
                        </Label>
                        <p className="text-xs text-muted-foreground">면접 연습 중 카메라 미리보기 표시</p>
                      </div>
                      <Switch
                        checked={profile.enable_camera}
                        onCheckedChange={(checked) => setProfile({ ...profile, enable_camera: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "저장 중..." : "저장하기"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>학습 통계</CardTitle>
                  <CardDescription>면접 연습 현황</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <p className="text-center text-muted-foreground">로딩 중...</p>
                  ) : (
                    <div className="space-y-4">
                      {leaderboardRank !== null && (
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg border border-yellow-500/20">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-600" />
                            <span className="text-sm font-medium">리더보드 순위</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-yellow-600">
                              {leaderboardRank}위
                            </div>
                            <div className="text-xs text-muted-foreground">
                              / {totalUsers}명 중
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">총 마일리지</span>
                        <span className="text-2xl font-bold text-primary">{profile.mileage?.toLocaleString() || 0}P</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">총 연습 횟수</span>
                        <span className="text-2xl font-bold text-accent">{sessions.length}회</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">평균 점수</span>
                        <span className="text-2xl font-bold text-secondary">
                          {avgScore > 0 ? `${avgScore}점` : "-"}
                        </span>
                      </div>
                      {leaderboardRank !== null && (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => navigate("/leaderboard")}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          전체 순위 보기
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customization" className="space-y-6">
            <ProfileCustomization />
          </TabsContent>

          <TabsContent value="essays" className="space-y-4">
            {essays.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">저장된 자기소개서가 없습니다.</p>
                  <Button 
                    onClick={() => navigate("/essay-interview")}
                    className="mt-4"
                  >
                    자기소개서 작성하기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              essays.map((essay) => (
                <Card key={essay.id} className="shadow-soft">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">자기소개서</CardTitle>
                        <CardDescription>
                          {new Date(essay.created_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEssay(essay.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={essay.content}
                      disabled
                      rows={6}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {sessions.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">면접 연습 기록이 없습니다.</p>
                  <Button 
                    onClick={() => navigate("/common-interview")}
                    className="mt-4"
                  >
                    면접 연습 시작하기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sessions.map((session) => (
                <Card key={session.id} className="shadow-soft">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                            {getSessionTypeName(session.session_type)}
                          </span>
                          {session.score !== null && (
                            <span className="px-2 py-1 text-xs rounded-full bg-accent/10 text-accent font-bold">
                              {session.score}점
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-base font-medium mb-1">
                          {session.question}
                        </CardTitle>
                        <CardDescription>
                          {new Date(session.created_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">내 답변</Label>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {session.answer || "답변 없음"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
