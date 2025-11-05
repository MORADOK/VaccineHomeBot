import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Bot,
  UserPlus,
  Settings,
  Calendar,
  FileText,
  Activity,
  Shield,
  Stethoscope,
  ClipboardList,
  History,
  Search
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';

const navigationItems = [
  {
    title: 'หน้าหลัก',
    url: '/',
    icon: Home,
    roles: ['admin']
  },
  {
    title: 'จัดการนัดผู้ป่วย',
    url: '/staff-portal',
    icon: Calendar,
    roles: ['admin', 'healthcare_staff']
  },
  {
    title: 'รายการผู้ป่วย',
    url: '/patient-registrations',
    icon: ClipboardList,
    roles: ['admin', 'healthcare_staff']
  },
  {
    title: 'นัดหมายที่กำลังจะถึง',
    url: '/next-appointments',
    icon: Calendar,
    roles: ['admin', 'healthcare_staff']
  },
  {
    title: 'แก้ไขนัดคนไข้',
    url: '/edit-appointments',
    icon: FileText,
    roles: ['admin', 'healthcare_staff']
  },
  {
    title: 'ประวัติการฉีดวัคซีน',
    url: '/past-vaccinations',
    icon: History,
    roles: ['admin', 'healthcare_staff']
  },
  {
    title: 'จัดการเจ้าหน้าที่',
    url: '/manage-staff',
    icon: Users,
    roles: ['admin']
  },
  {
    title: 'LINE Bot',
    url: '/LineBot',
    icon: Bot,
    roles: ['admin']
  },
  {
    title: 'ตรวจสอบ LIFF',
    url: '/liff-checker',
    icon: Search,
    roles: ['admin']
  },
];

const adminItems = [
  {
    title: 'ระบบผู้ดูแล',
    url: '/admin',
    icon: Shield,
    roles: ['admin']
  }
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [userRole, setUserRole] = useState<string>('admin'); // Default to admin

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          // Check if user is admin
          const { data: isAdmin } = await supabase
            .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

          // Check if user is healthcare staff
          const { data: isStaff } = await supabase
            .rpc('is_healthcare_staff', { _user_id: session.user.id });

          if (isAdmin) {
            setUserRole('admin');
          } else if (isStaff) {
            setUserRole('healthcare_staff');
          } else {
            setUserRole('guest');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setUserRole('admin'); // Default to admin on error
        }
      }
    };

    checkUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Filter menu items based on user role
  const filteredNavigationItems = navigationItems.filter(item =>
    item.roles.includes(userRole)
  );

  const filteredAdminItems = adminItems.filter(item =>
    item.roles.includes(userRole)
  );

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return isActive(path) 
      ? "nav-link-active" 
      : "nav-link";
  };

  return (
    <Sidebar className="glass-sidebar border-r border-border/20">
      <SidebarContent className="bg-gradient-sidebar">
        {/* Logo Section */}
        <div className="p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
              <img 
                src={`${import.meta.env.BASE_URL}images/hospital-logo.png`}
                alt="โลโก้โรงพยาบาลโฮม"
                className="w-full h-full object-contain object-center"
              />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">โรงพยาบาลโฮม</h2>
              <p className="text-xs text-muted-foreground">ระบบจัดการวัคซีน</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        {filteredNavigationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-primary font-semibold">
              เมนูหลัก
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClassName(item.url)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Navigation */}
        {filteredAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-medical-error font-semibold">
              ผู้ดูแลระบบ
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClassName(item.url)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Quick Stats */}
        <div className="mt-auto p-6">
          <div className="card-glass">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto text-primary mb-2" />
              <h3 className="font-semibold text-sm text-foreground mb-1">
                ระบบทำงานปกติ
              </h3>
              <p className="text-xs text-muted-foreground">
                อัปเดตล่าสุด: วันนี้
              </p>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}