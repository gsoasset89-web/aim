
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, Check, X, User, ShoppingCart, Clock, UserCheck, UserX, Search, PlusCircle, Trash2, Archive, ArchiveRestore, CheckCheck, XCircle, ListChecks, FileWarning } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { ApprovalRequest, User as AppUser } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

const ActionIcon = ({ action }: { action: ApprovalRequest['action'] }) => {
    switch (action) {
        case 'create': return <PlusCircle className="h-5 w-5 text-green-500" />;
        case 'edit': return <ShieldCheck className="h-5 w-5 text-blue-500" />;
        case 'delete': return <Trash2 className="h-5 w-5 text-red-500" />;
        case 'deactivate': return <Archive className="h-5 w-5 text-yellow-500" />;
        case 'restore': return <ArchiveRestore className="h-5 w-5 text-green-500" />;
        default: return <ShieldCheck className="h-5 w-5" />;
    }
};

const StatusBadge = ({ status }: { status: ApprovalRequest['status'] }) => {
    switch (status) {
        case 'approved': return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Approved</Badge>;
        case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
        case 'pending':
        default:
            return <Badge variant="secondary">Pending</Badge>;
    }
};

const ApprovalCard = ({ request, onApprove, onReject, isProcessing, isSelectionMode, isSelected, onSelectionChange }: { request: ApprovalRequest, onApprove: (id: string) => void, onReject: (id: string, reason: string) => void, isProcessing: boolean, isSelectionMode: boolean, isSelected: boolean, onSelectionChange: (id: string, checked: boolean) => void }) => {
    const [rejectionReason, setRejectionReason] = useState('');
    const isPending = request.status === 'pending';
    
    const formatValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return 'Not set';
        if (value instanceof Timestamp) return format(value.toDate(), 'MM/dd/yyyy');
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    if (parsed.length === 0) return 'None';
                    const label = parsed[0]?.accessoryArticle ? 'accessories' : 'individual items';
                    return `${parsed.length} ${label} specified`;
                }
            } catch (e) {}
        }
        return String(value);
    };
    
    const dataToRender = request.data || {};
    const fieldsToShow = Object.entries(dataToRender).filter(([key]) => !['retain_values', 'id', 'userId', 'status'].includes(key));

    return (
        <Card className={!isPending ? 'bg-muted/50' : ''}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                         {isSelectionMode && isPending && (
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => onSelectionChange(request.id, !!checked)}
                                className="h-5 w-5"
                            />
                        )}
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                            <ActionIcon action={request.action} />
                            <span className="capitalize">{request.action} Request</span>
                            </CardTitle>
                            <CardDescription>
                                Item: <strong>{request.itemArticle}</strong>
                            </CardDescription>
                        </div>
                    </div>
                     <StatusBadge status={request.status} />
                </div>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    <span>ID: {request.itemId}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>By: {request.requestedByUserName}</span>
                </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{request.timestamp ? formatDistanceToNow(request.timestamp.toDate(), { addSuffix: true }) : 'Just now'}</span>
                </div>
                 {(request.action === 'edit' || request.action === 'create') && fieldsToShow.length > 0 && (
                    <div className="p-2 border rounded-md bg-background overflow-hidden">
                        <h4 className="font-semibold mb-2">Details:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                           {fieldsToShow.map(([key, value]) => (
                               <li key={key} className="break-words"><strong>{key.replace(/_/g, ' ')}:</strong> {formatValue(value)}</li>
                           ))}
                        </ul>
                    </div>
                )}
                {!isPending && request.resolvedByUserName && (
                    <div className="border-t pt-4 mt-4">
                        <div className={request.status === 'approved' ? 'text-green-600' : 'text-destructive'}>
                            <div className="flex items-center gap-2 font-medium">
                                {request.status === 'approved' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                <span>{request.status === 'approved' ? 'Approved' : 'Rejected'} by {request.resolvedByUserName}</span>
                            </div>
                            {request.rejectionReason && <p className="text-xs text-muted-foreground mt-1 ml-6">Reason: {request.rejectionReason}</p>}
                        </div>
                    </div>
                )}
            </CardContent>
            {isPending && !isSelectionMode && (
                <CardFooter className="flex justify-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
                                <X className="mr-2 h-4 w-4" />
                                Reject
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reason for Rejection</AlertDialogTitle>
                                <AlertDialogDescription>Please provide a reason for rejecting this request.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                            <Input id="rejection-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g., Incorrect information" />
                            </div>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onReject(request.id, rejectionReason)} disabled={!rejectionReason}>
                                    Confirm Rejection
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button size="sm" onClick={() => onApprove(request.id)} disabled={isProcessing}>
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}

export default function ApprovalPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const approvalsQuery = useMemo(() => (firestore ? collection(firestore, 'approvals') : null), [firestore]);

  const { data: allUsers } = useCollection<AppUser>(usersQuery);
  const { data: allApprovals, isLoading: isApprovalsLoading } = useCollection<ApprovalRequest>(approvalsQuery);

  const currentUser = useMemo(() => allUsers?.find(u => u.id === authUser?.uid), [allUsers, authUser]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');
  const [isBulkRejectDialogOpen, setIsBulkRejectDialogOpen] = useState(false);
  const [isClearHistoryDialogOpen, setIsClearHistoryDialogOpen] = useState(false);

  // Perform filtering in memory to avoid index errors
  const { pendingRequests, historyRequests } = useMemo(() => {
    if (!allApprovals) return { pendingRequests: [], historyRequests: [] };
    
    const pending = allApprovals
        .filter(r => r.status === 'pending')
        .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

    const history = allApprovals
        .filter(r => r.status !== 'pending')
        .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

    return { pendingRequests: pending, historyRequests: history };
  }, [allApprovals]);

  const processedHistoryRequests = useMemo(() => {
    if (!historyRequests) return [];
    if (!historySearchQuery) return historyRequests;
    const q = historySearchQuery.toLowerCase();
    return historyRequests.filter(r => 
        (r.itemId || '').toLowerCase().includes(q) ||
        (r.itemArticle || '').toLowerCase().includes(q) ||
        (r.requestedByUserName || '').toLowerCase().includes(q) ||
        (r.resolvedByUserName || '').toLowerCase().includes(q)
    );
  }, [historyRequests, historySearchQuery]);

  const handleSelectionChange = (id: string, checked: boolean) => {
      setSelectedRequests(prev => checked ? [...prev, id] : prev.filter(reqId => reqId !== id));
  };

  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedRequests([]);
  };
  
  const handleSelectAll = () => {
      setSelectedRequests(selectedRequests.length === pendingRequests.length ? [] : pendingRequests.map(r => r.id));
  };

  const sendNotification = async (userId: string, message: string) => {
    if (!firestore) return;
    const notificationRef = collection(firestore, `users/${userId}/notifications`);
    try {
        await addDoc(notificationRef, {
            userId: userId,
            message: message,
            isRead: false,
            timestamp: serverTimestamp(),
            link: '/dashboard/approval',
        });
    } catch (error) {}
  };
  
  const processApproval = async (approvalId: string, approved: boolean, reason?: string) => {
    if (!firestore || !currentUser || !pendingRequests) return;
    
    const request = pendingRequests.find(r => r.id === approvalId);
    if (!request) return;
    
    setIsProcessing(true);
    const requestRef = doc(firestore, 'approvals', approvalId);
    const itemRef = doc(firestore, 'inventory', request.itemId);
    
    try {
        const batch = writeBatch(firestore);
        const historyRef = doc(collection(firestore, `inventory/${request.itemId}/history`));

        if (approved) {
            if (request.action === 'create' && request.data) batch.set(itemRef, request.data);
            else if (request.action === 'edit' && request.data) batch.update(itemRef, request.data);
            else if (request.action === 'delete') batch.delete(itemRef);
            else if (request.action === 'deactivate') batch.update(itemRef, { status: 'inactive' });
            else if (request.action === 'restore') batch.update(itemRef, { status: 'active' });

            batch.set(historyRef, {
              id: historyRef.id,
              userId: currentUser.id,
              userName: currentUser.name,
              action: `Request ${request.action} Approved`,
              details: `Approval for '${request.itemArticle}' processed by ${currentUser.name}.`,
              timestamp: serverTimestamp(),
            });

            batch.update(requestRef, { status: 'approved', resolvedByUserId: currentUser.id, resolvedByUserName: currentUser.name, resolvedAt: serverTimestamp() });
            await batch.commit();
            await sendNotification(request.requestedByUserId, `Request Approved: '${request.itemArticle}' has been approved.`);
            toast({ title: 'Success', description: 'Request approved.' });
        } else {
             await updateDoc(requestRef, { status: 'rejected', rejectionReason: reason, resolvedByUserId: currentUser.id, resolvedByUserName: currentUser.name, resolvedAt: serverTimestamp() });
             await sendNotification(request.requestedByUserId, `Request Rejected: '${request.itemArticle}' was rejected. Reason: ${reason}`);
             toast({ title: 'Success', description: 'Request rejected.' });
        }
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const processBulkApprovals = async (approve: boolean, reason?: string) => {
    if (!firestore || !currentUser || selectedRequests.length === 0 || !pendingRequests) return;

    setIsProcessing(true);
    const requestsToProcess = pendingRequests.filter(r => selectedRequests.includes(r.id));

    for (let i = 0; i < requestsToProcess.length; i += 10) {
        const chunk = requestsToProcess.slice(i, i + 10);
        const batch = writeBatch(firestore);
        
        chunk.forEach(request => {
            const requestRef = doc(firestore, 'approvals', request.id);
            if (approve) {
                const itemRef = doc(firestore, 'inventory', request.itemId);
                if (request.action === 'create' && request.data) batch.set(itemRef, request.data);
                else if (request.action === 'edit' && request.data) batch.update(itemRef, request.data);
                else if (request.action === 'delete') batch.delete(itemRef);
                else if (request.action === 'deactivate') batch.update(itemRef, { status: 'inactive' });
                else if (request.action === 'restore') batch.update(itemRef, { status: 'active' });
                
                batch.update(requestRef, { status: 'approved', resolvedByUserId: currentUser.id, resolvedByUserName: currentUser.name, resolvedAt: serverTimestamp() });
            } else {
                batch.update(requestRef, { status: 'rejected', rejectionReason: reason, resolvedByUserId: currentUser.id, resolvedByUserName: currentUser.name, resolvedAt: serverTimestamp() });
            }
        });

        try { await batch.commit(); } catch (e) { break; }
    }
    
    toast({ title: 'Complete', description: `${requestsToProcess.length} requests processed.` });
    setIsProcessing(false);
    setIsSelectionMode(false);
    setSelectedRequests([]);
  };

  const handleClearHistory = async () => {
    if (!firestore || !historyRequests.length) return;
    setIsProcessing(true);

    for (let i = 0; i < historyRequests.length; i += 400) {
        const chunk = historyRequests.slice(i, i + 400);
        const batch = writeBatch(firestore);
        chunk.forEach(req => batch.delete(doc(firestore, 'approvals', req.id)));
        try { await batch.commit(); } catch (e) { break; }
    }

    toast({ title: 'Success', description: 'History cleared.' });
    setIsProcessing(false);
    setIsClearHistoryDialogOpen(false);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
            <Card className="mt-4">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Pending Approvals</CardTitle>
                        <CardDescription>Review and manage pending inventory changes.</CardDescription>
                    </div>
                    {pendingRequests.length > 0 && (
                        <div className="flex items-center gap-2">
                            {isSelectionMode ? (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                        {selectedRequests.length === pendingRequests.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setIsBulkRejectDialogOpen(true)} disabled={selectedRequests.length === 0 || isProcessing}>
                                        <XCircle className="mr-2 h-4 w-4" /> Reject ({selectedRequests.length})
                                    </Button>
                                    <Button size="sm" onClick={() => processBulkApprovals(true)} disabled={selectedRequests.length === 0 || isProcessing}>
                                        <CheckCheck className="mr-2 h-4 w-4" /> Approve ({selectedRequests.length})
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={toggleSelectionMode}>Cancel</Button>
                                </>
                            ) : (
                                <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                                    <ListChecks className="mr-2 h-4 w-4"/> Select
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isApprovalsLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8" /></div>
                ) : pendingRequests.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                        {pendingRequests.map(req => (
                            <ApprovalCard 
                            key={req.id} 
                            request={req} 
                            onApprove={(id) => processApproval(id, true)} 
                            onReject={(id, reason) => processApproval(id, false, reason)} 
                            isProcessing={isProcessing} 
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedRequests.includes(req.id)}
                            onSelectionChange={handleSelectionChange}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No pending approvals.</p>
                )}
            </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="history">
            <Card className="mt-4">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Approval History</CardTitle>
                        <CardDescription>Log of all resolved requests.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {historyRequests.length > 0 && (
                            <AlertDialog open={isClearHistoryDialogOpen} onOpenChange={setIsClearHistoryDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isProcessing}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Clear History
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Clear History?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete records. This cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
                                            {isProcessing ? <Loader2 className="animate-spin"/> : 'Confirm & Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search history..."
                                className="w-full pl-8"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isApprovalsLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin h-8 w-8" /></div>
                ) : processedHistoryRequests.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                        {processedHistoryRequests.map(req => (
                            <ApprovalCard key={req.id} request={req} onApprove={() => {}} onReject={() => {}} isProcessing={isProcessing} isSelectionMode={false} isSelected={false} onSelectionChange={() => {}} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                      <FileWarning className="h-10 w-10 mb-4" />
                      <p>No processed requests found.</p>
                   </div>
                )}
            </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

       <AlertDialog open={isBulkRejectDialogOpen} onOpenChange={setIsBulkRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Rejection</AlertDialogTitle>
            <AlertDialogDescription>Reason for rejecting {selectedRequests.length} requests:</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input id="bulk-rejection-reason" value={bulkRejectionReason} onChange={(e) => setBulkRejectionReason(e.target.value)} placeholder="e.g., Incorrect information" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { processBulkApprovals(false, bulkRejectionReason); setIsBulkRejectDialogOpen(false); }} disabled={!bulkRejectionReason || isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin"/> : 'Confirm Rejection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
