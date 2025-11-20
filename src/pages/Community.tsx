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
import { ArrowLeft, Send, Paperclip, Trash2, Image as ImageIcon, Video, FileText } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Footer from "@/components/Footer";

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  attachments: any;
  is_deleted: boolean;
  created_at: string;
  profiles?: { full_name: string | null };
}

const Community = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

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

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadPosts = async () => {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const postsWithProfiles = await Promise.all(
        data.map(async (post) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", post.user_id)
            .single();
          
          return { ...post, profiles: profile };
        })
      );
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
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('community-files')
        .getPublicUrl(fileName);

      let fileType = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';

      uploadedFiles.push({ type: fileType, url: publicUrl, name: file.name });
    }

    return uploadedFiles;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
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
      console.error('Error:', error);
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
      console.error('Error:', error);
      toast.error("삭제에 실패했습니다.");
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-2xl font-bold">커뮤니티</h1>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>글쓰기</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>새 게시글 작성</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  placeholder="내용을 입력하세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                />
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  작성하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle>{post.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{post.profiles?.full_name || "익명"}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap mb-4">{post.content}</p>
                {post.attachments && post.attachments.length > 0 && (
                  <div className="space-y-2">
                    {post.attachments.map((attachment, idx) => (
                      <div key={idx}>{renderAttachment(attachment)}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Community;
