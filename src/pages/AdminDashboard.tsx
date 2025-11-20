import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, MessageSquare, FileText, BarChart } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
}

interface InterviewSession {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  score: number | null;
  session_type: string;
  created_at: string | null;
  ai_feedback: string | null;
}

interface Essay {
  id: string;
  user_id: string;
  content: string;
  created_at: string | null;
}

interface AdminMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean | null;
  created_at: string | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("관리자 권한이 없습니다.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    loadAllData();
  };

  const loadAllData = async () => {
    // Load all profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (profilesData) setProfiles(profilesData);

    // Load all interview sessions
    const { data: sessionsData } = await supabase
      .from("interview_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (sessionsData) setSessions(sessionsData);

    // Load all essays
    const { data: essaysData } = await supabase
      .from("essays")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (essaysData) setEssays(essaysData);

    // Load all admin messages
    const { data: messagesData } = await supabase
      .from("admin_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (messagesData) setMessages(messagesData);
  };

  const getUserEmail = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile?.email || "Unknown";
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("ko-KR");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-soft">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">관리자 대시보드</h1>
              <p className="text-muted-foreground">시스템 전체 데이터 관리</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            메인으로 돌아가기
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                총 사용자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                면접 세션
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                자기소개서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{essays.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                메시지
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">사용자</TabsTrigger>
            <TabsTrigger value="sessions">면접 세션</TabsTrigger>
            <TabsTrigger value="essays">자기소개서</TabsTrigger>
            <TabsTrigger value="messages">메시지</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>전체 사용자</CardTitle>
                <CardDescription>시스템에 등록된 모든 사용자 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이메일</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>가입일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.email}</TableCell>
                        <TableCell>{profile.full_name || "N/A"}</TableCell>
                        <TableCell>{formatDate(profile.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>면접 세션 기록</CardTitle>
                <CardDescription>전체 사용자의 면접 연습 기록</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <Card key={session.id} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">
                              {getUserEmail(session.user_id)}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {formatDate(session.created_at)}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={session.session_type === "common" ? "default" : "secondary"}>
                              {session.session_type === "common" ? "공통" : "자소서"}
                            </Badge>
                            {session.score && (
                              <Badge variant="outline">{session.score}점</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <strong>질문:</strong> {session.question}
                        </div>
                        {session.answer && (
                          <div>
                            <strong>답변:</strong> {session.answer.substring(0, 200)}
                            {session.answer.length > 200 ? "..." : ""}
                          </div>
                        )}
                        {session.ai_feedback && (
                          <div>
                            <strong>AI 피드백:</strong> {session.ai_feedback.substring(0, 200)}
                            {session.ai_feedback.length > 200 ? "..." : ""}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="essays">
            <Card>
              <CardHeader>
                <CardTitle>자기소개서</CardTitle>
                <CardDescription>전체 사용자의 자기소개서</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {essays.map((essay) => (
                    <Card key={essay.id} className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">
                          {getUserEmail(essay.user_id)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatDate(essay.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">
                          {essay.content.substring(0, 300)}
                          {essay.content.length > 300 ? "..." : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>메시지 기록</CardTitle>
                <CardDescription>사용자와 관리자 간의 메시지</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card key={message.id} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-medium">
                            {getUserEmail(message.user_id)}
                          </CardTitle>
                          <Badge variant={message.is_from_admin ? "default" : "secondary"}>
                            {message.is_from_admin ? "관리자" : "사용자"}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatDate(message.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{message.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
