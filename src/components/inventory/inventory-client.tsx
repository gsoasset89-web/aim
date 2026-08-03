
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  FilePenLine,
  MoreHorizontal,
  Search,
  Trash2,
  Loader2,
  QrCode,
  ScanLine,
  Printer,
  Archive,
  ArchiveRestore,
  History,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, isValid, getYear, parse } from 'date-fns';
import QRCode from 'qrcode';

import type { InventoryItem, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PrintDialog } from './print-dialog';
import { QRScanner } from '../qr-scanner';
import { Timestamp, collection, doc, setDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useNotification } from '@/context/notification-context';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { Checkbox } from '@/components/ui/checkbox';
import { generateInventoryReport } from '@/lib/print-utils';

const formatNumber = (val: any) => {
    if (val === undefined || val === null || val === '') return '-';
    return Number(val).toLocaleString();
};

export default function InventoryClient({
  title,
  sheetType,
}: {
  title: string;
  sheetType: 'ics' | 'par' | 'inactive_ics' | 'inactive_par';
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCenter, setFilterCenter] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterArticle, setFilterArticle] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [itemToPrint, setItemToPrint] = useState<InventoryItem[] | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // QR Preview State
  const [qrToPreview, setQrToPreview] = useState<{ url: string; article: string } | null>(null);
  const [isQRPreviewOpen, setIsQRPreviewOpen] = useState(false);
  
  const { user: authUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { setItemCount, markAsSeen } = useNotification();
  const firestore = useFirestore();

  const isInactiveSheet = sheetType.startsWith('inactive');
  const activeSheetType = sheetType.replace('inactive_', '') as 'ics' | 'par';

  const inventoryQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'inventory'),
      where('type', '==', activeSheetType),
      where('status', '==', isInactiveSheet ? 'inactive' : 'active')
    );
  }, [firestore, activeSheetType, isInactiveSheet]);

  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: items, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryQuery);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);
  const isLoading = isInventoryLoading || isUsersLoading;

  const currentUser = useMemo(() => {
    if (!authUser || !users) return null;
    return users.find(u => u.id === authUser.uid);
  }, [authUser, users]);

  useEffect(() => {
    if (items) {
      setItemCount(sheetType, items.length);
      markAsSeen(sheetType);
    }
  }, [items, sheetType, setItemCount, markAsSeen]);

  const canPerformActions = currentUser?.role !== 'View Only';
  const isAdminOrDev = currentUser?.role === 'Admin' || currentUser?.role === 'Developer';
  
  const safeParseDate = (dateInput: any): Date | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Timestamp) return dateInput.toDate();
    if (typeof dateInput === 'string') {
        const parsed = new Date(dateInput);
        if (isValid(parsed)) return parsed;
        const formatParsed = parse(dateInput, 'MM/dd/yyyy', new Date());
        return isValid(formatParsed) ? formatParsed : null;
    }
    return null;
  };

  const formatDate = (dateValue: any) => {
    const date = safeParseDate(dateValue);
    return date && isValid(date) ? format(date, 'MM/dd/yyyy') : '-';
  };

  const { filteredItems, centers, years, persons, articles } = useMemo(() => {
    const all = items || [];
    const c = new Set<string>();
    const y = new Set<string>();
    const p = new Set<string>();
    const a = new Set<string>();

    all.forEach(i => {
      if (i.responsibility_center) c.add(i.responsibility_center);
      if (i.accountable_person) p.add(i.accountable_person);
      if (i.article) a.add(i.article);
      const acq = safeParseDate(i.acquisition_date);
      if (acq) y.add(getYear(acq).toString());
    });

    const filtered = all.filter(i => {
      const matchSearch = !searchQuery || [i.id, i.article, i.accountable_person, i.responsibility_center, i.serial_number, i.property_number].some(f => (f || '').toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCenter = filterCenter === 'all' || i.responsibility_center === filterCenter;
      const matchYear = filterYear === 'all' || (i.acquisition_date && getYear(safeParseDate(i.acquisition_date)!).toString() === filterYear);
      const matchPerson = filterPerson === 'all' || i.accountable_person === filterPerson;
      const matchArticle = filterArticle === 'all' || i.article === filterArticle;
      return matchSearch && matchCenter && matchYear && matchPerson && matchArticle;
    });

    if (sortBy === 'newest') filtered.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    else if (sortBy === 'oldest') filtered.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    else filtered.sort((a, b) => (a.number || '').localeCompare(b.number || '', undefined, { numeric: true }));

    return { filteredItems: filtered, centers: Array.from(c).sort(), years: Array.from(y).sort((a,b)=>b.localeCompare(a)), persons: Array.from(p).sort(), articles: Array.from(a).sort() };
  }, [items, searchQuery, filterCenter, filterYear, filterPerson, filterArticle, sortBy]);

  const paginatedItems = useMemo(() => filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredItems, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handlePrint = () => {
    const selection = selectedIds.size > 0 ? items?.filter(i => selectedIds.has(i.id)) || [] : filteredItems;
    setItemToPrint(selection);
    setIsPrintDialogOpen(true);
  };

  const requestApproval = async (item: InventoryItem, action: 'delete' | 'deactivate' | 'restore') => {
    if (!firestore || !currentUser) return;
    try {
        await addDoc(collection(firestore, 'approvals'), {
            itemId: item.id, itemArticle: item.article, action, requestedByUserId: currentUser.id, requestedByUserName: currentUser.name, status: 'pending', timestamp: serverTimestamp(),
        });
        toast({ title: 'Request Submitted' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <Button key={1} variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(1)}>1</Button>
      );
      if (start > 2) pages.push(<span key="dots-start" className="px-1 text-muted-foreground text-xs">...</span>);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Button>
      );
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<span key="dots-end" className="px-1 text-muted-foreground text-xs">...</span>);
      pages.push(
        <Button key={totalPages} variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button>
      );
    }

    return pages;
  };

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 md:px-8 mt-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold font-headline">{title}</h1>
        <div className="flex items-center gap-2">
           <Button onClick={() => setIsScannerOpen(true)} variant="outline" size="sm" className="gap-2"><ScanLine className="h-4 w-4" /> Scan</Button>
           <Button onClick={handlePrint} variant="default" size="sm" className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ID, Article, Office..." className="pl-8 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select value={filterCenter} onValueChange={setFilterCenter}>
                  <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Center" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Centers</SelectItem>{centers.map(c=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Years</SelectItem>{years.map(y=>(<SelectItem key={y} value={y}>{y}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Person" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Persons</SelectItem>{persons.map(p=>(<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={filterArticle} onValueChange={setFilterArticle}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Article" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Articles</SelectItem>{articles.map(a=>(<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase font-bold bg-muted/30">
                <TableHead className="w-[40px] text-center sticky left-0 z-20 bg-background"><Checkbox checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id))} onCheckedChange={(c) => { const n = new Set(selectedIds); paginatedItems.forEach(i => c ? n.add(i.id) : n.delete(i.id)); setSelectedIds(n); }} /></TableHead>
                <TableHead className="w-[40px] text-center sticky left-[40px] z-20 bg-background border-r">Actions</TableHead>
                <TableHead className="w-[100px] text-center">QR Code</TableHead>
                <TableHead className="min-w-[120px]">Item ID</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Instructions</TableHead>
                <TableHead>Date Rec.</TableHead>
                <TableHead className="min-w-[200px]">Article</TableHead>
                <TableHead className="text-center" colSpan={3}>Description</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>eNGAS V1</TableHead>
                <TableHead>eNGAS V2</TableHead>
                <TableHead>Acq. Date</TableHead>
                <TableHead className="text-right">Acq. Cost</TableHead>
                <TableHead>Prop #</TableHead>
                <TableHead>Life</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Unit Val</TableHead>
                <TableHead>Bal Card</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Short Qty</TableHead>
                <TableHead>Short Val</TableHead>
                <TableHead>Center</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Prev. Cond</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Curr. Cond</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>RIS #</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>JEV #</TableHead>
                <TableHead>Qty</TableHead>
              </TableRow>
              <TableRow className="text-[9px] font-bold bg-muted/10">
                <TableHead colSpan={8}></TableHead>
                <TableHead className="border-l">Brand/Model</TableHead>
                <TableHead className="border-l">Serial #</TableHead>
                <TableHead className="border-l border-r">Particulars</TableHead>
                <TableHead colSpan={25}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="sticky left-0 bg-background"><Checkbox disabled /></TableCell>
                      <TableCell className="sticky left-[40px] bg-background border-r"><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-16 w-16 mx-auto" /></TableCell>
                      <TableCell className="font-mono text-[10px]"><Skeleton className="h-4 w-20" /></TableCell>
                      {Array.from({ length: 33 }).map((__, ci) => (<TableCell key={ci}><Skeleton className="h-4 w-full" /></TableCell>))}
                    </TableRow>
                ))
                ) : paginatedItems.length > 0 ? (
                paginatedItems.map((i) => (
                    <TableRow key={i.id} className="text-xs hover:bg-muted/50 whitespace-nowrap">
                        <TableCell className="sticky left-0 z-10 bg-background text-center"><Checkbox checked={selectedIds.has(i.id)} onCheckedChange={(c) => { const n = new Set(selectedIds); c ? n.add(i.id) : n.delete(i.id); setSelectedIds(n); }} /></TableCell>
                        <TableCell className="sticky left-[40px] z-10 bg-background border-r text-center">
                        {canPerformActions ? (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6"><MoreHorizontal className="h-3 w-3" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onSelect={() => { sessionStorage.setItem('editItemData', JSON.stringify(i)); router.push(`/dashboard/edit/${encodeURIComponent(i.id)}`); }}>Edit</DropdownMenuItem>
                                {isAdminOrDev && !isInactiveSheet && <DropdownMenuItem onSelect={async () => { const q = await QRCode.toDataURL(`${window.location.origin}/item/${i.id}`); await setDoc(doc(firestore!, 'inventory', i.id), { qr_code: q }, { merge: true }); toast({ title: 'QR Generated' }); }}>Generate QR</DropdownMenuItem>}
                                <DropdownMenuItem onSelect={() => requestApproval(i, isInactiveSheet ? 'restore' : 'deactivate')}>{isInactiveSheet ? 'Restore' : 'Deactivate'}</DropdownMenuItem>
                                <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => requestApproval(i, 'delete')} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        ) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {i.qr_code ? (
                            <button 
                              onClick={() => { setQrToPreview({ url: i.qr_code!, article: i.article }); setIsQRPreviewOpen(true); }}
                              className="transition-transform hover:scale-110 active:scale-95 p-1 border rounded bg-white shadow-sm"
                            >
                              <img src={i.qr_code} alt="QR" className="w-16 h-16 mx-auto object-contain" />
                            </button>
                          ) : (
                            <QrCode className="w-8 h-8 mx-auto opacity-10" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">{i.id}</TableCell>
                        <TableCell>{formatDate(i.deadline)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{i.deadline_instructions || '-'}</TableCell>
                        <TableCell>{formatDate(i.date_received)}</TableCell>
                        <TableCell className="font-semibold">{i.article}</TableCell>
                        <TableCell>{i.brand_model || '-'}</TableCell>
                        <TableCell className="font-mono">{i.serial_number || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={i.particulars}>{i.particulars || '-'}</TableCell>
                        <TableCell>{i.number || '-'}</TableCell>
                        <TableCell>{i.engas_property_number_v1 || '-'}</TableCell>
                        <TableCell>{i.engas_property_number_v2 || '-'}</TableCell>
                        <TableCell>{formatDate(i.acquisition_date)}</TableCell>
                        <TableCell className="text-right font-mono">₱{formatNumber(i.acquisition_cost)}</TableCell>
                        <TableCell>{i.property_number || '-'}</TableCell>
                        <TableCell>{i.est_useful_life || '-'}</TableCell>
                        <TableCell>{i.unit_of_measure || '-'}</TableCell>
                        <TableCell>{formatNumber(i.unit_value)}</TableCell>
                        <TableCell>{formatNumber(i.balance_per_card)}</TableCell>
                        <TableCell>{formatNumber(i.on_hand_per_count)}</TableCell>
                        <TableCell>{formatNumber(i.short_over_qty)}</TableCell>
                        <TableCell>{formatNumber(i.short_over_val)}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{i.responsibility_center}</TableCell>
                        <TableCell>{i.accountable_person}</TableCell>
                        <TableCell>{i.prev_condition || '-'}</TableCell>
                        <TableCell>{i.location || '-'}</TableCell>
                        <TableCell>{i.current_condition || '-'}</TableCell>
                        <TableCell>{i.remarks || '-'}</TableCell>
                        <TableCell>{i.supplier || '-'}</TableCell>
                        <TableCell>{i.po_number || '-'}</TableCell>
                        <TableCell>{i.air_ris_number || '-'}</TableCell>
                        <TableCell>{i.notes || '-'}</TableCell>
                        <TableCell>{i.jev_number || '-'}</TableCell>
                        <TableCell>{i.item_quantity || 1}</TableCell>
                    </TableRow>
                    ))
                ) : (
                <TableRow><TableCell colSpan={38} className="text-center h-24 text-muted-foreground italic">No items found.</TableCell></TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-4">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">Showing {paginatedItems.length} of {filteredItems.length} items</div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
            <div className="flex items-center gap-1">
              {renderPageNumbers()}
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>Next</Button>
            
            <div className="flex items-center gap-2 ml-2 text-sm text-muted-foreground border-l pl-4">
                <span>Go to:</span>
                <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    className="w-16 h-8 p-1 text-center text-xs"
                    value={currentPage}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= totalPages) {
                            setCurrentPage(val);
                        }
                    }}
                />
                <span>of {totalPages}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {/* QR Code Preview Dialog */}
      <Dialog open={isQRPreviewOpen} onOpenChange={setIsQRPreviewOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          <DialogHeader className="w-full">
            <DialogTitle className="text-center">QR Code Preview</DialogTitle>
            <DialogDescription className="text-center">
              Large view for: <strong>{qrToPreview?.article}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 bg-white border-2 border-primary/20 rounded-xl shadow-inner mt-4">
             {qrToPreview && (
                <img 
                  src={qrToPreview.url} 
                  alt="QR Preview" 
                  className="w-64 h-64 object-contain"
                />
             )}
          </div>
          <CardFooter className="w-full justify-center pt-6">
            <Button variant="outline" onClick={() => setIsQRPreviewOpen(false)}>Close Preview</Button>
          </CardFooter>
        </DialogContent>
      </Dialog>

      <PrintDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen} itemsToPrint={itemToPrint ?? filteredItems} title={title} />
      <QRScanner open={isScannerOpen} onOpenChange={setIsScannerOpen} onScanSuccess={(d) => { const m = d.match(/item\/([^/]+)$/); if (m) router.push(`/dashboard/edit/${m[1]}`); }} />
    </main>
  );
}
