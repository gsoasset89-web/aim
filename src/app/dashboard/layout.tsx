'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarContent,
  SidebarRail
} from '@/components/ui/sidebar';
import { PlusCircle, UserCircle, Pencil, FolderKanban, Users, Archive, Trash2, DatabaseZap, Download, Info, LogOut, ChevronRight, ShieldCheck, History, FileText, FileBox, LayoutDashboard, Upload, Zap, Fuel, Droplets, LineChart, ClipboardPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import NavLink from './nav-link';
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { HowToUseDialog } from '@/components/how-to-use-dialog';
import { useUser, useCollection, useFirestore, useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { NotificationProvider, useNotification } from '@/context/notification-context';
import { collection } from 'firebase/firestore';
import { ThemeToggle } from '@/components/theme-toggle';
import { signOut } from 'firebase/auth';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { DeadlineReminderDialog } from '@/components/deadline-reminder-dialog';


function CustomSidebar() {
  const { setOpenMobile, state } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  
  const isRecordsPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/par');
  const isArchivesPath = pathname.startsWith('/dashboard/inactive-ics') || pathname.startsWith('/dashboard/inactive-par');
  const isHistoryPage = pathname.startsWith('/dashboard/history/');

  const [isRecordsOpen, setIsRecordsOpen] = useState(isRecordsPath);
  const [isArchivesOpen, setIsArchivesOpen] = useState(isArchivesPath);

  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const usersQuery = useMemo(() => (firestore && authUser ? collection(firestore, 'users') : null), [firestore, authUser]);
  const { data: users } = useCollection<User>(usersQuery);
  const currentUser = useMemo(() => {
    if (!authUser || !users) return null;
    return users.find(u => u.id === authUser.uid);
  }, [authUser, users]);

  const { counts } = useNotification();
  
  const handleNavigationClick = () => {
    if (setOpenMobile) {
      setOpenMobile(false);
    }
  };

  useEffect(() => {
    setIsRecordsOpen(isRecordsPath);
    setIsArchivesOpen(isArchivesPath);
  }, [pathname, isRecordsPath, isArchivesPath]);

  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('deadlineReminderShown'); // Clear session storage on logout
        router.push('/login');
    });
  };

  const IcsIcon = () => <FileText className="h-4 w-4" />;
  const ParIcon = () => <FileBox className="h-4 w-4" />;
  
  const isEditPage = pathname.includes('/dashboard/edit/');
  const isProfilePage = pathname.includes('/dashboard/profile');
  const canAddItems = currentUser && currentUser.role !== 'View Only';
  
  return (
    <Sidebar 
      className="bg-sidebar z-40 print:hidden"
    >
      <SidebarRail />
      <SidebarHeader>
          <div className="flex items-center gap-2 text-sidebar-foreground">
            <div className="bg-white rounded-full p-1">
              <Image src="/images/gso_logo.png" alt="GSO Logo" width={32} height={32} />
            </div>
            <span className="text-xl font-semibold font-headline group-data-[collapsible=icon]:hidden">
              A.I.M
            </span>
          </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between">
        <SidebarMenu className="pl-4">
          <SidebarMenuItem>
              <NavLink href="/dashboard/overview" onClick={handleNavigationClick}>
                <LayoutDashboard />
                <span>Overview</span>
              </NavLink>
          </SidebarMenuItem>
          {canAddItems && (
            <SidebarMenuItem>
              <NavLink href="/dashboard/add-entry" onClick={handleNavigationClick}>
                <PlusCircle />
                <span>Add New Entry</span>
              </NavLink>
            </SidebarMenuItem>
          )}
          <Collapsible asChild open={isRecordsOpen} onOpenChange={setIsRecordsOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className={cn(
                      'hover:text-sidebar-accent-foreground',
                      isRecordsPath ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'
                    )}
                  >
                    <FolderKanban />
                    <span>Inventory of Active Movable Properties</span>
                    <ChevronRight className={cn('ml-auto h-4 w-4 transition-transform', isRecordsOpen && 'rotate-90', state === 'collapsed' && 'hidden')} />
                  </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent asChild>
                  <SidebarMenuSub>
                      <SidebarMenuSubItem>
                          <NavLink href="/dashboard" isSubLink={true} onClick={handleNavigationClick}>
                              <IcsIcon />
                              <span>Inventory Custodian Slip</span>
                              {counts.ics > 0 && <SidebarMenuBadge>{counts.ics}</SidebarMenuBadge>}
                          </NavLink>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                          <NavLink href="/dashboard/par" isSubLink={true} onClick={handleNavigationClick}>
                              <ParIcon />
                              <span>Property Acknowledgement</span>
                              {counts.par > 0 && <SidebarMenuBadge>{counts.par}</SidebarMenuBadge>}
                          </NavLink>
                      </SidebarMenuSubItem>
                  </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
          
          <Collapsible asChild open={isArchivesOpen} onOpenChange={setIsArchivesOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'hover:text-sidebar-accent-foreground',
                        isArchivesPath ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar.foreground'
                      )}
                    >
                      <Trash2 />
                      <span>Inventory of Unserviceable Properties</span>
                      <ChevronRight className={cn('ml-auto h-4 w-4 transition-transform', isArchivesOpen && 'rotate-90', state === 'collapsed' && 'hidden')} />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent asChild>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                            <NavLink href="/dashboard/inactive-ics" isSubLink={true} onClick={handleNavigationClick}>
                                <Archive className="h-3 w-3 mr-1" />
                                <span>Waste Material Report</span>
                                {counts.inactive_ics > 0 && <SidebarMenuBadge>{counts.inactive_ics}</SidebarMenuBadge>}
                            </NavLink>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                            <NavLink href="/dashboard/inactive-par" isSubLink={true} onClick={handleNavigationClick}>
                                <Archive className="h-3 w-3 mr-1" />
                                <span>Property Return Slip</span>
                                {counts.inactive_par > 0 && <SidebarMenuBadge>{counts.inactive_par}</SidebarMenuBadge>}
                            </NavLink>
                        </SidebarMenuSubItem>
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          <SidebarMenuItem>
              <NavLink href="/dashboard/approval" onClick={handleNavigationClick}>
                <ShieldCheck />
                <span>Approval of Requests</span>
              </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <NavLink href="/dashboard/consumption" onClick={handleNavigationClick}>
                <LineChart />
                <span>Consumption</span>
              </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <NavLink href="/dashboard/consumption-entry" onClick={handleNavigationClick}>
                <ClipboardPlus />
                <span>Consumption Entry</span>
              </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <NavLink href="/dashboard/document-tracking" onClick={handleNavigationClick}>
                <DatabaseZap />
                <span>Document Tracking</span>
              </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <NavLink href="/dashboard/downloadable-files" onClick={handleNavigationClick}>
                <Download />
                <span>Downloadable Files</span>
              </NavLink>
          </SidebarMenuItem>
           <SidebarMenuItem>
              <NavLink href="/dashboard/import" onClick={handleNavigationClick}>
                <Upload />
                <span>Import Data</span>
              </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <NavLink href="/dashboard/about" onClick={handleNavigationClick}>
                <Info />
                <span>About</span>
              </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <NavLink href="/dashboard/members" onClick={handleNavigationClick}>
                <Users />
                <span>Members</span>
              </NavLink>
          </SidebarMenuItem>
          {isEditPage && (
            <SidebarMenuItem>
              <NavLink href={pathname} onClick={handleNavigationClick}>
                <Pencil />
                <span>Edit Item</span>
              </NavLink>
            </SidebarMenuItem>
          )}
           {isHistoryPage && (
            <SidebarMenuItem>
              <NavLink href={pathname} onClick={handleNavigationClick}>
                <History />
                <span>Item History</span>
              </NavLink>
            </SidebarMenuItem>
          )}
          {isProfilePage && (
             <SidebarMenuItem>
                <NavLink href={pathname} onClick={handleNavigationClick}>
                    <UserCircle />
                    <span>My Profile</span>
                </NavLink>
             </SidebarMenuItem>
          )}
        </SidebarMenu>

        <div className="mt-auto">
            <SidebarFooter className="p-4 text-center text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                Developed by: Kyle Russel Lucero & Samuel Sta Cruz
            </SidebarFooter>
            <SidebarMenu className="pl-4">
                <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={handleLogout}
                        className='hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground'
                    >
                        <LogOut />
                        <span>Logout</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const usersQuery = useMemo(() => (firestore && authUser ? collection(firestore, 'users') : null), [firestore, authUser]);
  const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersQuery);
  const currentUser = useMemo(() => {
    if (!authUser || !users) return null;
    return users.find(u => u.id === authUser.uid);
  }, [authUser, users]);
  const hasFirebaseAuth = Boolean(auth);

  useEffect(() => {
    const sessionUser = sessionStorage.getItem('user');
    if (hasFirebaseAuth && !isUserLoading && !authUser && !sessionUser) {
      router.push('/login');
    }
  }, [authUser, hasFirebaseAuth, isUserLoading, router]);

  useEffect(() => {
    if (!isUserLoading && authUser && users) {
        const userProfile = users.find(u => u.id === authUser.uid);
        if (userProfile) {
            sessionStorage.setItem('user', JSON.stringify({ ...userProfile, id: authUser.uid }));
        }
    }
  }, [authUser, users, isUserLoading]);

  if (isUserLoading || (authUser && areUsersLoading)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <CustomSidebar />
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 md:hidden print:hidden">
            <SidebarTrigger className="text-foreground" />
            <div className="flex-1">
                <h1 className="text-lg font-semibold">A.I.M</h1>
            </div>
            <div className="flex items-center gap-2">
                <HowToUseDialog />
                <ThemeToggle />
                 <NotificationBell />
            </div>
        </header>

        {/* Desktop Content Area */}
        <SidebarInset className="hidden md:flex md:flex-col overflow-y-auto print:flex print:m-0 print:p-0">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 print:hidden">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Developed by: Kyle Russel Lucero & Samuel Sta Cruz</p>
                </div>
                <div className="relative ml-auto flex items-center gap-4">
                <HowToUseDialog />
                <ThemeToggle />
                 <NotificationBell />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="relative">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full"
                        >
                            <UserCircle className="h-6 w-6" />
                        </Button>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    {currentUser && (
                        <DropdownMenuLabel>
                        <div className="font-bold">{currentUser.name}</div>
                        <div className="text-xs text-muted-foreground">{currentUser.email}</div>
                        <div className="text-xs text-muted-foreground capitalize pt-1">{currentUser.role}</div>
                        </DropdownMenuLabel>
                    )}
                    <DropdownMenuSeparator />
                    <Link href="/dashboard/profile">
                        <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                    </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            </header>
            <DeadlineReminderDialog />
            <div className="flex-1 overflow-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
              {children}
            </div>
        </SidebarInset>

        {/* Mobile Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:hidden">
            {children}
        </main>
      </div>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
     <div className="relative flex min-h-screen">
      <SidebarProvider defaultOpen={true}>
        <NotificationProvider>
          <DashboardContent>{children}</DashboardContent>
        </NotificationProvider>
      </SidebarProvider>
    </div>
  );
}
