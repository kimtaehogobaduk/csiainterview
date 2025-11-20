import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShoppingBag, Palette, Award, Crown, Check, Coins } from "lucide-react";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface ProfileItem {
  id: string;
  name: string;
  description: string;
  item_type: string;
  price: number;
  config: any;
}

interface UserItem {
  item_id: string;
}

const Shop = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [userItems, setUserItems] = useState<string[]>([]);
  const [mileage, setMileage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load user's mileage
      const { data: profileData } = await supabase
        .from('profiles')
        .select('mileage')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setMileage(profileData.mileage || 0);
      }

      // Load all available items
      const { data: itemsData, error: itemsError } = await supabase
        .from('profile_items')
        .select('*')
        .eq('is_available', true)
        .order('item_type')
        .order('price');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Load user's purchased items
      const { data: userItemsData, error: userItemsError } = await supabase
        .from('user_items')
        .select('item_id')
        .eq('user_id', user.id);

      if (userItemsError) throw userItemsError;
      setUserItems(userItemsData.map((item: UserItem) => item.item_id));

    } catch (error) {
      console.error('Error loading shop data:', error);
      toast.error('상점 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (itemId: string, itemName: string, price: number) => {
    if (mileage < price) {
      toast.error('마일리지가 부족합니다.');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('purchase_item', {
        p_item_id: itemId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (result.success) {
        toast.success(result.message);
        loadShopData(); // Reload to update mileage and owned items
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error('구매에 실패했습니다.');
    }
  };

  const getItemsByType = (type: string) => {
    return items.filter(item => item.item_type === type);
  };

  const isOwned = (itemId: string) => {
    return userItems.includes(itemId);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'avatar_frame':
        return <Award className="h-6 w-6" />;
      case 'badge':
        return <Crown className="h-6 w-6" />;
      case 'theme_color':
        return <Palette className="h-6 w-6" />;
      case 'icon':
        return <Crown className="h-6 w-6" />;
      default:
        return <ShoppingBag className="h-6 w-6" />;
    }
  };

  const ItemCard = ({ item }: { item: ProfileItem }) => {
    const owned = isOwned(item.id);

    return (
      <Card className={`shadow-soft hover:shadow-strong transition-all duration-300 ${owned ? 'border-2 border-success/50' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                {getItemIcon(item.item_type)}
              </div>
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Coins className="h-6 w-6" />
              {item.price.toLocaleString()}
            </div>
            {owned ? (
              <Button disabled className="bg-success hover:bg-success">
                <Check className="h-4 w-4 mr-2" />
                구매완료
              </Button>
            ) : (
              <Button 
                onClick={() => handlePurchase(item.id, item.name, item.price)}
                disabled={mileage < item.price}
              >
                구매하기
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>

        <div className="mb-8 space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <ShoppingBag className="h-4 w-4" />
            프로필 꾸미기 상점
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
                아이템 상점
              </h1>
              <p className="text-xl text-muted-foreground">
                마일리지로 프로필을 꾸며보세요
              </p>
            </div>
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Coins className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">보유 마일리지</p>
                    <p className="text-3xl font-bold text-primary">{mileage.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="avatar_frame">프레임</TabsTrigger>
            <TabsTrigger value="badge">배지</TabsTrigger>
            <TabsTrigger value="theme_color">테마</TabsTrigger>
            <TabsTrigger value="icon">아이콘</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <Card className="shadow-soft">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">로딩 중...</p>
                </CardContent>
              </Card>
            ) : items.length === 0 ? (
              <Card className="shadow-soft">
                <CardContent className="py-12 text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">판매중인 아이템이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {items.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          {['avatar_frame', 'badge', 'theme_color', 'icon'].map(type => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {getItemsByType(type).map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
