import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CommonInterview from "./pages/CommonInterview";
import EssayInterview from "./pages/EssayInterview";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Community from "./pages/Community";
import Leaderboard from "./pages/Leaderboard";
import Shop from "./pages/Shop";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import UpdateAnnouncementDialog from "./components/UpdateAnnouncementDialog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UpdateAnnouncementDialog />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/common-interview" element={<CommonInterview />} />
          <Route path="/essay-interview" element={<EssayInterview />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/community" element={<Community />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/shop" element={<Shop />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
