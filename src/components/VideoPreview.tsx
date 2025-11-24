import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

export interface VideoPreviewHandle {
  captureFrame: () => Promise<string | null>;
}

const VideoPreview = forwardRef<VideoPreviewHandle>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startVideo = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setIsActive(true);
      toast.success("카메라가 활성화되었습니다.");
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('카메라 접근 권한이 필요합니다.');
    }
  };

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    toast.info("카메라가 비활성화되었습니다.");
  };

  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current || !isActive) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;
      
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Error capturing frame:', error);
      return null;
    }
  };

  useImperativeHandle(ref, () => ({
    captureFrame
  }));

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">카메라 미리보기</CardTitle>
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={isActive ? stopVideo : startVideo}
          >
            {isActive ? (
              <>
                <VideoOff className="h-4 w-4 mr-2" />
                끄기
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                켜기
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">카메라를 켜서 면접 연습을 시작하세요</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

VideoPreview.displayName = 'VideoPreview';

export default VideoPreview;