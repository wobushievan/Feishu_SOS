import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList } from '@/components/ui/breadcrumb';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Outlet, Link, useLocation, NavLink } from 'react-router-dom';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { useAppInfo } from '@lark-apaas/client-toolkit/hooks/useAppInfo';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Shield, List, LogOut, User, ChevronRight, Languages, Globe } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 导航项配置
const navItems = [
  { path: '/events', label: 'Events', icon: List },
  { path: '/translations', label: 'Translations', icon: Languages },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };
  
  return (
    <Select value={i18n.language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[100px] h-8 text-xs">
        <Globe className="w-3.5 h-3.5 mr-1.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">简体中文</SelectItem>
      </SelectContent>
    </Select>
  );
};

const LayoutContent = () => {
  const location = useLocation();
  const userInfo = useCurrentUserProfile();
  const { appName } = useAppInfo();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // 计算当前激活的页面标题
  const activeTitle = useMemo(() => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/events/')) return 'Event Details';
    if (currentPath === '/events') return 'Events';
    if (currentPath === '/translations') return 'Translation Management';
    return appName || 'Safety Check';
  }, [location.pathname, appName]);

  const handleLogout = async () => {
    try {
      const dataloom = await getDataloom();
      const result = await dataloom.service.session.signOut();
      if (result.error) {
        logger.error('退出登录失败:', result.error.message);
        return;
      }
      window.location.reload();
    } catch (error) {
      logger.error('退出登录失败:', error);
    }
  };

  const isLoggedIn = !!userInfo?.user_id;
  const userDisplayName = userInfo?.name || '游客';
  const userAvatar = userInfo?.avatar;

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Shield className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">{appName || 'Safety Check'}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)}
                    >
                      <Link to={item.path}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={userAvatar} alt={userDisplayName} />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {userDisplayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-semibold">{userDisplayName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {isLoggedIn ? 'Signed In' : 'Guest'}
                      </span>
                    </div>
                    <ChevronRight className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                  align="start"
                >
                  {isLoggedIn ? (
                    <DropdownMenuItem onClick={() => setIsLogoutDialogOpen(true)}>
                      <LogOut className="mr-2 size-4" />
                      Sign Out
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={async () => {
                      const dataloom = await getDataloom();
                      dataloom.service.session.redirectToLogin();
                    }}>
                      <User className="mr-2 size-4" />
                      Sign In
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb className="self-center">
              <BreadcrumbList>
                <BreadcrumbItem className="text-foreground font-medium text-lg">
                  {activeTitle}
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <LanguageSwitcher />
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </>
  );
};

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
