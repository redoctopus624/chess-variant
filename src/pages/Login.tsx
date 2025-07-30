import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Login() {
  const { session, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && !isLoading) {
      navigate('/');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-lg text-muted-foreground">Loading authentication...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg bg-card border border-gravity-primary/20">
        <h2 className="text-3xl font-bold text-center text-gravity-primary mb-6">Welcome to Gravity Chess</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers for now
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--accent))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--ring))',
                  inputBorderFocus: 'hsl(var(--ring))',
                  inputText: 'hsl(var(--foreground))',
                  defaultButtonBackground: 'hsl(var(--primary))',
                  defaultButtonBackgroundHover: 'hsl(var(--primary-foreground))',
                  defaultButtonBorder: 'hsl(var(--primary))',
                  defaultButtonText: 'hsl(var(--primary-foreground))',
                  anchorText: 'hsl(var(--primary))',
                  anchorTextHover: 'hsl(var(--accent))',
                },
              },
            },
          }}
          theme="dark" // Using dark theme to match app's background
        />
      </div>
    </div>
  );
}

export default Login;