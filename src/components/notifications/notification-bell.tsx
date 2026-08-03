
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/notifications`),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);


  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0 && firestore && user) {
      setIsUpdating(true);
      try {
        const batch = writeBatch(firestore);
        notifications?.forEach(notification => {
          if (!notification.isRead) {
            const notifRef = doc(firestore, `users/${user.uid}/notifications`, notification.id);
            batch.update(notifRef, { isRead: true });
          }
        });
        await batch.commit();
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
    setIsOpen(false);
  };
  
  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : unreadCount > 0 ? (
                <BellRing className="h-5 w-5" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
            </Button>
            {unreadCount > 0 && !isLoading && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex justify-between items-center pr-2">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="h-96">
            {isLoading || isUpdating ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="animate-spin" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map(notification => (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex flex-col items-start gap-1 whitespace-normal cursor-pointer",
                    !notification.isRead && "bg-accent/50"
                  )}
                >
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.timestamp ? formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                  </p>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                You have no new notifications.
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
