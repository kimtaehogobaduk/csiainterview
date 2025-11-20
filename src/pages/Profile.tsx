import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, FileText, MessageSquare, Save, Trash2 } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Footer from "@/components/Footer";

interface Profile {
  full_name: string;
  email: string;
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
  const [profile, setProfile] = useState<Profile>({ full_name: "", email: "" });
  const [essays, setEssays] = useState<Essay[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

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
    await Promise.all([loadProfile(user.id), loadEssays(), loadSessions()]);
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    setProfile(data);
  };

  const loadEssays = async () => {
    const { data, error } = await supabase
      .from("essays")
      .select("*")
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

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: profile.full_name })
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              프로필
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
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">총 연습 횟수</span>
                        <span className="text-2xl font-bold text-primary">{sessions.length}회</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">평균 점수</span>
                        <span className="text-2xl font-bold text-accent">
                          {avgScore > 0 ? `${avgScore}점` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">저장된 자소서</span>
                        <span className="text-2xl font-bold text-secondary">{essays.length}개</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
