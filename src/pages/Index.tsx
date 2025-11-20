import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, FileText, LogOut, User, Shield } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import logoImage from "@/assets/logo.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        await checkAdmin(session.user.id);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(session?.user || null);
      if (session?.user) {
        // Defer admin check to avoid blocking auth state change
        setTimeout(() => {
          checkAdmin(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      
      if (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
        return;
      }
      
      const isAdminUser = !!data;
      console.log('Admin check result:', { userId, isAdmin: isAdminUser, data });
      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error('Admin check exception:', error);
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.1),transparent_50%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.1),transparent_50%)]" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="text-center mb-16 animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="h-28 w-28 rounded-2xl overflow-hidden shadow-intense ring-4 ring-primary/20 animate-glow">
                <img src={logoImage} alt="합격의 길" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className="text-6xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent animate-scale-in">
              합격의 길
            </h1>
            <p className="text-2xl text-foreground/80 mb-2 font-medium">
              청심국제고등학교 입시 면접 준비 플랫폼
            </p>
            <p className="text-lg text-muted-foreground">
              AI 기반 면접 연습으로 완벽한 합격을 준비하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            <Card className="group hover:-translate-y-2 transition-all duration-300 animate-fade-in">
              <CardHeader>
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">공통 면접 질문</CardTitle>
                <CardDescription className="text-base">
                  150개의 공통 면접 질문으로 실전 연습
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    음성인식 답변 입력
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    AI 실시간 피드백
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    추가 질문 자동 생성
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    태도 및 발음 분석
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:-translate-y-2 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <div className="p-3 rounded-xl bg-accent/10 w-fit mb-4 group-hover:bg-accent/20 transition-colors">
                  <FileText className="h-12 w-12 text-accent" />
                </div>
                <CardTitle className="text-2xl">자소서 기반 면접</CardTitle>
                <CardDescription className="text-base">
                  자기소개서를 분석하여 맞춤 질문 생성
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    자소서 맞춤법 검사
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    AI 자동 질문 생성
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    100점 만점 평가
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    자소서 자동 저장
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-10 py-7 h-auto text-base font-semibold"
            >
              시작하기
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.1),transparent_50%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.1),transparent_50%)]" />
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg overflow-hidden shadow-soft ring-2 ring-primary/20">
              <img src={logoImage} alt="합격의 길" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              합격의 길
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/profile")} className="hover:bg-primary/5">
              <User className="h-5 w-5 mr-2" />
              내 정보
            </Button>
            {isAdmin && (
              <Button variant="ghost" onClick={() => navigate("/admin")} className="hover:bg-accent/5">
                <Shield className="h-5 w-5 mr-2" />
                관리자
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout} className="hover:bg-destructive/5">
              <LogOut className="h-5 w-5 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 relative">
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-hero bg-clip-text text-transparent">환영합니다!</h2>
          <p className="text-lg text-muted-foreground">원하는 면접 연습 방식을 선택하세요</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card 
            className="group hover:-translate-y-2 cursor-pointer animate-fade-in"
            onClick={() => navigate("/common-interview")}
          >
            <CardHeader>
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-xl">공통 면접 질문</CardTitle>
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
            className="group hover:-translate-y-2 cursor-pointer animate-fade-in"
            onClick={() => navigate("/essay-interview")}
            style={{ animationDelay: '0.1s' }}
          >
            <CardHeader>
              <div className="p-3 rounded-xl bg-accent/10 w-fit mb-4 group-hover:bg-accent/20 transition-colors">
                <FileText className="h-12 w-12 text-accent group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-xl">자소서 기반 면접</CardTitle>
              <CardDescription>
                자기소개서 분석 맞춤 질문
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                자소서를 입력하면 AI가 맞춤 질문을 생성합니다
              </p>
              <Button variant="accent" className="w-full">시작하기</Button>
            </CardContent>
          </Card>

          <Card 
            className="group hover:-translate-y-2 cursor-pointer animate-fade-in"
            onClick={() => navigate("/community")}
            style={{ animationDelay: '0.2s' }}
          >
            <CardHeader>
              <div className="p-3 rounded-xl bg-secondary/10 w-fit mb-4 group-hover:bg-secondary/20 transition-colors">
                <MessageSquare className="h-12 w-12 text-secondary group-hover:scale-110 transition-transform" />
              </div>
              <CardTitle className="text-xl">커뮤니티</CardTitle>
              <CardDescription>
                입시 정보 공유 및 소통
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                청심국제고등학교 입시에 대해 자유롭게 이야기 나누세요
              </p>
              <Button variant="secondary" className="w-full">참여하기</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
