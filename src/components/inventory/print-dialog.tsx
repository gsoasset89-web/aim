'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Printer, LayoutPanelLeft, CheckSquare, Plus, Trash2, UserCheck } from 'lucide-react';
import type { InventoryItem } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { generateInventoryReport, generateInventoryCountForm, formatDateForDisplay, type ReportColumn, type Signatory } from '@/lib/print-utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsToPrint: InventoryItem[];
  title: string;
}

const AVAILABLE_COLUMNS: ReportColumn[] = [
  { header: 'ID', dataKey: 'id' },
  { header: 'Article', dataKey: 'article' },
  { header: 'Brand/Model', dataKey: 'brand_model' },
  { header: 'Serial No.', dataKey: 'serial_number' },
  { header: 'Particulars', dataKey: 'particulars' },
  { header: 'Number', dataKey: 'number' },
  { header: 'ARE/MR #', dataKey: 'are_mr_number' },
  { header: 'eNGAS V1', dataKey: 'engas_property_number_v1' },
  { header: 'eNGAS V2', dataKey: 'engas_property_number_v2' },
  { header: 'Acq. Date', dataKey: 'acquisition_date' },
  { header: 'Acq. Cost', dataKey: 'acquisition_cost' },
  { header: 'Prop #', dataKey: 'property_number' },
  { header: 'Center', dataKey: 'responsibility_center' },
  { header: 'Person', dataKey: 'accountable_person' },
  { header: 'Condition', dataKey: 'current_condition' },
  { header: 'Remarks', dataKey: 'remarks' },
];

const DEFAULT_SIGNATORIES: Signatory[] = [
  { label: 'GSO Representative', name: '' },
  { label: 'Accounting Representative', name: '' },
  { label: 'End-user', name: '' },
  { label: 'Inventory Committee', name: '' },
  { label: 'Witness (COA)', name: '' },
];

export function PrintDialog({
  open,
  onOpenChange,
  itemsToPrint,
  title,
}: PrintDialogProps) {
  const [printFormat, setPrintFormat] = useState<'report' | 'count'>('report');
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    AVAILABLE_COLUMNS.slice(0, 10).map(c => c.dataKey)
  );
  const [signatories, setSignatories] = useState<Signatory[]>(DEFAULT_SIGNATORIES);

  const toggleColumn = (key: string) => {
    setSelectedColumnKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const addSignatory = () => {
    setSignatories([...signatories, { label: 'Official', name: '' }]);
  };

  const removeSignatory = (index: number) => {
    setSignatories(signatories.filter((_, i) => i !== index));
  };

  const updateSignatory = (index: number, field: keyof Signatory, value: string) => {
    const next = [...signatories];
    next[index][field] = value;
    setSignatories(next);
  };

  const selectedColumns = useMemo(() => 
    AVAILABLE_COLUMNS.filter(c => selectedColumnKeys.includes(c.dataKey)),
  [selectedColumnKeys]);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const officeName = itemsToPrint[0]?.responsibility_center || 'General Services Office';
      const doc = (printFormat === 'count') 
        ? generateInventoryCountForm(itemsToPrint, officeName, signatories, selectedColumns) 
        : generateInventoryReport(itemsToPrint, title, selectedColumns);
        
      doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setIsPrinting(false);
      onOpenChange(false);
    }
  };

  // Preview data: only first 5 items
  const previewItems = useMemo(() => itemsToPrint.slice(0, 5), [itemsToPrint]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Print Settings & Preview
          </DialogTitle>
          <DialogDescription>
            Configure your document format, columns, and signatories before generating the PDF for {title}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-t mt-4">
          {/* Left Panel: Settings */}
          <div className="w-full md:w-80 border-r bg-muted/30 p-6 space-y-6 overflow-y-auto">
            <section className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <LayoutPanelLeft className="h-3 w-3" /> Report Format
              </Label>
              <RadioGroup value={printFormat} onValueChange={(v: any) => setPrintFormat(v)} className="grid gap-2">
                <div className={`flex items-center space-x-3 p-3 rounded-lg border bg-background transition-all ${printFormat === 'report' ? 'border-primary ring-1 ring-primary' : ''}`}>
                  <RadioGroupItem value="report" id="report" />
                  <Label htmlFor="report" className="flex-1 cursor-pointer">
                    <span className="font-semibold block">Inventory Report</span>
                    <span className="text-[10px] text-muted-foreground">Standard customizable layout</span>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-3 rounded-lg border bg-background transition-all ${printFormat === 'count' ? 'border-accent ring-1 ring-accent' : ''}`}>
                  <RadioGroupItem value="count" id="count" />
                  <Label htmlFor="count" className="flex-1 cursor-pointer">
                    <span className="font-semibold block">Inventory Count Form</span>
                    <span className="text-[10px] text-muted-foreground">Official government template</span>
                  </Label>
                </div>
              </RadioGroup>
            </section>

            <section className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-3 w-3" /> Select Columns
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {AVAILABLE_COLUMNS.map((column) => (
                  <div key={column.dataKey} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`col-${column.dataKey}`} 
                      checked={selectedColumnKeys.includes(column.dataKey)}
                      onCheckedChange={() => toggleColumn(column.dataKey)}
                    />
                    <label 
                      htmlFor={`col-${column.dataKey}`}
                      className="text-xs font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {column.header}
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {printFormat === 'count' && (
              <section className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-3 w-3" /> Signatories
                  </Label>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addSignatory}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {signatories.map((sig, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-background space-y-2 relative group">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeSignatory(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Title / Role</Label>
                        <Input 
                          value={sig.label} 
                          onChange={(e) => updateSignatory(idx, 'label', e.target.value)}
                          className="h-7 text-[10px] p-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Full Name</Label>
                        <Input 
                          placeholder="Leave blank if unknown"
                          value={sig.name} 
                          onChange={(e) => updateSignatory(idx, 'name', e.target.value)}
                          className="h-7 text-[10px] p-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Panel: Live Preview */}
          <div className="flex-1 p-6 bg-background overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Document Preview (Draft)</Label>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">Legal Landscape</span>
            </div>
            
            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col shadow-inner bg-white dark:bg-black/20">
               <div className="p-8 text-center space-y-1 border-b bg-muted/10">
                  <h3 className="font-bold text-sm">{printFormat === 'count' ? 'REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT' : title.toUpperCase() + ' REPORT'}</h3>
                  <p className="text-[10px] text-muted-foreground">Generated on: {format(new Date(), 'MMMM d, yyyy')}</p>
               </div>
               
               <ScrollArea className="flex-1">
                 <div className="p-4">
                    <div className="space-y-8">
                       <Table className="text-[8px] border">
                         <TableHeader>
                           <TableRow className="bg-muted/50">
                             {selectedColumns.map(col => (
                               <TableHead key={col.dataKey} className="font-bold h-8 border text-center">{col.header.toUpperCase()}</TableHead>
                             ))}
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {previewItems.map((item, idx) => (
                             <TableRow key={idx}>
                               {selectedColumns.map(col => {
                                 let value: any = (item as any)[col.dataKey];
                                 if (col.dataKey === 'acquisition_date' || col.dataKey === 'date_received') {
                                   value = formatDateForDisplay(value);
                                 }
                                 if (col.dataKey === 'acquisition_cost' || col.dataKey === 'unit_value') {
                                   value = Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
                                 }
                                 return (
                                   <TableCell key={col.dataKey} className="border p-2 truncate max-w-[100px] h-8">
                                     {String(value || '')}
                                   </TableCell>
                                 );
                               })}
                             </TableRow>
                           ))}
                           <TableRow>
                             <TableCell colSpan={selectedColumns.length} className="text-center py-4 bg-muted/5 italic opacity-40">
                               ... showing {itemsToPrint.length} total items in PDF ...
                             </TableCell>
                           </TableRow>
                         </TableBody>
                       </Table>
                       
                       {printFormat === 'count' && (
                         <div className="space-y-4">
                            <p className="text-[9px] font-bold">Signatories:</p>
                            <div className="grid grid-cols-2 gap-4">
                               {signatories.map((sig, idx) => (
                                 <div key={idx} className="space-y-1">
                                    <p className="text-[8px] font-semibold">{sig.label}:</p>
                                    <p className="text-[8px] border-b border-black pt-2 pb-1">{sig.name || ' '}</p>
                                 </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 </div>
               </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint} disabled={isPrinting} className="gap-2 min-w-[150px]">
            {isPrinting ? <Loader2 className="animate-spin h-4 w-4" /> : <Printer className="h-4 w-4" />}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}