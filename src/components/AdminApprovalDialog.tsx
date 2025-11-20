import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface ApprovalRequest {
  id: string;
  email: string;
  device_info: string | null;
  ip_address: string | null;
  requested_at: string;
}

export const AdminApprovalDialog = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    loadPendingRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin_approval_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_approval_requests',
        },
        () => {
          loadPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

  const loadPendingRequests = async () => {
    const { data, error } = await supabase
      .from('admin_approval_requests')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      return;
    }

    setRequests(data || []);
  };

  const handleApproval = async (requestId: string, approved: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('admin_approval_requests')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      toast({
        title: "오류",
        description: "요청 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: approved ? "승인 완료" : "거부 완료",
      description: approved 
        ? "관리자 권한이 승인되었습니다." 
        : "관리자 권한 요청이 거부되었습니다.",
    });

    loadPendingRequests();
  };

  if (!isAdmin || requests.length === 0) return null;

  return (
    <Dialog open={requests.length > 0}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            관리자 권한 승인 요청
          </DialogTitle>
          <DialogDescription>
            새로운 기기에서 관리자 권한 요청이 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="space-y-1">
                <p className="font-medium">{request.email}</p>
                {request.device_info && (
                  <p className="text-sm text-muted-foreground">
                    기기: {request.device_info}
                  </p>
                )}
                {request.ip_address && (
                  <p className="text-sm text-muted-foreground">
                    IP: {request.ip_address}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  요청 시간: {new Date(request.requested_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApproval(request.id, true)}
                  className="flex-1"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  승인
                </Button>
                <Button
                  onClick={() => handleApproval(request.id, false)}
                  className="flex-1"
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  거부
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
