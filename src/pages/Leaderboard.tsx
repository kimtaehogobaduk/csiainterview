import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Medal, Award, Crown } from "lucide-react";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  total_mileage: number;
  rank: number;
  full_name: string;
  email: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setCurrentMonth(month);

      const { data, error } = await supabase
        .from('monthly_leaderboard')
        .select(`
          user_id,
          total_mileage,
          profiles!inner(full_name, email)
        `)
        .eq('month', month)
        .order('total_mileage', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedData = data.map((entry, index) => ({
        user_id: entry.user_id,
        total_mileage: entry.total_mileage,
        rank: index + 1,
        full_name: (entry.profiles as any).full_name || '익명',
        email: (entry.profiles as any).email || ''
      }));

      setLeaderboard(formattedData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast.error('리더보드를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500" />;
      case 2:
        return <Medal className="h-7 w-7 text-gray-400" />;
      case 3:
        return <Award className="h-7 w-7 text-amber-600" />;
      default:
        return <Trophy className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-amber-500 to-amber-700 text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getMonthText = () => {
    if (!currentMonth) return "";
    const [year, month] = currentMonth.split('-');
    return `${year}년 ${month}월`;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>

        <div className="mb-8 text-center space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Trophy className="h-4 w-4" />
            월간 리더보드
          </div>
          <h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {getMonthText()} 순위
          </h1>
          <p className="text-xl text-muted-foreground">
            최고의 학습자들을 만나보세요
          </p>
        </div>

        {loading ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">로딩 중...</p>
            </CardContent>
          </Card>
        ) : leaderboard.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">아직 순위 데이터가 없습니다.</p>
              <Button 
                onClick={() => navigate("/common-interview")}
                className="mt-4"
              >
                면접 연습하러 가기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <Card 
                key={entry.user_id} 
                className={`shadow-soft hover:shadow-strong transition-all duration-300 border-2 animate-fade-in-up ${
                  entry.rank === 1 ? 'border-yellow-500/50' :
                  entry.rank === 2 ? 'border-gray-400/50' :
                  entry.rank === 3 ? 'border-amber-600/50' :
                  'border-border/50'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-soft ${getRankBadgeColor(entry.rank)}`}>
                        {getRankIcon(entry.rank)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${getRankBadgeColor(entry.rank)}`}>
                          {entry.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold truncate">
                            {entry.full_name || entry.email}
                          </h3>
                          {entry.full_name && (
                            <p className="text-sm text-muted-foreground truncate">
                              {entry.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        {entry.total_mileage.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">마일리지</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Leaderboard;
