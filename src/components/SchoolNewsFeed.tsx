import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, GraduationCap, ExternalLink, RefreshCw, Info, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  category: string;
  searchQuery: string;
  sourceHint: string;
}

interface AdmissionInfo {
  schedule: string;
  method: string;
  tips: string[];
}

interface SchoolNewsData {
  news: NewsItem[];
  admissionInfo: AdmissionInfo;
  summary: string[];
}

const SCHOOL_NAMES: Record<string, string> = {
  cheongshim: '청심국제고등학교',
  hana: '하나고등학교',
  sangsan: '상산고등학교',
  minsa: '민족사관고등학교',
  daewon: '대원외국어고등학교',
  daeil: '대일외국어고등학교',
  myungduk: '명덕외국어고등학교',
  hansung: '한성과학고등학교',
  sejong: '세종과학고등학교',
};

const CATEGORY_COLORS: Record<string, string> = {
  '입시': 'bg-primary/10 text-primary border-primary/20',
  '학교소식': 'bg-accent/10 text-accent-foreground border-accent/20',
  '교육정책': 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  '행사': 'bg-muted text-muted-foreground border-muted',
};

export default function SchoolNewsFeed({ desiredSchool }: { desiredSchool: string }) {
  const [data, setData] = useState<SchoolNewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const schoolName = desiredSchool.startsWith('custom:')
    ? desiredSchool.replace('custom:', '')
    : SCHOOL_NAMES[desiredSchool] || desiredSchool;

  const fetchNews = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('school-news', {
        body: { schoolName },
      });
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error('School news error:', err);
      toast.error('학교 소식을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetchNews();
  }, [desiredSchool]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const openNaverSearch = (query: string) => {
    window.open(`https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`, '_blank');
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <>
      <Card className="mb-6 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{schoolName} 소식</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary chips */}
          {data.summary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.summary.map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal py-1">
                  <Info className="h-3 w-3 mr-1" />
                  {s}
                </Badge>
              ))}
            </div>
          )}

          {/* News list */}
          <div className="space-y-2">
            {data.news.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedNews(item)}
                className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[item.category] || ''}`}>
                        {item.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.summary}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>

          {/* Admission info */}
          {data.admissionInfo && (
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <GraduationCap className="h-4 w-4 text-primary" />
                입시 정보
              </div>
              <p className="text-xs text-muted-foreground">{data.admissionInfo.schedule}</p>
              <p className="text-xs text-muted-foreground">{data.admissionInfo.method}</p>
              {data.admissionInfo.tips.length > 0 && (
                <div className="space-y-1 mt-2">
                  {data.admissionInfo.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Lightbulb className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* News detail dialog */}
      <Dialog open={!!selectedNews} onOpenChange={(open) => !open && setSelectedNews(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug pr-6">{selectedNews?.title}</DialogTitle>
          </DialogHeader>
          {selectedNews && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[selectedNews.category] || ''}`}>
                  {selectedNews.category}
                </Badge>
                <span className="text-sm text-muted-foreground">{selectedNews.date}</span>
                <span className="text-xs text-muted-foreground">· {selectedNews.sourceHint}</span>
              </div>
              <p className="text-sm leading-relaxed">{selectedNews.summary}</p>
              <Button
                className="w-full"
                onClick={() => openNaverSearch(selectedNews.searchQuery)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                네이버 뉴스에서 원본 보기
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                "{selectedNews.searchQuery}" 검색어로 네이버 뉴스에서 관련 기사를 확인할 수 있습니다.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
