import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, FileText, LogOut, User, Shield, Users, ArrowRight, Sparkles, Target, TrendingUp, Trophy, ShoppingBag } from "lucide-react";
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/3 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          {/* Hero Section */}
          <div className="max-w-5xl mx-auto text-center mb-24 space-y-8">
            <div className="flex justify-center mb-8 animate-fade-in-up">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-2xl opacity-20 animate-pulse" />
                <div className="relative h-32 w-32 rounded-3xl overflow-hidden shadow-intense ring-4 ring-primary/30 animate-float">
                  <img src={logoImage} alt="합격의 길" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI 기반 면접 준비 플랫폼
              </div>
              
              <h1 className="text-7xl md:text-8xl font-bold tracking-tight">
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  합격의 길
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-foreground font-semibold">
                청심국제고등학교 입시 면접 준비
              </p>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                실전과 동일한 AI 면접 시뮬레이션으로<br />
                완벽한 합격을 만들어가세요
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="text-lg px-12 py-8 h-auto font-bold shadow-strong hover:shadow-intense transition-all group"
              >
                무료로 시작하기
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
            <div className="group p-8 rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-strong animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-soft">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">실전 대비</h3>
              <p className="text-muted-foreground leading-relaxed">
                150개 이상의 실제 면접 질문으로 완벽한 실전 감각을 키워보세요
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-border/50 hover:border-accent/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-strong animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="h-14 w-14 rounded-2xl bg-gradient-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-soft">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">AI 피드백</h3>
              <p className="text-muted-foreground leading-relaxed">
                최신 AI 기술로 답변을 실시간 분석하고 개선 방향을 제시합니다
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-border/50 hover:border-secondary/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-strong animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <div className="h-14 w-14 rounded-2xl bg-gradient-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-soft">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">맞춤 학습</h3>
              <p className="text-muted-foreground leading-relaxed">
                자기소개서 기반으로 개인화된 질문과 피드백을 받아보세요
              </p>
            </div>
          </div>

          {/* Main Features */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="group hover:-translate-y-3 transition-all duration-500 hover:shadow-intense border-2 animate-slide-in-left" style={{ animationDelay: '0.8s' }}>
              <CardHeader className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-primary w-fit shadow-soft group-hover:shadow-strong transition-shadow">
                  <MessageSquare className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">공통 면접 질문</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  150개의 검증된 면접 질문으로 실전 연습
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">음성인식 답변 입력</p>
                      <p className="text-sm text-muted-foreground">실제 면접처럼 말로 답변하세요</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">AI 실시간 피드백</p>
                      <p className="text-sm text-muted-foreground">답변의 강점과 약점을 즉시 파악</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">추가 질문 자동 생성</p>
                      <p className="text-sm text-muted-foreground">심화 질문으로 완벽 대비</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="group hover:-translate-y-3 transition-all duration-500 hover:shadow-intense border-2 animate-slide-in-left" style={{ animationDelay: '0.9s' }}>
              <CardHeader className="space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-accent w-fit shadow-soft group-hover:shadow-strong transition-shadow">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">자소서 기반 면접</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  자기소개서를 분석하여 맞춤 질문 생성
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">자소서 맞춤법 검사</p>
                      <p className="text-sm text-muted-foreground">오류 없는 완벽한 자소서</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">AI 자동 질문 생성</p>
                      <p className="text-sm text-muted-foreground">당신의 자소서에 최적화된 질문</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">100점 만점 평가</p>
                      <p className="text-sm text-muted-foreground">객관적인 점수로 실력 확인</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-soft ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
                <img src={logoImage} alt="합격의 길" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  합격의 길
                </h1>
                <p className="text-xs text-muted-foreground">AI Interview Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/profile")} 
                className="hover:bg-primary/10 transition-all"
              >
                <User className="h-5 w-5 mr-2" />
                내 정보
              </Button>
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate("/admin")} 
                  className="hover:bg-accent/10 transition-all"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  관리자
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className="hover:bg-destructive/10 text-destructive transition-all"
              >
                <LogOut className="h-5 w-5 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-16 text-center space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              환영합니다!
            </div>
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              면접 준비 시작하기
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              원하는 학습 방식을 선택하고 합격을 향해 나아가세요
            </p>
          </div>

          {/* Main Cards */}
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          <Card 
            className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-primary/30 animate-fade-in-up"
            onClick={() => navigate("/common-interview")}
            style={{ animationDelay: '0.1s' }}
          >
            <CardHeader className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-primary w-fit shadow-soft group-hover:shadow-strong group-hover:scale-110 transition-all duration-500">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">공통 면접 질문</CardTitle>
              <CardDescription className="text-base">
                150개의 면접 질문으로 실전 대비
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                랜덤으로 제공되는 질문에 답변하고 실시간 AI 피드백을 받아보세요
              </p>
              <Button className="w-full group-hover:shadow-soft transition-all">
                시작하기
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-accent/30 animate-fade-in-up"
            onClick={() => navigate("/essay-interview")}
            style={{ animationDelay: '0.2s' }}
          >
            <CardHeader className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-accent w-fit shadow-soft group-hover:shadow-strong group-hover:scale-110 transition-all duration-500">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">자소서 기반 면접</CardTitle>
              <CardDescription className="text-base">
                자기소개서 분석 맞춤 질문
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                자소서를 입력하면 AI가 맞춤 질문을 생성하고 평가합니다
              </p>
              <Button className="w-full bg-gradient-accent hover:opacity-90 transition-all group-hover:shadow-soft">
                시작하기
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-secondary/30 animate-fade-in-up"
            onClick={() => navigate("/community")}
            style={{ animationDelay: '0.3s' }}
          >
            <CardHeader className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-secondary w-fit shadow-soft group-hover:shadow-strong group-hover:scale-110 transition-all duration-500">
                <Users className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">커뮤니티</CardTitle>
              <CardDescription className="text-base">
                입시 정보 공유 및 소통
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                청심국제고 입시에 대해 자유롭게 이야기를 나누세요
              </p>
              <Button className="w-full bg-gradient-secondary hover:opacity-90 transition-all group-hover:shadow-soft">
                참여하기
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-yellow-500/30 animate-fade-in-up"
            onClick={() => navigate("/leaderboard")}
            style={{ animationDelay: '0.4s' }}
          >
            <CardHeader className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-600 w-fit shadow-soft group-hover:shadow-strong group-hover:scale-110 transition-all duration-500">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">리더보드</CardTitle>
              <CardDescription className="text-base">
                월간 마일리지 순위
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                이번 달 최고의 학습자들을 확인해보세요
              </p>
              <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:opacity-90 transition-all group-hover:shadow-soft">
                순위 보기
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-purple-500/30 animate-fade-in-up"
            onClick={() => navigate("/shop")}
            style={{ animationDelay: '0.5s' }}
          >
            <CardHeader className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 w-fit shadow-soft group-hover:shadow-strong group-hover:scale-110 transition-all duration-500">
                <ShoppingBag className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">상점</CardTitle>
              <CardDescription className="text-base">
                프로필 꾸미기 아이템
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                마일리지로 프로필을 멋지게 꾸며보세요
              </p>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:opacity-90 transition-all group-hover:shadow-soft">
                둘러보기
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
