import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Send, Paperclip, Trash2, Image as ImageIcon, Video, FileText, Pin, PinOff, Eye } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import FeedbackDialog from "@/components/FeedbackDialog";
import SchoolNewsFeed from "@/components/SchoolNewsFeed";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { z } from "zod";

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  original_content?: string | null;
  attachments: any;
  is_deleted: boolean;
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null };
}

const postSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(200, "제목은 200자 이내로 작성해주세요."),
  content: z.string().trim().min(1, "내용을 입력해주세요.").max(10000, "내용은 10,000자 이내로 작성해주세요.")
});

const Community = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isElder, setIsElder] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [desiredSchool, setDesiredSchool] = useState<string>('cheongshim');

  useEffect(() => {
    checkAuth();
    loadPosts();

    const channel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "elder"]),
      supabase
        .from("profiles")
        .select("desired_school")
        .eq("id", session.user.id)
        .single(),
    ]);

    if (roles) {
      setIsAdmin(roles.some(r => r.role === "admin"));
      setIsElder(roles.some(r => r.role === "elder"));
    }
    if (profile?.desired_school) {
      setDesiredSchool(profile.desired_school);
    }
  };

  const loadPosts = async () => {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .eq("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = Array.from(new Set(data.map((p: any) => p.user_id)));
      let profilesMap: Record<string, { full_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles", {
          _user_ids: userIds,
        });
        if (profiles) {
          profilesMap = (profiles as any[]).reduce((acc, p) => {
            acc[p.id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string | null }>);
        }
      }
      const postsWithProfiles = data.map((post: any) => ({
        ...post,
        profiles: profilesMap[post.user_id] || null,
      }));
      setPosts(postsWithProfiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
      
      if (totalSize > 50 * 1024 * 1024) {
        toast.error("파일 크기는 총 50MB를 초과할 수 없습니다.");
        return;
      }
      
      setFiles(selectedFiles);
    }
  };

  const uploadFiles = async (userId: string): Promise<{ type: string; url: string; name: string }[]> => {
    const uploadedFiles: { type: string; url: string; name: string }[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('community-files')
        .upload(fileName, file);

      if (uploadError) {
        continue;
      }

      // Use signed URL instead of public URL
      const { data: signedUrlData } = await supabase.storage
        .from('community-files')
        .createSignedUrl(fileName, 31536000); // 1 year expiration

      if (!signedUrlData?.signedUrl) continue;

      let fileType = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';

      uploadedFiles.push({ type: fileType, url: signedUrlData.signedUrl, name: file.name });
    }

    return uploadedFiles;
  };

  const handleSubmit = async () => {
    // Validate input with zod
    const validation = postSchema.safeParse({ title, content });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const { data: moderationResult } = await supabase.functions.invoke('content-moderation', {
        body: { content: `${title} ${content}` }
      });

      if (moderationResult?.blocked) {
        toast.error("부적절한 내용이 포함되어 있습니다.");
        setLoading(false);
        return;
      }

      const attachments = await uploadFiles(user.id);

      const { error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          title,
          content,
          original_content: content, // Store original content for admin review
          attachments
        });

      if (error) throw error;

      toast.success("게시글이 작성되었습니다.");
      setTitle("");
      setContent("");
      setFiles([]);
      setShowDialog(false);
      loadPosts();
    } catch (error: any) {
      toast.error("게시글 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("community_posts")
        .update({ is_deleted: true, deleted_by: user?.id, deleted_at: new Date().toISOString() })
        .eq("id", postId);

      if (error) throw error;

      toast.success("게시글이 삭제되었습니다.");
      loadPosts();
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handlePinToggle = async (postId: string, currentPinStatus: boolean) => {
    try {
      if (currentPinStatus) {
        // Unpin the post
        const { error } = await supabase
          .from("community_posts")
          .update({ is_pinned: false, pinned_at: null, pinned_by: null })
          .eq("id", postId);

        if (error) throw error;
        toast.success("공지사항이 해제되었습니다.");
      } else {
        // Check current pinned posts count
        const { data: pinnedPosts } = await supabase
          .from("community_posts")
          .select("id, pinned_at")
          .eq("is_pinned", true)
          .order("pinned_at", { ascending: true });

        // If there are 3 or more pinned posts, unpin the oldest one
        if (pinnedPosts && pinnedPosts.length >= 3) {
          const oldestPinned = pinnedPosts[0];
          await supabase
            .from("community_posts")
            .update({ is_pinned: false, pinned_at: null, pinned_by: null })
            .eq("id", oldestPinned.id);
        }

        // Pin the new post
        const { error } = await supabase
          .from("community_posts")
          .update({ 
            is_pinned: true, 
            pinned_at: new Date().toISOString(), 
            pinned_by: user?.id 
          })
          .eq("id", postId);

        if (error) throw error;
        toast.success("공지사항으로 등록되었습니다.");
      }

      loadPosts();
    } catch (error) {
      toast.error("작업에 실패했습니다.");
    }
  };

  const renderAttachment = (attachment: { type: string; url: string; name: string }) => {
    switch (attachment.type) {
      case 'image':
        return <img src={attachment.url} alt={attachment.name} className="max-w-full rounded-lg" />;
      case 'video':
        return <video src={attachment.url} controls className="max-w-full rounded-lg" />;
      default:
        return (
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
            <FileText className="h-4 w-4" />
            {attachment.name}
          </a>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <Button 
              variant="ghost" 
              size={isMobile ? "sm" : "default"}
              onClick={() => navigate("/")}
              className="min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
              {!isMobile && "돌아가기"}
            </Button>
            <h1 className="text-lg md:text-2xl font-bold">커뮤니티</h1>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size={isMobile ? "sm" : "default"} className="min-h-[44px]">
                  글쓰기
                </Button>
              </DialogTrigger>
              <DialogContent className={isMobile ? "max-w-[95vw] h-[90vh]" : "max-w-2xl"}>
                <DialogHeader>
                  <DialogTitle>새 게시글 작성</DialogTitle>
                </DialogHeader>
              <ScrollArea className={isMobile ? "h-[calc(90vh-120px)]" : "max-h-[70vh]"}>
                <div className="space-y-4 pr-4">
                  <Input
                    placeholder="제목"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="min-h-[44px]"
                  />
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        [{ 'font': [] }],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link'],
                        ['clean']
                      ],
                    }}
                    className="bg-background"
                    style={{ minHeight: "200px" }}
                  />
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-[44px]">
                        <Paperclip className="h-4 w-4" />
                        파일 첨부 (이미지, 동영상, 문서)
                      </div>
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                    />
                    {files.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {files.length}개 파일 선택됨
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading} 
                    className="w-full min-h-[44px]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    작성하기
                  </Button>
                </div>
              </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-4xl mx-auto space-y-3 md:space-y-4">
          <SchoolNewsFeed desiredSchool={desiredSchool} />
          {posts.map((post) => (
            <Card key={post.id} className={isMobile ? "text-sm" : ""}>
              <CardHeader className={isMobile ? "p-4 pb-2" : ""}>
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className={isMobile ? "text-base" : ""}>{post.title}</CardTitle>
                      {post.is_pinned && (
                        <Badge variant="default" className="gap-1 shrink-0">
                          <Pin className="h-3 w-3" />
                          공지
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
                      <span className="truncate">{post.profiles?.full_name || "익명"}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  {(isAdmin || isElder) && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePinToggle(post.id, post.is_pinned)}
                        title={post.is_pinned ? "공지사항 해제" : "공지사항으로 등록"}
                        className="min-h-[44px] min-w-[44px]"
                      >
                        {post.is_pinned ? (
                          <PinOff className="h-4 w-4" />
                        ) : (
                          <Pin className="h-4 w-4" />
                        )}
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className={isMobile ? "p-4 pt-2" : ""}>
                <div 
                  className="mb-4 break-words ql-editor-display"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
                {isAdmin && post.original_content && post.original_content !== post.content && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mb-4">
                        <Eye className="h-4 w-4 mr-2" />
                        원본 내용 보기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>검열 전 원본 내용</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                        <div 
                          className="p-4 break-words ql-editor-display"
                          dangerouslySetInnerHTML={{ __html: post.original_content }}
                        />
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="space-y-2">
                    {post.attachments.map((attachment, idx) => (
                      <div key={idx} className="max-w-full overflow-hidden">
                        {renderAttachment(attachment)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <FeedbackDialog />
      <Footer />
    </div>
  );
};

export default Community;
