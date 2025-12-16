-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for auto-assigning user role
CREATE OR REPLACE TRIGGER on_auth_user_role_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Create trigger for migrating user data
CREATE OR REPLACE TRIGGER on_auth_user_migrate
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.migrate_user_data();