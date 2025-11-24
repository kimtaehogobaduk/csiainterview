import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, X } from "lucide-react";

interface AdminMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean | null;
  created_at: string | null;
  read?: boolean;
}

const AdminReplyNotification = () => {
  const [open, setOpen] = useState(false);
  const [adminReplies, setAdminReplies] = useState<AdminMessage[]>([]);
  const [user, setUser] = useState<any>(null);
  const [hasNewReplies, setHasNewReplies] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadAdminReplies(session.user.id);
      }
    };

    initUser();

    // Subscribe to new admin messages
    const channel = supabase
      .channel('admin-messages-notification')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_messages',
        filter: `is_from_admin=eq.true`
      }, (payload) => {
        if (user && payload.new.user_id === user.id) {
          loadAdminReplies(user.id);
          setHasNewReplies(true);
          toast.success("관리자로부터 새로운 답변이 도착했습니다!");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadAdminReplies = async (userId: string) => {
    const { data } = await supabase
      .from("admin_messages")
      .select("*")
      .eq("user_id", userId)
      .eq("is_from_admin", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      setAdminReplies(data);
      
      // Check if there are unread messages (created in last 24 hours that haven't been viewed)
      const lastViewed = localStorage.getItem(`last_viewed_replies_${userId}`);
      const lastViewedTime = lastViewed ? new Date(lastViewed).getTime() : 0;
      
      const hasUnread = data.some(msg => {
        const msgTime = new Date(msg.created_at || 0).getTime();
        return msgTime > lastViewedTime;
      });
      
      setHasNewReplies(hasUnread);
    }
  };

  const handleOpenDialog = () => {
    setOpen(true);
    setHasNewReplies(false);
    
    // Mark as viewed
    if (user) {
      localStorage.setItem(`last_viewed_replies_${user.id}`, new Date().toISOString());
    }
  };

  const handleDeleteReply = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("admin_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      toast.success("답변이 삭제되었습니다.");
      if (user) {
        loadAdminReplies(user.id);
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  if (!user || adminReplies.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-20 right-4 z-50 shadow-lg"
        onClick={handleOpenDialog}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        관리자 답변
        {hasNewReplies && (
          <Badge variant="destructive" className="ml-2 animate-pulse">
            New
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              관리자 답변 ({adminReplies.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {adminReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">관리자</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reply.created_at || "").toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReply(reply.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {reply.message}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminReplyNotification;
