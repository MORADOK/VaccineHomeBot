import { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AppLayoutProps {
  children: React.ReactNode;
  user?: any;
  showSidebar?: boolean;
  title?: string;
}

export function AppLayout({ children, user, showSidebar = true, title }: AppLayoutProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } else {
      navigate('/auth');
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
      });
    }
  };

  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-hero">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
            <div className="flex items-center justify-between h-full px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-primary hover:bg-primary/10 transition-colors" />
                {title && (
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                  </div>
                )}
              </div>
              
              {user && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-accent/50 border border-border/30">
                    <User className="h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    ออกจากระบบ
                  </Button>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}