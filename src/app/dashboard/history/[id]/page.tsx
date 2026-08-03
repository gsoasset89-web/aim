
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore } from '@/firebase';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import type { HistoryEvent, InventoryItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const firestore = useFirestore();

  const itemDocRef = useMemo(() => (firestore && id ? doc(firestore, 'inventory', id) : null), [firestore, id]);
  const historyQuery = useMemo(() => (firestore && id ? query(collection(firestore, `inventory/${id}/history`), orderBy('timestamp', 'desc')) : null), [firestore, id]);

  const { data: item, isLoading: isItemLoading } = useDoc<InventoryItem>(itemDocRef);
  const { data: history, isLoading: isHistoryLoading } = useCollection<HistoryEvent>(historyQuery);

  const isLoading = isItemLoading || isHistoryLoading;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate();
      return format(date, "MM/dd/yyyy 'at' h:mm:ss a");
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {isItemLoading ? (
            <Skeleton className="h-7 w-64" />
          ) : (
            <h1 className="text-2xl font-semibold font-headline">
              History for: {item?.article || 'Item'}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">Item ID: {id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>A chronological log of all changes made to this inventory item.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[65vh]">
            <div className="relative pl-6">
              {/* Vertical line for the timeline */}
              <div className="absolute left-6 top-0 h-full w-0.5 bg-border" />

              {isLoading ? (
                <div className="space-y-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="relative mt-1 h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-8">
                  {history.map((event, index) => (
                    <div key={event.id} className="relative flex items-start gap-4">
                      <div className="absolute left-[-2px] top-[5px] h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                      <div className="ml-8 w-full">
                        <p className="font-semibold text-primary">{event.action}</p>
                        <p className="mt-1 text-sm text-muted-foreground break-words">{event.details}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          by {event.userName} on {formatDate(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  No history found for this item.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </main>
  );
}
