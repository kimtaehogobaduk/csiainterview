import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, GraduationCap, ExternalLink, RefreshCw, Info, Lightbulb, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface NewsItem {
  title: string;
  summary: string;
  detailedContent?: string;
  date: string;
  category: string;
  url: string;
  source: string;
  searchQuery?: string; // legacy fallback
  sourceHint?: string; // legacy fallback
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
  '성과': 'bg-primary/10 text-primary border-primary/20',
};

// In-memory cache for the session
const sessionCache: Record<string, { data: SchoolNewsData; timestamp: number }> = {};
const SESSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export default function SchoolNewsFeed({ desiredSchool }: { desiredSchool: string }) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<SchoolNewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const schoolName = desiredSchool.startsWith('custom:')
    ? desiredSchool.replace('custom:', '')
    : SCHOOL_NAMES[desiredSchool] || desiredSchool;

  const fetchNews = useCallback(async (forceRefresh = false) => {
    // Check session cache first
    const cacheKey = schoolName.toLowerCase().replace(/\s+/g, '');
    if (!forceRefresh && sessionCache[cacheKey]) {
      const cached = sessionCache[cacheKey];
      if (Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
        setData(cached.data);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('school-news', {
        body: { schoolName, forceRefresh },
      });
      if (error) throw error;
      setData(result);
      // Save to session cache
      sessionCache[cacheKey] = { data: result, timestamp: Date.now() };
    } catch (err) {
      console.error('School news error:', err);
      toast.error('학교 소식을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolName]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews(true);
  };

  const getNewsUrl = (item: NewsItem) => {
    if (item.url && item.url.startsWith('http')) return item.url;
    // Fallback: use searchQuery or title for Naver search
    const query = item.searchQuery || item.title;
    return `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`;
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-border/50 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
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
        <CardHeader className={isMobile ? "pb-2 px-4" : "pb-3"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              <CardTitle className={isMobile ? "text-base" : "text-lg"}>{schoolName} 소식</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8"
              title="새로고침"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 space-y-3" : "space-y-4"}>
          {/* Summary chips */}
          {data.summary.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.summary.map((s, i) => (
                <Badge key={i} variant="outline" className={`font-normal py-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                  <Info className="h-3 w-3 mr-1 shrink-0" />
                  <span className="line-clamp-1">{s}</span>
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
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[item.category] || ''}`}>
                        {item.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                      {(item.source || item.sourceHint) && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Building2 className="h-3 w-3" />
                          {item.source || item.sourceHint}
                        </span>
                      )}
                    </div>
                    <p className={`font-medium ${isMobile ? 'text-sm line-clamp-2' : 'text-sm'}`}>{item.title}</p>
                    <p className={`text-muted-foreground mt-0.5 ${isMobile ? 'text-xs line-clamp-2' : 'text-xs line-clamp-2'}`}>
                      {item.summary}
                    </p>
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
              <div className={`space-y-1 ${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                <p><strong className="text-foreground">일정:</strong> {data.admissionInfo.schedule}</p>
                <p><strong className="text-foreground">전형:</strong> {data.admissionInfo.method}</p>
              </div>
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
        <DialogContent className={isMobile ? "max-w-[95vw] max-h-[85vh]" : "max-w-lg max-h-[80vh]"}>
          <DialogHeader>
            <DialogTitle className="text-base leading-snug pr-6">{selectedNews?.title}</DialogTitle>
          </DialogHeader>
          {selectedNews && (
            <ScrollArea className={isMobile ? "max-h-[calc(85vh-120px)]" : "max-h-[calc(80vh-120px)]"}>
              <div className="space-y-4 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs ${CATEGORY_COLORS[selectedNews.category] || ''}`}>
                    {selectedNews.category}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {selectedNews.date}
                  </span>
                  {(selectedNews.source || selectedNews.sourceHint) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {selectedNews.source || selectedNews.sourceHint}
                    </span>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">요약</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{selectedNews.summary}</p>
                </div>

                {/* Detailed content */}
                {selectedNews.detailedContent && (
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-sm font-medium">상세 내용</h4>
                    <p className="text-sm leading-relaxed">{selectedNews.detailedContent}</p>
                  </div>
                )}

                {/* Original article link */}
                <div className="border-t pt-3">
                  <Button
                    className="w-full"
                    onClick={() => window.open(getNewsUrl(selectedNews), '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    원문 보기
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    원본 기사 페이지로 이동합니다
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
