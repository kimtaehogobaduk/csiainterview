import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Crown, Trophy, Palette } from "lucide-react";
import { toast } from "sonner";

interface ProfileItem {
  id: string;
  name: string;
  item_type: string;
  config: any;
}

interface UserCustomization {
  avatar_frame_id: string | null;
  badge_id: string | null;
  theme_color: string;
  custom_icon_id: string | null;
}

const ProfileCustomization = () => {
  const [userItems, setUserItems] = useState<ProfileItem[]>([]);
  const [customization, setCustomization] = useState<UserCustomization>({
    avatar_frame_id: null,
    badge_id: null,
    theme_color: "#0ea5e9",
    custom_icon_id: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomization();
  }, []);

  const loadCustomization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's purchased items
      const { data: itemsData, error: itemsError } = await supabase
        .from('user_items')
        .select('item_id, profile_items(*)')
        .eq('user_id', user.id);

      if (itemsError) throw itemsError;

      const items = itemsData
        .map(item => item.profile_items as unknown as ProfileItem)
        .filter(item => item !== null);
      
      setUserItems(items);

      // Load current customization
      const { data: customData, error: customError } = await supabase
        .from('user_customization')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customError && customError.code !== 'PGRST116') throw customError;

      if (customData) {
        setCustomization({
          avatar_frame_id: customData.avatar_frame_id,
          badge_id: customData.badge_id,
          theme_color: customData.theme_color || "#0ea5e9",
          custom_icon_id: customData.custom_icon_id,
        });
      }
    } catch (error) {
      console.error('Error loading customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyCustomization = async (itemType: string, itemId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      
      if (itemType === 'avatar_frame') {
        updates.avatar_frame_id = itemId;
      } else if (itemType === 'badge') {
        updates.badge_id = itemId;
      } else if (itemType === 'icon') {
        updates.custom_icon_id = itemId;
      } else if (itemType === 'theme_color') {
        const item = userItems.find(i => i.id === itemId);
        if (item?.config?.color) {
          updates.theme_color = item.config.color;
        }
      }

      // Check if customization exists
      const { data: existing } = await supabase
        .from('user_customization')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_customization')
          .update(updates)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_customization')
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }

      toast.success('아이템이 적용되었습니다!');
      loadCustomization();
    } catch (error) {
      console.error('Error applying customization:', error);
      toast.error('아이템 적용에 실패했습니다.');
    }
  };

  const getItemsByType = (type: string) => {
    return userItems.filter(item => item.item_type === type);
  };

  const getItemIcon = (item: ProfileItem) => {
    const iconClass = "h-6 w-6";
    
    if (item.item_type === 'avatar_frame') {
      const color = item.config?.color || '#888888';
      return <Award className={iconClass} style={{ color }} />;
    }
    
    if (item.item_type === 'badge') {
      const BadgeIcon = item.config?.icon === 'trophy' ? Trophy : 
                        item.config?.icon === 'award' ? Award : Crown;
      const color = item.config?.color || '#888888';
      return <BadgeIcon className={iconClass} style={{ color }} />;
    }
    
    if (item.item_type === 'theme_color') {
      const color = item.config?.color || '#888888';
      return (
        <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: color }} />
      );
    }
    
    if (item.item_type === 'icon') {
      const IconComponent = item.config?.iconName || '✨';
      return <span className="text-2xl">{IconComponent}</span>;
    }
    
    return <Palette className={iconClass} />;
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (userItems.length === 0) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>프로필 꾸미기</CardTitle>
          <CardDescription>구매한 아이템이 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            상점에서 아이템을 구매하고 프로필을 꾸며보세요!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {getItemsByType('avatar_frame').length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>프레임</CardTitle>
            <CardDescription>프로필 프레임을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getItemsByType('avatar_frame').map(item => (
                <Button
                  key={item.id}
                  variant={customization.avatar_frame_id === item.id ? "default" : "outline"}
                  onClick={() => applyCustomization('avatar_frame', item.id)}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  {getItemIcon(item)}
                  <span className="text-sm">{item.name}</span>
                </Button>
              ))}
              <Button
                variant={customization.avatar_frame_id === null ? "default" : "outline"}
                onClick={() => applyCustomization('avatar_frame', null)}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <span className="text-sm">없음</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {getItemsByType('badge').length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>배지</CardTitle>
            <CardDescription>프로필 배지를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getItemsByType('badge').map(item => (
                <Button
                  key={item.id}
                  variant={customization.badge_id === item.id ? "default" : "outline"}
                  onClick={() => applyCustomization('badge', item.id)}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  {getItemIcon(item)}
                  <span className="text-sm">{item.name}</span>
                </Button>
              ))}
              <Button
                variant={customization.badge_id === null ? "default" : "outline"}
                onClick={() => applyCustomization('badge', null)}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <span className="text-sm">없음</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {getItemsByType('theme_color').length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>테마 색상</CardTitle>
            <CardDescription>프로필 테마 색상을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getItemsByType('theme_color').map(item => (
                <Button
                  key={item.id}
                  variant={customization.theme_color === item.config?.color ? "default" : "outline"}
                  onClick={() => applyCustomization('theme_color', item.id)}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  {getItemIcon(item)}
                  <span className="text-sm">{item.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {getItemsByType('icon').length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>커스텀 아이콘</CardTitle>
            <CardDescription>프로필 아이콘을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getItemsByType('icon').map(item => (
                <Button
                  key={item.id}
                  variant={customization.custom_icon_id === item.id ? "default" : "outline"}
                  onClick={() => applyCustomization('icon', item.id)}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  {getItemIcon(item)}
                  <span className="text-sm">{item.name}</span>
                </Button>
              ))}
              <Button
                variant={customization.custom_icon_id === null ? "default" : "outline"}
                onClick={() => applyCustomization('icon', null)}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <span className="text-sm">없음</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileCustomization;
