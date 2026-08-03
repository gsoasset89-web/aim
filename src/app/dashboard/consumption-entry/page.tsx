'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase';
import { DatePickerField } from '@/components/form-fields';
import { Checkbox } from '@/components/ui/checkbox';
import { syncToGoogleSheet, fetchCsvData } from '@/lib/actions';

const SHEET_REFERENCE_URL = 'https://docs.google.com/spreadsheets/d/1G4JrUI2P9KhOG-x6ErE_oDUSadh6yMNzvWpZ3YSibOE/edit?pli=1&gid=1518119111#gid=1518119111';

const formSchema = z.object({
  type: z.enum(['fuel', 'electricity', 'water']),
  office: z.string().min(1, 'Office is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  cost: z.coerce.number().min(0, 'Cost must be positive'),
  unitCost: z.coerce.number().optional(),
  date: z.date(),
  plateNumber: z.string().optional(),
  fuelType: z.string().optional(),
  tripTicket: z.string().optional(),
  orNumber: z.string().optional(),
  odometer: z.string().optional(),
  sheetApiUrl: z.string().min(1, 'URL is required'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsumptionEntryPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refPairs, setRefPairs] = useState<{ office: string; plate: string }[]>([]);
  const [isPlateManual, setIsPlateManual] = useState(false);
  const [isOfficeManual, setIsOfficeManual] = useState(false);
  
  const { toast } = useToast();
  const { user: authUser } = useUser();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'fuel',
      office: '',
      amount: 0,
      cost: 0,
      unitCost: 0,
      date: new Date(),
      plateNumber: '',
      fuelType: '',
      tripTicket: '',
      orNumber: '',
      odometer: '',
      sheetApiUrl: typeof window !== 'undefined' ? localStorage.getItem('aim_sheet_api_url') || '' : '',
    },
  });

  const selectedType = form.watch('type');
  const amount = form.watch('amount');
  const unitCost = form.watch('unitCost');

  useEffect(() => {
    if (selectedType === 'fuel') {
      const calculatedTotal = (Number(amount) || 0) * (Number(unitCost) || 0);
      form.setValue('cost', parseFloat(calculatedTotal.toFixed(2)), { shouldValidate: true });
    }
  }, [amount, unitCost, selectedType, form]);

  const availableOffices = useMemo(() => 
    Array.from(new Set(refPairs.map(m => m.office).filter(val => val && typeof val === 'string' && val.trim() !== ''))).sort()
  , [refPairs]);

  const availablePlates = useMemo(() => 
    Array.from(new Set(refPairs.map(m => m.plate).filter(val => val && typeof val === 'string' && val.trim() !== ''))).sort()
  , [refPairs]);

  const fetchReferenceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const spreadsheetIdMatch = SHEET_REFERENCE_URL.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = SHEET_REFERENCE_URL.match(/gid=([0-9]+)/);
      if (!spreadsheetIdMatch) return;
      
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetIdMatch[1]}/export?format=csv&gid=${gidMatch ? gidMatch[1] : '0'}`;
      
      const result = await fetchCsvData(exportUrl);
      
      if (result.error) throw new Error(result.error);
      if (!result.data) throw new Error('No reference data found');

      const lines = result.data.split(/\r?\n/).slice(1);
      const pairs = lines.map(line => {
          const col = line.split(',');
          return { office: col[8]?.trim() || '', plate: col[9]?.trim() || '' };
      }).filter(p => p.office && p.office !== 'OFFICE' && p.office !== '');
      
      setRefPairs(pairs);
    } catch (err: any) { 
      console.error('Reference Data Error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchReferenceData(); }, [fetchReferenceData]);

  const onSubmit = async (values: FormValues) => {
    if (!authUser) return;
    setIsSyncing(true);
    localStorage.setItem('aim_sheet_api_url', values.sheetApiUrl);

    const recordData = {
      userId: authUser.uid,
      userName: authUser.email?.split('@')[0],
      ...values,
      month: values.date.toLocaleString('default', { month: 'long' }).toUpperCase(),
      year: values.date.getFullYear(),
      day: values.date.getDate(),
    };

    try {
        await syncToGoogleSheet(values.sheetApiUrl, recordData);
        toast({ title: 'Entry Sent', description: `Data for ${values.office} synced successfully.` });
        form.reset({ ...form.getValues(), amount: 0, cost: 0, unitCost: 0, plateNumber: '', office: '' });
    } catch (e) { 
        toast({ variant: 'destructive', title: 'Sync Failed', description: 'Check your Web App URL and connectivity.' }); 
    } finally { 
        setIsSyncing(false); 
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
      <h1 className="text-3xl font-bold font-headline">Consumption Entry</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Log New Consumption</CardTitle>
              <CardDescription>Enter details to sync with your connected Google Sheet.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Utility Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="fuel">Fuel</SelectItem>
                                <SelectItem value="electricity">Electricity</SelectItem>
                                <SelectItem value="water">Water</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <DatePickerField field={field} />
                    </FormItem>
                )} />
                <FormField control={form.control} name="office" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                        <FormLabel>Office</FormLabel>
                        <div className="flex gap-2">
                            {isOfficeManual ? (
                                <FormControl><Input {...field} placeholder="Enter Office Name" /></FormControl>
                            ) : (
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={isLoading ? "Loading..." : "Select Office"} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {availableOffices.map(o => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                      ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                                <Checkbox checked={isOfficeManual} onCheckedChange={c=>setIsOfficeManual(!!c)} /> 
                                <span className="whitespace-nowrap">Manual</span>
                            </div>
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ({selectedType === 'fuel' ? 'L' : selectedType === 'water' ? 'm³' : 'kWh'})</FormLabel>
                    <FormControl><Input type="number" step="0.001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Cost (PHP)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        disabled={selectedType === 'fuel'} 
                        className={selectedType === 'fuel' ? 'bg-muted font-bold' : ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                {selectedType === 'fuel' && (
                    <>
                        <FormField control={form.control} name="plateNumber" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Plate No.</FormLabel>
                                <div className="flex gap-2">
                                    {isPlateManual ? (
                                        <FormControl><Input {...field} placeholder="Enter Plate Number" /></FormControl>
                                    ) : (
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder={isLoading ? "Loading..." : "Select Vehicle"} />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {availablePlates.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                              ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <div className="flex items-center gap-2 text-xs">
                                        <Checkbox checked={isPlateManual} onCheckedChange={c=>setIsPlateManual(!!c)} /> 
                                        <span className="whitespace-nowrap">Manual</span>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="fuelType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fuel Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Diesel">Diesel</SelectItem>
                                        <SelectItem value="Gasoline - Regular">Gasoline - Regular</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="unitCost" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Cost</FormLabel>
                              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                        )} />
                    </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSyncing} className="gap-2">
                      {isSyncing ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Sync to Sheet
                  </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" /> Connection Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField 
                  control={form.control} 
                  name="sheetApiUrl" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Web App URL</FormLabel>
                      <FormControl><Input placeholder="https://script.google.com/..." {...field} className="bg-background" /></FormControl>
                      <FormDescription>The URL provided after deploying your Apps Script.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </main>
  );
}
