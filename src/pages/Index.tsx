import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, FileText, LogOut, User, Shield, Users, ArrowRight, Sparkles, Target, TrendingUp, Trophy, ShoppingBag } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import logoImage from "@/assets/logo.jpg";
import { toast } from "sonner";
const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const initAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        await checkAdmin(session.user.id);
      }
    };
    initAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
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
      // Check if localStorage is accessible
      try {
        localStorage.getItem('test');
      } catch (e) {
        console.error('localStorage not accessible:', e);
        toast.error("브라우저의 저장소 접근이 차단되었습니다. 시크릿 모드가 아닌지 확인하거나 브라우저 설정에서 쿠키 및 사이트 데이터를 허용해주세요.");
        setIsAdmin(false);
        return;
      }
      const {
        data,
        error
      } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (error) {
        console.error('Admin check error:', error);
        setIsAdmin(false);
        return;
      }
      const isAdminUser = !!data;
      console.log('Admin check result:', {
        userId,
        isAdmin: isAdminUser,
        data
      });
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

  const handleProtectedAction = (action: () => void) => {
    if (!user) {
      toast.error('로그인이 필요한 기능입니다.');
      navigate("/auth");
      return;
    }
    action();
  };
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-float" style={{
        animationDelay: '1s'
      }} />
      </div>

      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div 
                className="h-12 w-12 rounded-2xl overflow-hidden shadow-soft ring-2 ring-primary/30 hover:ring-primary/50 transition-all cursor-pointer hover:scale-110"
                onClick={() => window.open('https://blog.naver.com/csiahabitmakers', '_blank')}
                title="제작자 블로그 방문하기"
              >
                <img src={logoImage} alt="합격의 길" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  합격의 길
                </h1>
                <p className="text-xs text-muted-foreground">특목고 입시 준비 프로그렘​  </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => handleProtectedAction(() => navigate("/profile"))} className="hover:bg-primary/10 transition-all">
                <User className="h-5 w-5 mr-2" />
                내 정보
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleProtectedAction(() => navigate("/shop"))} className="hover:bg-primary/10 transition-all" title="상점">
                <ShoppingBag className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleProtectedAction(() => navigate("/leaderboard"))} className="hover:bg-primary/10 transition-all" title="리더보드">
                <Trophy className="h-5 w-5" />
              </Button>
              {isAdmin && <Button variant="ghost" onClick={() => navigate("/admin")} className="hover:bg-accent/10 transition-all">
                  <Shield className="h-5 w-5 mr-2" />
                  관리자
                </Button>}
              {user ? (
                <Button variant="ghost" onClick={handleLogout} className="hover:bg-destructive/10 text-destructive transition-all">
                  <LogOut className="h-5 w-5 mr-2" />
                  로그아웃
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} className="shadow-soft hover:shadow-strong transition-all">
                  로그인
                </Button>
              )}
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-primary/30 animate-fade-in-up" onClick={() => navigate("/common-interview")} style={{
            animationDelay: '0.1s'
          }}>
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

          <Card className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-accent/30 animate-fade-in-up" onClick={() => navigate("/essay-interview")} style={{
            animationDelay: '0.2s'
          }}>
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

          <Card className="group hover:-translate-y-4 cursor-pointer transition-all duration-500 hover:shadow-intense border-2 hover:border-secondary/30 animate-fade-in-up" onClick={() => handleProtectedAction(() => navigate("/community"))} style={{
            animationDelay: '0.3s'
          }}>
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
        </div>
        </div>
      </div>
      <Footer />
    </div>;
};
export default Index;