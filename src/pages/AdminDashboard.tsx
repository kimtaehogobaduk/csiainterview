import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, Users, MessageSquare, FileText, BarChart, Trash2, Send, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useIsMobile } from "@/hooks/use-mobile";
import Footer from "@/components/Footer";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  mileage?: number;
  role?: string;
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
  const isMobile = useIsMobile();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [editedEssayContent, setEditedEssayContent] = useState("");
  const [selectedSession, setSelectedSession] = useState<InterviewSession | null>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [selectedUserForMileage, setSelectedUserForMileage] = useState<Profile | null>(null);
  const [mileageAmount, setMileageAmount] = useState<string>("");
  const [mileageReason, setMileageReason] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if localStorage is accessible
      try {
        localStorage.getItem('test');
      } catch (e) {
        console.error('localStorage not accessible in AdminDashboard:', e);
        toast.error("브라우저의 저장소 접근이 차단되었습니다. 시크릿 모드를 종료하거나 브라우저 설정에서 쿠키 및 사이트 데이터를 허용해주세요.", {
          duration: 8000,
        });
        navigate("/");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('AdminDashboard - Current session:', session?.user?.email);
      
      if (!session?.user) {
        console.log('AdminDashboard - No session, redirecting to auth');
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user is admin
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      console.log('AdminDashboard - Role check:', { roleData, error, userId: session.user.id });

      if (error) {
        console.error('AdminDashboard - Role check error:', error);
        toast.error("역할 확인 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.");
        navigate("/");
        return;
      }

      if (!roleData) {
        console.log('AdminDashboard - User is not admin');
        toast.error("관리자 권한이 없습니다.");
        navigate("/");
        return;
      }

      console.log('AdminDashboard - User is admin, loading data');
      setIsAdmin(true);
      setLoading(false);
      loadAllData();
    } catch (error) {
      console.error('AdminDashboard - checkAuth exception:', error);
      toast.error("인증 확인 중 오류가 발생했습니다. 페이지를 새로고침해주세요.");
      navigate("/");
    }
  };

  const loadAllData = async () => {
    // Load all profiles with roles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (profilesData) {
      const profilesWithRoles = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .maybeSingle();
          
          return { 
            ...profile, 
            role: roleData?.role || "user",
            mileage: profile.mileage || 0
          };
        })
      );
      setProfiles(profilesWithRoles);
    }

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

  const handleDeleteUser = async (userId: string) => {
    try {
      // Delete in order: sessions, essays, messages, roles, profile
      await supabase.from("interview_sessions").delete().eq("user_id", userId);
      await supabase.from("essays").delete().eq("user_id", userId);
      await supabase.from("admin_messages").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      
      if (error) throw error;
      
      toast.success("사용자가 삭제되었습니다.");
      loadAllData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("사용자 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSendReply = async () => {
    if (!selectedUserId || !replyMessage.trim()) {
      toast.error("메시지를 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase.from("admin_messages").insert({
        user_id: selectedUserId,
        message: replyMessage,
        is_from_admin: true,
      });

      if (error) throw error;

      toast.success("답변이 전송되었습니다.");
      setReplyMessage("");
      setSelectedUserId(null);
      loadAllData();
    } catch (error) {
      console.error("Reply error:", error);
      toast.error("답변 전송 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateEssay = async () => {
    if (!selectedEssay || !editedEssayContent.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    try {
      const { error } = await supabase
        .from("essays")
        .update({ content: editedEssayContent })
        .eq("id", selectedEssay.id);

      if (error) throw error;

      toast.success("자기소개서가 수정되었습니다.");
      setSelectedEssay(null);
      loadAllData();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("자기소개서 수정 중 오류가 발생했습니다.");
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("내보낼 데이터가 없습니다.");
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(",")
    );
    
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success("데이터를 내보냈습니다.");
  };

  const handleChangeRole = async () => {
    if (!selectedUserForRole || !newRole) {
      toast.error("역할을 선택해주세요.");
      return;
    }

    try {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", selectedUserForRole.id)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole as any })
          .eq("user_id", selectedUserForRole.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: selectedUserForRole.id, role: newRole as any });
        
        if (error) throw error;
      }

      toast.success("역할이 변경되었습니다.");
      setSelectedUserForRole(null);
      setNewRole("");
      loadAllData();
    } catch (error) {
      console.error("Role change error:", error);
      toast.error("역할 변경 중 오류가 발생했습니다.");
    }
  };

  const handleManageMileage = async () => {
    if (!selectedUserForMileage || !mileageAmount || !mileageReason) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    const amount = parseInt(mileageAmount);
    if (isNaN(amount)) {
      toast.error("올바른 숫자를 입력해주세요.");
      return;
    }

    try {
      console.log('Calling admin_adjust_mileage with:', {
        p_user_id: selectedUserForMileage.id,
        p_amount: amount,
        p_reason: mileageReason
      });

      const { data, error } = await supabase.rpc('admin_adjust_mileage', {
        p_user_id: selectedUserForMileage.id,
        p_amount: amount,
        p_reason: mileageReason,
      });

      if (error) {
        console.error("RPC error:", error);
        throw error;
      }

      console.log('Mileage adjusted successfully:', data);
      toast.success(`마일리지가 ${amount > 0 ? '지급' : '차감'}되었습니다.`);
      setSelectedUserForMileage(null);
      setMileageAmount("");
      setMileageReason("");
      loadAllData();
    } catch (error: any) {
      console.error("Mileage management error:", error);
      toast.error(`마일리지 관리 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}`);
    }
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
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="users" className="min-h-[44px]">사용자</TabsTrigger>
            <TabsTrigger value="sessions" className="min-h-[44px]">면접 세션</TabsTrigger>
            <TabsTrigger value="essays" className="min-h-[44px]">자기소개서</TabsTrigger>
            <TabsTrigger value="messages" className="min-h-[44px]">메시지</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg md:text-xl">전체 사용자</CardTitle>
                    <CardDescription className="text-sm">시스템에 등록된 모든 사용자 목록</CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV(profiles, "users")} variant="outline" size="sm" className="w-full md:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    CSV 내보내기
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isMobile ? (
                  <div className="space-y-4">
                    {profiles.map((profile) => (
                      <Card key={profile.id} className="bg-muted/30">
                        <CardHeader className="pb-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0 flex-1">
                                <CardTitle className="text-sm font-medium truncate">{profile.email}</CardTitle>
                                <p className="text-xs text-muted-foreground">{profile.full_name || "N/A"}</p>
                              </div>
                              <Badge variant={profile.role === "admin" ? "destructive" : profile.role === "elder" ? "secondary" : "outline"}>
                                {profile.role === "admin" ? "관리자" : profile.role === "elder" ? "장로" : "사용자"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">가입일: {formatDate(profile.created_at)}</p>
                            <p className="text-xs font-bold text-primary">마일리지: {profile.mileage?.toLocaleString() || 0}P</p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full min-h-[44px]"
                                  onClick={() => {
                                    setSelectedUserForMileage(profile);
                                    setMileageAmount("");
                                    setMileageReason("");
                                  }}
                                >
                                  마일리지 관리
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[90vw] md:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>마일리지 관리</DialogTitle>
                                  <DialogDescription className="break-words">
                                    {profile.email}의 마일리지를 관리합니다. (현재: {profile.mileage?.toLocaleString() || 0}P)
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>마일리지 변경량</Label>
                                    <Input
                                      type="number"
                                      placeholder="양수는 지급, 음수는 차감"
                                      value={mileageAmount}
                                      onChange={(e) => setMileageAmount(e.target.value)}
                                      max={100000000000000000000}
                                      min={-100000000000000000000}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      예: 100 (지급), -50 (차감)
                                    </p>
                                  </div>
                                  <div>
                                    <Label>사유</Label>
                                    <Input
                                      placeholder="마일리지 변경 사유"
                                      value={mileageReason}
                                      onChange={(e) => setMileageReason(e.target.value)}
                                    />
                                  </div>
                                  <Button onClick={handleManageMileage} className="w-full min-h-[44px]">
                                    적용하기
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="w-full min-h-[44px]"
                                  onClick={() => {
                                    setSelectedUserForRole(profile);
                                    setNewRole(profile.role || "user");
                                  }}
                                >
                                  역할 변경
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[90vw] md:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>사용자 역할 변경</DialogTitle>
                                  <DialogDescription className="break-words">
                                    {profile.email}의 역할을 변경합니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Label>역할 선택</Label>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                  >
                                    <option value="user">사용자</option>
                                    <option value="elder">장로</option>
                                    <option value="admin">관리자</option>
                                  </select>
                                  <Button onClick={handleChangeRole} className="w-full min-h-[44px]">
                                    변경하기
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full min-h-[44px]">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-[90vw] md:max-w-md">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
                                  <AlertDialogDescription className="break-words">
                                    {profile.email}을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(profile.id)}>
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>이메일</TableHead>
                          <TableHead>이름</TableHead>
                          <TableHead>역할</TableHead>
                          <TableHead>마일리지</TableHead>
                          <TableHead>가입일</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.email}</TableCell>
                        <TableCell>{profile.full_name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={profile.role === "admin" ? "destructive" : profile.role === "elder" ? "secondary" : "outline"}>
                            {profile.role === "admin" ? "관리자" : profile.role === "elder" ? "장로" : "사용자"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{profile.mileage?.toLocaleString() || 0}P</span>
                        </TableCell>
                        <TableCell>{formatDate(profile.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForMileage(profile);
                                    setMileageAmount("");
                                    setMileageReason("");
                                  }}
                                >
                                  마일리지
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>마일리지 관리</DialogTitle>
                                  <DialogDescription>
                                    {profile.email}의 마일리지를 관리합니다. (현재: {profile.mileage?.toLocaleString() || 0}P)
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>마일리지 변경량</Label>
                                    <Input
                                      type="number"
                                      placeholder="양수는 지급, 음수는 차감"
                                      value={mileageAmount}
                                      onChange={(e) => setMileageAmount(e.target.value)}
                                      max={100000000000000000000}
                                      min={-100000000000000000000}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      예: 100 (지급), -50 (차감)
                                    </p>
                                  </div>
                                  <div>
                                    <Label>사유</Label>
                                    <Input
                                      placeholder="마일리지 변경 사유"
                                      value={mileageReason}
                                      onChange={(e) => setMileageReason(e.target.value)}
                                    />
                                  </div>
                                  <Button onClick={handleManageMileage} className="w-full">
                                    적용하기
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForRole(profile);
                                    setNewRole(profile.role || "user");
                                  }}
                                >
                                  역할 변경
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>사용자 역할 변경</DialogTitle>
                                  <DialogDescription>
                                    {profile.email}의 역할을 변경합니다.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Label>역할 선택</Label>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                  >
                                    <option value="user">사용자</option>
                                    <option value="elder">장로</option>
                                    <option value="admin">관리자</option>
                                  </select>
                                  <Button onClick={handleChangeRole} className="w-full">
                                    변경하기
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {profile.email} 사용자와 관련된 모든 데이터(세션, 에세이, 메시지)가 삭제됩니다. 
                                    이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(profile.id)}>
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>면접 세션 기록</CardTitle>
                    <CardDescription>전체 사용자의 면접 연습 기록</CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV(sessions, "sessions")} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    CSV 내보내기
                  </Button>
                </div>
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>면접 세션 상세</DialogTitle>
                                  <DialogDescription>
                                    {getUserEmail(session.user_id)} - {formatDate(session.created_at)}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm font-semibold">질문</Label>
                                    <p className="mt-2 text-sm">{session.question}</p>
                                  </div>
                                  {session.answer && (
                                    <div>
                                      <Label className="text-sm font-semibold">답변</Label>
                                      <p className="mt-2 text-sm whitespace-pre-wrap">{session.answer}</p>
                                    </div>
                                  )}
                                  {session.ai_feedback && (
                                    <div>
                                      <Label className="text-sm font-semibold">AI 피드백</Label>
                                      <p className="mt-2 text-sm whitespace-pre-wrap">{session.ai_feedback}</p>
                                    </div>
                                  )}
                                  {session.score && (
                                    <div>
                                      <Label className="text-sm font-semibold">점수</Label>
                                      <p className="mt-2 text-sm">{session.score}점 / 100점</p>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <strong>질문:</strong> {session.question.substring(0, 100)}
                          {session.question.length > 100 ? "..." : ""}
                        </div>
                        {session.answer && (
                          <div>
                            <strong>답변:</strong> {session.answer.substring(0, 150)}
                            {session.answer.length > 150 ? "..." : ""}
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
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>자기소개서</CardTitle>
                    <CardDescription>전체 사용자의 자기소개서</CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV(essays, "essays")} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    CSV 내보내기
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {essays.map((essay) => (
                    <Card key={essay.id} className="bg-muted/30">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-sm font-medium">
                              {getUserEmail(essay.user_id)}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {formatDate(essay.created_at)}
                            </CardDescription>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedEssay(essay);
                                  setEditedEssayContent(essay.content);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                상세보기/수정
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>자기소개서 - {getUserEmail(essay.user_id)}</DialogTitle>
                                <DialogDescription>
                                  작성일: {formatDate(essay.created_at)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="essay-content">내용</Label>
                                  <Textarea
                                    id="essay-content"
                                    value={editedEssayContent}
                                    onChange={(e) => setEditedEssayContent(e.target.value)}
                                    className="min-h-[400px] mt-2"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setSelectedEssay(null)}>
                                    취소
                                  </Button>
                                  <Button onClick={handleUpdateEssay}>
                                    저장
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
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
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>메시지 기록</CardTitle>
                    <CardDescription>사용자와 관리자 간의 메시지</CardDescription>
                  </div>
                  <Button onClick={() => exportToCSV(messages, "messages")} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    CSV 내보내기
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card key={message.id} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm font-medium">
                              {getUserEmail(message.user_id)}
                            </CardTitle>
                            <Badge variant={message.is_from_admin ? "default" : "secondary"}>
                              {message.is_from_admin ? "관리자" : "사용자"}
                            </Badge>
                          </div>
                          {!message.is_from_admin && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedUserId(message.user_id)}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  답변하기
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>관리자 답변</DialogTitle>
                                  <DialogDescription>
                                    {getUserEmail(message.user_id)}에게 답변을 보냅니다
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="original-message">원본 메시지</Label>
                                    <Textarea
                                      id="original-message"
                                      value={message.message}
                                      disabled
                                      className="mt-2"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="reply-message">답변</Label>
                                    <Textarea
                                      id="reply-message"
                                      value={replyMessage}
                                      onChange={(e) => setReplyMessage(e.target.value)}
                                      placeholder="답변을 입력하세요..."
                                      className="mt-2 min-h-[120px]"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => {
                                      setSelectedUserId(null);
                                      setReplyMessage("");
                                    }}>
                                      취소
                                    </Button>
                                    <Button onClick={handleSendReply}>
                                      <Send className="h-4 w-4 mr-2" />
                                      전송
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
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
      <Footer />
    </div>
  );
};

export default AdminDashboard;
