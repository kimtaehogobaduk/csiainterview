import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, MessageSquare, FileText, LogOut, User, Shield } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkAdmin(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkAdmin(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    
    setIsAdmin(data?.is_admin || false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-strong">
                <GraduationCap className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              합격의 길
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              청심국제고등학교 입시 면접 준비 플랫폼
            </p>
            <p className="text-muted-foreground">
              AI 기반 면접 연습으로 완벽한 합격을 준비하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <Card className="shadow-soft hover:shadow-strong transition-shadow">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-primary mb-4" />
                <CardTitle>공통 면접 질문</CardTitle>
                <CardDescription>
                  150개의 공통 면접 질문으로 실전 연습
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 음성인식 답변 입력</li>
                  <li>• AI 실시간 피드백</li>
                  <li>• 추가 질문 자동 생성</li>
                  <li>• 태도 및 발음 분석</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-soft hover:shadow-strong transition-shadow">
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mb-4" />
                <CardTitle>자소서 기반 면접</CardTitle>
                <CardDescription>
                  자기소개서를 분석하여 맞춤 질문 생성
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 자소서 맞춤법 검사</li>
                  <li>• AI 자동 질문 생성</li>
                  <li>• 100점 만점 평가</li>
                  <li>• 자소서 자동 저장</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="shadow-soft hover:shadow-strong transition-shadow text-lg px-8 py-6"
            >
              시작하기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              합격의 길
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/profile")}>
              <User className="h-5 w-5 mr-2" />
              내 정보
            </Button>
            {isAdmin && (
              <Button variant="ghost" onClick={() => navigate("/admin")}>
                <Shield className="h-5 w-5 mr-2" />
                관리자
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-5 w-5 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold mb-2">환영합니다!</h2>
          <p className="text-muted-foreground">원하는 면접 연습 방식을 선택하세요</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card 
            className="shadow-soft hover:shadow-strong transition-all cursor-pointer group"
            onClick={() => navigate("/common-interview")}
          >
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>공통 면접 질문</CardTitle>
              <CardDescription>
                150개의 면접 질문으로 실전 대비
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                랜덤으로 제공되는 질문에 답변하고 AI 피드백을 받아보세요
              </p>
              <Button className="w-full">시작하기</Button>
            </CardContent>
          </Card>

          <Card 
            className="shadow-soft hover:shadow-strong transition-all cursor-pointer group"
            onClick={() => navigate("/essay-interview")}
          >
            <CardHeader>
              <FileText className="h-12 w-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>자소서 기반 면접</CardTitle>
              <CardDescription>
                자기소개서 분석 맞춤 질문
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                자소서를 입력하면 AI가 맞춤 질문을 생성합니다
              </p>
              <Button className="w-full">시작하기</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
