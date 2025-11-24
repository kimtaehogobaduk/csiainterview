import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, User, ShoppingBag, Video, Settings } from "lucide-react";

const UpdateAnnouncementDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen this announcement
    const hasSeenAnnouncement = localStorage.getItem("hasSeenV2Announcement");
    if (!hasSeenAnnouncement) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenV2Announcement", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">새로운 기능이 추가되었습니다!</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            합격의 길이 더욱 강력해졌습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Video className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">면접 중 카메라 미리보기</h3>
                <p className="text-sm text-muted-foreground">
                  실제 면접처럼 카메라를 통해 자신의 모습을 확인하며 연습할 수 있습니다. 
                  내 정보 페이지에서 카메라 사용을 활성화하세요.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20">
              <Settings className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">AI 모델 선택 기능</h3>
                <p className="text-sm text-muted-foreground">
                  다양한 AI 모델 중에서 원하는 모델을 선택하여 더 정확한 피드백을 받을 수 있습니다. 
                  내 정보 페이지에서 AI 모델을 설정하세요.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
              <MessageSquare className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">음성 인식 기능 향상</h3>
                <p className="text-sm text-muted-foreground">
                  음성 답변 시 발음, 속도, 유창성 등을 분석하여 더 자세한 피드백을 제공합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <MessageSquare className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">커뮤니티 기능 확장</h3>
                <p className="text-sm text-muted-foreground">
                  청심국제고 입시에 관한 다양한 이야기를 나누고, 사진과 파일을 첨부할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/5 border border-accent/20">
              <User className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">마일리지 제도 도입</h3>
                <p className="text-sm text-muted-foreground">
                  면접 연습을 통해 마일리지를 획득하고, 다양한 보상을 받을 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
              <ShoppingBag className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-1">프로필 꾸미기 상점</h3>
                <p className="text-sm text-muted-foreground">
                  마일리지로 프레임, 배지, 테마 등 다양한 아이템을 구매하여 프로필을 꾸밀 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleClose} size="lg" className="w-full sm:w-auto">
            확인했습니다
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateAnnouncementDialog;
