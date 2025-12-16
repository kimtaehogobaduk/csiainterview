import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import sorryImage from "@/assets/sorry-image.png";

interface EmergencyNoticeDialogProps {
  shouldOpen: boolean;
}

const EmergencyNoticeDialog = ({ shouldOpen }: EmergencyNoticeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (shouldOpen) {
      const hasSeenNotice = localStorage.getItem("hasSeenEmergencyNotice");
      if (!hasSeenNotice) {
        setOpen(true);
      }
    }
  }, [shouldOpen]);

  useEffect(() => {
    if (open && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [open, timeLeft]);

  const handleClose = () => {
    if (canClose) {
      localStorage.setItem("hasSeenEmergencyNotice", "true");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[85vh] p-6">
          <DialogHeader className="mb-4">
            <h2 className="text-3xl font-bold text-red-600 text-center">[필독]</h2>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              안녕하세요. '합격의 길' 대표 개발자 김태호입니다. 12월 16일 화요일 1시에 친구 집에 작은 화재가 발생했습니다. 다행히 큰 피해는 없었지만, 친구 컴퓨터에 있던 서버가 날라가서 사이트의 정보가 다 날라가게 되었습니다. 현재 복구가 진행중에 있으나, 짧은 기간 내에 복구는 어려울 것 같습니다. 따라서 새로운 계정을 만들거나, 기존 계정으로 다시 회원가입해주시면 감사하겠습니다. 죄송합니다 ㅠㅠㅠㅠ
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              다행(?)인지는 모르겠는데, 여러분들의 '저장된 질문' '면접 기록' 등은 남아있으니 혹시나 필요하신 분들은 개인톡 주시면 언제든지 보내드리겠습니다. 다시 한번 죄송합니다 ㅠㅠ
            </p>

            <div className="flex justify-center py-4">
              <img 
                src={sorryImage} 
                alt="죄송합니다" 
                className="max-w-[200px] rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button 
              onClick={handleClose} 
              size="lg" 
              className="w-full" 
              disabled={!canClose}
            >
              {canClose ? "확인했습니다" : `확인하기 (${timeLeft}초)`}
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EmergencyNoticeDialog;
