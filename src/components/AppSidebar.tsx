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
  Stethoscope
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

const navigationItems = [
  {
    title: 'หน้าหลัก',
    url: '/',
    icon: Home,
    roles: ['admin']
  },
  {
    title: 'จัดการเจ้าหน้าที่',
    url: '/staff-portal',
    icon: Users,
    roles: ['admin', 'healthcare_staff']
  },
  {
    title: 'LINE Bot',
    url: '/LineBot',
    icon: Bot,
    roles: ['admin']
  },
  {
    title: 'ลงทะเบียนผู้ป่วย',
    url: '/PatientPortal',
    icon: UserPlus,
    roles: ['admin', 'healthcare_staff']
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
                src="@/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png" 
                alt="โลโก้โรงพยาบาลโฮม"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">โรงพยาบาลโฮม</h2>
              <p className="text-xs text-muted-foreground">ระบบจัดการวัคซีน</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold">
            เมนูหลัก
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
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

        {/* Admin Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-medical-error font-semibold">
            ผู้ดูแลระบบ
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
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