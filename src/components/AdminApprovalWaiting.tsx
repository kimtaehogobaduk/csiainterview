import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AdminApprovalWaitingProps {
  requestId: string;
}

export const AdminApprovalWaiting = ({ requestId }: AdminApprovalWaitingProps) => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel(`approval_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_approval_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          setStatus(newStatus);

          if (newStatus === 'approved') {
            toast({
              title: "승인 완료",
              description: "관리자 권한이 승인되었습니다. 페이지를 새로고침합니다.",
            });
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else if (newStatus === 'rejected') {
            toast({
              title: "승인 거부",
              description: "관리자 권한 요청이 거부되었습니다.",
              variant: "destructive",
            });
            setTimeout(() => {
              navigate('/');
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'pending' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'rejected' && <XCircle className="h-5 w-5 text-red-500" />}
            {status === 'pending' && '관리자 승인 대기 중'}
            {status === 'approved' && '승인 완료'}
            {status === 'rejected' && '승인 거부됨'}
          </CardTitle>
          <CardDescription>
            {status === 'pending' && '기존 관리자의 승인을 기다리고 있습니다. 최대 10분간 대기합니다.'}
            {status === 'approved' && '관리자 권한이 승인되었습니다.'}
            {status === 'rejected' && '관리자 권한 요청이 거부되었습니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>승인 요청이 전송되었습니다...</span>
              </div>
              <p className="text-xs text-muted-foreground">
                기존 관리자 기기에서 승인 알림을 확인해주세요.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
