
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import type { InventoryItem, User } from '@/lib/types';
import { isPast, isWithinInterval, addDays, format } from 'date-fns';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DeadlineReminderDialog() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const inventoryQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'inventory'),
      where('status', '==', 'active'),
      where('responsible_member_id', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: assignedItems, isLoading } = useCollection<InventoryItem>(inventoryQuery);

  const [open, setOpen] = useState(false);

  const deadlineItems = useMemo(() => {
    if (!assignedItems) return [];
    const now = new Date();
    return assignedItems.filter(item => {
      if (!item.deadline) return false;
      const deadlineDate = (item.deadline as Timestamp).toDate();
      return isPast(deadlineDate) || isWithinInterval(deadlineDate, { start: now, end: addDays(now, 7) });
    }).sort((a, b) => (a.deadline as Timestamp).toMillis() - (b.deadline as Timestamp).toMillis());
  }, [assignedItems]);

  useEffect(() => {
    // Show the dialog only if there are items and it hasn't been shown this session
    const hasBeenShown = sessionStorage.getItem('deadlineReminderShown');
    if (!isLoading && deadlineItems.length > 0 && !hasBeenShown) {
      setOpen(true);
      sessionStorage.setItem('deadlineReminderShown', 'true');
    }
  }, [deadlineItems, isLoading]);

  if (!open || deadlineItems.length === 0) {
    return null;
  }
  
  const handleItemClick = (itemId: string) => {
    setOpen(false);
    router.push(`/dashboard/edit/${itemId}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-6 w-6" />
            Deadline Reminders
          </DialogTitle>
          <DialogDescription>
            You have items with approaching or overdue deadlines. Please review them.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          <div className="space-y-4 py-4">
            {deadlineItems.map(item => {
              const deadlineDate = (item.deadline as Timestamp).toDate();
              const isOverdue = isPast(deadlineDate);
              return (
                <div 
                  key={item.id} 
                  className="p-3 border rounded-lg flex justify-between items-center hover:bg-accent cursor-pointer"
                  onClick={() => handleItemClick(item.id)}
                >
                  <div>
                    <p className="font-semibold">{item.article}</p>
                    <p className="text-sm text-muted-foreground">{item.deadline_instructions || 'No instructions provided.'}</p>
                  </div>
                  <div className="text-right">
                    {isOverdue ? (
                       <Badge variant="destructive">Overdue</Badge>
                    ) : (
                       <Badge variant="secondary" className="bg-yellow-400 text-black">Approaching</Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{format(deadlineDate, 'MMM d, yyyy')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
