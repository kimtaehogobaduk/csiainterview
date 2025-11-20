import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import html2canvas from "html2canvas";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const FeedbackDialog = () => {
  const [open, setOpen] = useState(false);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemContent, setProblemContent] = useState("");
  const [suggestionContent, setSuggestionContent] = useState("");
  const [loading, setLoading] = useState(false);

  const takeScreenshot = async (): Promise<string | null> => {
    try {
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scale: 0.5, // Reduce quality for smaller file size
      });
      
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (error) {
      console.error("Screenshot error:", error);
      toast.error("스크린샷 생성에 실패했습니다.");
      return null;
    }
  };

  const uploadScreenshot = async (dataUrl: string, userId: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const fileName = `screenshot_${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from("community-files")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("community-files")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleProblemSubmit = async () => {
    if (!problemTitle.trim() || !problemContent.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // Take screenshot
      const screenshotDataUrl = await takeScreenshot();
      let screenshotUrl = "";
      
      if (screenshotDataUrl) {
        const uploadedUrl = await uploadScreenshot(screenshotDataUrl, user.id);
        if (uploadedUrl) {
          screenshotUrl = uploadedUrl;
        }
      }

      const message = `[문제 문의] ${problemTitle}\n\n${problemContent}${screenshotUrl ? `\n\n스크린샷: ${screenshotUrl}` : ""}`;

      const { error } = await supabase
        .from("admin_messages")
        .insert({
          user_id: user.id,
          message,
          is_from_admin: false,
        });

      if (error) throw error;

      toast.success("문제 문의가 전송되었습니다.");
      setProblemTitle("");
      setProblemContent("");
      setOpen(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSubmit = async () => {
    if (!suggestionContent.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      const message = `[제안]\n\n${suggestionContent}`;

      const { error } = await supabase
        .from("admin_messages")
        .insert({
          user_id: user.id,
          message,
          is_from_admin: false,
        });

      if (error) throw error;

      toast.success("제안이 전송되었습니다.");
      setSuggestionContent("");
      setOpen(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const modules = {
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
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4 z-50 shadow-lg">
          <MessageSquare className="h-4 w-4 mr-2" />
          피드백
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>관리자에게 피드백 보내기</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="problem" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="problem">문제 문의</TabsTrigger>
            <TabsTrigger value="suggestion">제안</TabsTrigger>
          </TabsList>
          <TabsContent value="problem" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              문제를 보고하면 자동으로 현재 페이지의 스크린샷이 첨부됩니다.
            </div>
            <Input
              placeholder="제목"
              value={problemTitle}
              onChange={(e) => setProblemTitle(e.target.value)}
            />
            <textarea
              placeholder="문제 설명을 자세히 작성해주세요..."
              value={problemContent}
              onChange={(e) => setProblemContent(e.target.value)}
              className="w-full min-h-[200px] p-3 border rounded-md resize-none"
            />
            <Button onClick={handleProblemSubmit} disabled={loading} className="w-full">
              {loading ? "전송 중..." : "문제 문의 보내기"}
            </Button>
          </TabsContent>
          <TabsContent value="suggestion" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              아래 에디터를 사용하여 제안을 자유롭게 작성하세요.
            </div>
            <ReactQuill
              theme="snow"
              value={suggestionContent}
              onChange={setSuggestionContent}
              modules={modules}
              className="bg-background"
              style={{ minHeight: "200px" }}
            />
            <Button onClick={handleSuggestionSubmit} disabled={loading} className="w-full mt-4">
              {loading ? "전송 중..." : "제안 보내기"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
