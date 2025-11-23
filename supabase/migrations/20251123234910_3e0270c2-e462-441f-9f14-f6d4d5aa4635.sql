-- Create trigger to automatically update leaderboard ranks
CREATE OR REPLACE TRIGGER trigger_update_leaderboard_on_insert
AFTER INSERT OR UPDATE ON public.monthly_leaderboard
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_update_leaderboard();

CREATE OR REPLACE TRIGGER trigger_update_leaderboard_on_delete
AFTER DELETE ON public.monthly_leaderboard
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_update_leaderboard();