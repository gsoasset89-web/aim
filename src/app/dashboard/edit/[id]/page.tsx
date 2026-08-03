

'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter, useParams } from 'next/navigation';
import type { InventoryItem, User } from '@/lib/types';
import { responsibilityCenters, icsAccountCodes, parAccountCodes } from '@/lib/data';
import { Timestamp, addDoc, collection, doc, serverTimestamp, setDoc, query, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { ComboboxDialog, ComboboxDialogRC } from '@/components/combobox-dialog';
import { DatePickerField } from '@/components/form-fields';
import { parse, isValid, format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';


const itemSchema = z.object({
  id: z.string(), // Keep id for update
  type: z.enum(['ics', 'par']),
  number: z.string().optional(),
  article: z.string().min(1, 'Article is required'),
  classification: z.string().optional(),
  brand_model: z.string().optional(),
  responsibility_center: z.string().optional(),
  accountable_person: z.string().optional(),
  particulars: z.string().optional(),
  date_received: z.date().optional(),
  acquisition_date: z.date().optional(),
  deadline: z.date().optional(),
  deadline_instructions: z.string().optional(),
  responsible_member_id: z.string().optional(),
  responsible_member_name: z.string().optional(),
  item_quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').optional().default(1),
  serial_number: z.string().optional(),
  property_number: z.string().optional(),
  supplier: z.string().optional(),
  unit_value: z.coerce.number().min(0, 'Unit value must be non-negative').optional().default(0),
  acquisition_cost: z.coerce.number().min(0, 'Total value must be non-negative').optional().default(0),
  unit_of_measure: z.string().optional(),
  engas_property_number_v1: z.string().optional(),
  engas_property_number_v2: z.string().optional(),
  est_useful_life: z.preprocess((val) => String(val), z.string().optional()),
  po_number: z.preprocess((val) => String(val), z.string().optional()),
  air_ris_number: z.preprocess((val) => String(val), z.string().optional()),
  jev_number: z.preprocess((val) => String(val), z.string().optional()),
  balance_per_card: z.coerce.number().optional(),
  on_hand_per_count: z.coerce.number().optional(),
  short_over_qty: z.coerce.number().optional(),
  short_over_val: z.coerce.number().optional(),
  prev_condition: z.string().optional(),
  location: z.string().optional(),
  current_condition: z.string().optional(),
  remarks: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  individual_items: z.array(z.object({
    individualSerialNumber: z.string().optional(),
    individualPropertyNumber: z.string().optional(),
    individualEngasNumberV1: z.string().optional(),
    individualEngasNumberV2: z.string().optional(),
  })).optional(),
  item_accessories: z.array(z.object({
    accessoryArticle: z.string().optional(),
    accessoryBrandModel: z.string().optional(),
    accessoryParticulars: z.string().optional(),
    accessorySerialNumber: z.string().optional(),
    accessoryPropertyNumber: z.string().optional(),
    accessoryUnitValue: z.coerce.number().optional(),
    noAccessories: z.boolean().optional(),
  })).optional(),
  // New inactive PAR fields
  date_returned: z.date().optional(),
  date_recorded: z.date().optional(),
  prs_number: z.string().optional(),
  are_mr_number: z.string().optional(),
  iirup_number: z.string().optional(),
  attachment: z.string().optional(),
  series: z.string().optional(),
  disposition_destroyed: z.boolean().optional(),
  disposition_sale: z.boolean().optional(),
  disposition_service: z.boolean().optional(),
  disposition_salvaged: z.boolean().optional(),
  auction_date: z.date().optional(),
  auction_or_date: z.date().optional(),
  auction_or_number: z.string().optional(),
  auction_amount: z.coerce.number().optional(),
  accounting_status_dropped: z.boolean().optional(),
  accounting_status_others: z.string().optional(),
}).refine(data => {
    if (data.type === 'ics' || data.type === 'par') {
        return !!data.classification;
    }
    return true;
}, {
    message: 'Classification is required for this item type',
    path: ['classification'],
});

type ItemFormValues = z.infer<typeof itemSchema>;

// Helper function to recursively remove undefined, null, and empty strings and convert dates
const cleanData = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(item => cleanData(item)).filter(item => item !== null);
    }
    if (data instanceof Date) {
        return Timestamp.fromDate(data);
    }
    if (data !== null && typeof data === 'object' && !Array.isArray(data) && !(data instanceof Timestamp)) {
      const newObj: { [key: string]: any } = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];
          if (value !== undefined && value !== null && value !== '') {
            const cleanedValue = cleanData(value);
            if (cleanedValue !== null) {
              newObj[key] = cleanedValue;
            }
          }
        }
      }
      return Object.keys(newObj).length > 0 ? newObj : null;
    }
    return (data === '' || data === undefined) ? null : data;
};

export default function EditEntryPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [itemNotFound, setItemNotFound] = useState(false);
  const [isAccountablePersonManual, setIsAccountablePersonManual] = useState(false);
  const [isUnitOfMeasureManual, setIsUnitOfMeasureManual] = useState(false);
  const [isNumberManual, setIsNumberManual] = useState(false);
  const [originalItemData, setOriginalItemData] = useState<ItemFormValues | null>(null);

  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const inventoryQuery = useMemo(() => firestore ? query(collection(firestore, 'inventory')) : null, [firestore]);
  const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);

  const { data: inventoryItems } = useCollection<InventoryItem>(inventoryQuery);
  const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  const currentUser = useMemo(() => {
    if (!authUser || !users) return null;
    return users.find(u => u.id === authUser.uid);
  }, [authUser, users]);

  const articles = useMemo(() => {
    if (!inventoryItems) return [];
    const uniqueArticles = [...new Set(inventoryItems.map(item => item.article).filter(Boolean))];
    return uniqueArticles.map(article => ({ value: article, label: article }));
  }, [inventoryItems]);

  const accountablePersons = useMemo(() => {
    if (!users) return [];
    return users
      .filter(user => user.name)
      .map(user => ({ value: user.name, label: user.name }));
  }, [users]);
  
  const unitOfMeasures = useMemo(() => {
      if (!inventoryItems) return [];
      const uniqueUnits = [...new Set(inventoryItems.map(item => item.unit_of_measure).filter((unit): unit is string => !!unit))];
      return uniqueUnits.map(unit => ({ value: unit, label: unit }));
  }, [inventoryItems]);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
  });
  
  const itemType = form.watch('type');
  const itemStatus = form.watch('status');

  useEffect(() => {
    if (!inventoryItems) return;

    const itemData = inventoryItems.find(item => item.id === id);

    if (!itemData) {
        const sessionData = sessionStorage.getItem('editItemData');
        if (sessionData) {
            try {
                const parsedData = JSON.parse(sessionData);
                if (parsedData.id === id) {
                    loadFormData(parsedData);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse session storage data:", e);
            }
        }
        setItemNotFound(true);
        return;
    }

    loadFormData(itemData);

  }, [id, inventoryItems]);

  const loadFormData = (itemData: InventoryItem) => {
    const parseFirestoreDate = (date: any): Date | undefined => {
      if (!date) return undefined;
      if (date instanceof Timestamp) {
        return date.toDate();
      }
      return undefined;
    };
    
    const numberOrUndefined = (val: any) => (val === '' || val === null || isNaN(parseFloat(val)) ? undefined : Number(val));
    
    const safeParseJSON = (jsonString: any, defaultVal: any[] = []) => {
        if (typeof jsonString === 'string') {
          try {
            const parsed = JSON.parse(jsonString);
            return Array.isArray(parsed) ? parsed : defaultVal;
          } catch (e) {
            return defaultVal;
          }
        }
        return Array.isArray(jsonString) ? jsonString : defaultVal;
      };

    const initialFormValues = {
        ...itemData,
        date_received: parseFirestoreDate(itemData.date_received),
        acquisition_date: parseFirestoreDate(itemData.acquisition_date),
        deadline: parseFirestoreDate(itemData.deadline),
        date_returned: parseFirestoreDate(itemData.date_returned),
        date_recorded: parseFirestoreDate(itemData.date_recorded),
        auction_date: parseFirestoreDate(itemData.auction_date),
        auction_or_date: parseFirestoreDate(itemData.auction_or_date),
        item_quantity: numberOrUndefined(itemData.item_quantity) ?? 1,
        unit_value: numberOrUndefined(itemData.unit_value) ?? 0,
        acquisition_cost: numberOrUndefined(itemData.acquisition_cost) ?? 0,
        balance_per_card: numberOrUndefined(itemData.balance_per_card),
        on_hand_per_count: numberOrUndefined(itemData.on_hand_per_count),
        short_over_qty: numberOrUndefined(itemData.short_over_qty),
        short_over_val: numberOrUndefined(itemData.short_over_val),
        auction_amount: numberOrUndefined(itemData.auction_amount),
        individual_items: safeParseJSON(itemData.individual_items),
        item_accessories: safeParseJSON(itemData.item_accessories, []),
    };

    form.reset(initialFormValues);
    setOriginalItemData(initialFormValues);
  }

  useEffect(() => {
    if (itemType !== 'ics' && itemType !== 'par') {
        form.setValue('classification', '');
    }
  }, [itemType, form]);


  const { fields: individualFields, append: appendIndividual, remove: removeIndividual } = useFieldArray({
    control: form.control,
    name: "individual_items",
  });
  
  const { fields: accessoryFields, append: appendAccessory, remove: removeAccessory } = useFieldArray({
      control: form.control,
      name: "item_accessories",
  });

  const itemQuantity = form.watch('item_quantity');
  const unitValue = form.watch('unit_value');

  useEffect(() => {
    form.setValue('acquisition_cost', (itemQuantity || 0) * (unitValue || 0));
  }, [itemQuantity, unitValue, form]);

  useEffect(() => {
    const currentIndividualCount = individualFields.length;
    const currentAccessoryCount = accessoryFields.length;
    const targetCount = (itemQuantity || 0) > 1 ? (itemQuantity || 0) : 0;
    
    if (currentIndividualCount < targetCount) {
      for (let i = currentIndividualCount; i < targetCount; i++) {
        appendIndividual({ 
          individualSerialNumber: '', 
          individualPropertyNumber: '', 
          individualEngasNumberV1: '',
          individualEngasNumberV2: '',
        });
      }
    } else if (currentIndividualCount > targetCount) {
      removeIndividual(Array.from({ length: currentIndividualCount - targetCount }, (_, i) => targetCount + i));
    }

    const accessoryTargetCount = itemQuantity || 0;
    if (currentAccessoryCount < accessoryTargetCount) {
      for (let i = currentAccessoryCount; i < accessoryTargetCount; i++) {
        appendAccessory({
            accessoryArticle: '',
            accessoryBrandModel: '',
            accessoryParticulars: '',
            accessorySerialNumber: '',
            accessoryPropertyNumber: '',
            accessoryUnitValue: undefined,
            noAccessories: false,
        });
      }
    } else if (currentAccessoryCount > accessoryTargetCount) {
      removeAccessory(Array.from({ length: currentAccessoryCount - accessoryTargetCount }, (_, i) => accessoryTargetCount + i));
    }
  }, [itemQuantity, appendIndividual, removeIndividual, individualFields.length, appendAccessory, removeAccessory, accessoryFields.length]);


  const isIndividualItemDisabled = (itemQuantity || 0) <= 1;
  const areAccessoriesDisabled = (itemQuantity || 0) === 0;

  const onSubmit = async (values: ItemFormValues) => {
    setIsLoading(true);

    if (!firestore || !currentUser || !users) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or system not ready.' });
      setIsLoading(false);
      return;
    }

    const changedData: Partial<ItemFormValues> = {};
    if (originalItemData) {
        for (const key in values) {
            const typedKey = key as keyof ItemFormValues;
            const originalValue = originalItemData[typedKey];
            const newValue = values[typedKey];
            
            if (JSON.stringify(originalValue) !== JSON.stringify(newValue)) {
                (changedData as any)[typedKey] = newValue;
            }
        }
    }

    if (Object.keys(changedData).length === 0) {
        toast({ title: 'No Changes Detected', description: 'You have not made any changes to the item.' });
        setIsLoading(false);
        return;
    }
    
    // Convert dates to Timestamps before sending to Firestore
    const cleanedChangedData = cleanData({
        ...changedData,
        individual_items: JSON.stringify(values.individual_items || []),
        item_accessories: JSON.stringify(values.item_accessories || []),
    });

    try {
        const approvalRef = collection(firestore, 'approvals');
        await addDoc(approvalRef, {
            itemId: values.id,
            itemArticle: values.article,
            action: 'edit',
            requestedByUserId: currentUser.id,
            requestedByUserName: currentUser.name,
            status: 'pending',
            timestamp: serverTimestamp(),
            data: cleanedChangedData
        });

        // Notify Admins and Developers
        const usersToNotify = users.filter(u => u.role === 'Admin' || u.role === 'Developer');
        const notificationPromises = usersToNotify.map(userToNotify => {
            const notificationRef = collection(firestore, `users/${userToNotify.id}/notifications`);
            const message = `Edit Request: ${currentUser.name} wants to edit '${values.article}' (ID: ${values.id}).`;
            return addDoc(notificationRef, {
                userId: userToNotify.id,
                message: message,
                isRead: false,
                timestamp: serverTimestamp(),
                link: '/dashboard/approval',
            });
        });

        await Promise.all(notificationPromises);
        
        toast({
            title: 'Approval Request Submitted',
            description: `Your request to edit "${values.article}" has been sent for approval.`,
        });
        router.push(values.type === 'par' ? '/dashboard/par' : '/dashboard');

    } catch (error) {
        console.error("Error submitting approval request:", error);
        toast({
            variant: 'destructive',
            title: 'Request Failed',
            description: 'Could not submit approval request. Please try again.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  if (itemNotFound) {
     return (
        <main className="flex-1 flex items-center justify-center px-4 md:px-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-destructive">Item Not Found</CardTitle>
                    <CardDescription>
                        The item you are trying to edit could not be found. It may have been deleted or the link is incorrect.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
                </CardContent>
            </Card>
        </main>
     );
  }
  
  const createField = (name: keyof ItemFormValues, label: string, placeholder: string = '', type: string = 'text', className: string = '', disabled: boolean = false) => (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={placeholder}
                type={type}
                disabled={isLoading || disabled}
                value={field.value as string ?? ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
    
    const createTextarea = (name: keyof ItemFormValues, label: string, placeholder: string = '', className: string = '') => (
       <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className={className}>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={placeholder}
                  disabled={isLoading}
                  value={field.value as string ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
        )}
      />
    );

    const createDateField = (name: keyof ItemFormValues, label: string, className: string = '') => (
        <FormItem className={cn("flex flex-col", className)}>
            <FormField
              control={form.control}
              name={name}
              render={({ field }) => (
                <>
                  <FormLabel>{label}</FormLabel>
                  <DatePickerField field={field} />
                  <FormMessage />
                </>
              )}
            />
        </FormItem>
    );

    const createComboboxField = (name: keyof ItemFormValues, label: string, data: { value: string, label: string }[], placeholder: string, dialogTitle: string, className: string = '', disabled: boolean = false) => (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
             <ComboboxDialog field={field} data={data} placeholder={placeholder} dialogTitle={dialogTitle} disabled={disabled} />
            <FormMessage />
          </FormItem>
        )}
      />
    );

     const createCheckboxField = (name: keyof ItemFormValues, label: string) => (
        <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer">
                {label}
              </FormLabel>
            </FormItem>
          )}
        />
      );


  return (
    <main className="flex-1 flex-col px-4 md:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Edit Inventory Item</CardTitle>
          <CardDescription>
            Submit a request to update the details for the inventory item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Accordion
                type="multiple"
                className="w-full space-y-4"
                defaultValue={[
                  'general-info',
                  'additional-info',
                  'individual-info',
                  'accessories-info',
                  'disposition-info'
                ]}
              >
                {/* General Information */}
                <AccordionItem
                  value="general-info"
                  className="rounded-lg border px-4"
                >
                  <AccordionTrigger className="hover:no-underline text-lg font-semibold">
                    General Information
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                           <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue('classification', '');
                                }} value={field.value} disabled={isLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ics">ICS</SelectItem>
                                        <SelectItem value="par">PAR</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Number</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input
                                    {...field}
                                    disabled={isLoading || !isNumberManual}
                                    value={field.value ?? ''}
                                    />
                                </FormControl>
                                <div className="flex flex-row items-center space-x-2 space-y-0">
                                <Checkbox
                                    checked={isNumberManual}
                                    onCheckedChange={(checked) => setIsNumberManual(!!checked)}
                                    className="h-5 w-5"
                                />
                                <FormLabel className="text-xs cursor-pointer">Manual</FormLabel>
                                </div>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                      <FormField
                        control={form.control}
                        name="article"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Article</FormLabel>
                                <ComboboxDialog
                                    field={field}
                                    data={articles}
                                    placeholder="Select or type an article..."
                                    dialogTitle="Select Article"
                                    disabled={isLoading}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                       {createComboboxField(
                          'classification',
                          'Classification',
                          itemType === 'ics' ? icsAccountCodes : itemType === 'par' ? parAccountCodes : [],
                          'Select Account Code...',
                          'Select Account Code',
                          '',
                          !itemType || isLoading
                        )}
                      {createField('brand_model', 'Brand/Model')}
                      <FormField
                        control={form.control}
                        name="responsibility_center"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>
                              Responsibility Center
                            </FormLabel>
                            <ComboboxDialogRC
                              field={field}
                              data={responsibilityCenters}
                              placeholder="Select or type office..."
                              dialogTitle="Select Responsibility Center"
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="accountable_person"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Accountable Person</FormLabel>
                                <div className="flex items-center gap-2">
                                  {isAccountablePersonManual ? (
                                     <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="Enter name..."
                                          disabled={isLoading}
                                          value={field.value ?? ''}
                                        />
                                      </FormControl>
                                  ) : (
                                     <ComboboxDialog
                                        field={field}
                                        data={accountablePersons}
                                        placeholder="Select or type a person..."
                                        dialogTitle="Select Accountable Person"
                                        disabled={isLoading}
                                      />
                                  )}
                                  <div className="flex flex-row items-center space-x-2 space-y-0">
                                    <Checkbox
                                      checked={isAccountablePersonManual}
                                      onCheckedChange={(checked) => setIsAccountablePersonManual(!!checked)}
                                      className="h-5 w-5"
                                    />
                                    <FormLabel className="text-xs cursor-pointer">Manual</FormLabel>
                                  </div>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                       </div>
                       <div className="md:col-span-full">
                         <FormField
                          control={form.control}
                          name="particulars"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel>Particulars</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    disabled={isLoading}
                                    value={field.value ?? ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                          )}
                        />
                      </div>
                       {createDateField('date_received', 'Date Received')}
                       {createDateField('acquisition_date', 'Acquisition Date')}
                       <FormField
                        control={form.control}
                        name="item_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Item Quantity
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                disabled={isLoading}
                                value={field.value ?? 1}
                                min={1}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       {createField('serial_number', 'Serial Number', 'Default for all items')}
                       {createField('property_number', 'Property Number', 'Default for all items')}
                       {createField('supplier', 'Supplier')}
                       {createField('unit_value', 'Unit Value', '', 'number')}
                       <FormField
                        control={form.control}
                        name="acquisition_cost"
                        render={({ field }) => (
                           <FormItem>
                            <FormLabel>Acquisition Cost</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                disabled
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="unit_of_measure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit of Measure</FormLabel>
                            <div className="flex items-center gap-2">
                              {isUnitOfMeasureManual ? (
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter unit..."
                                    disabled={isLoading}
                                    value={field.value ?? ''}
                                  />
                                </FormControl>
                              ) : (
                                <ComboboxDialog
                                  field={field}
                                  data={unitOfMeasures}
                                  placeholder="Select or type a unit..."
                                  dialogTitle="Select Unit of Measure"
                                  disabled={isLoading}
                                />
                              )}
                              <div className="flex flex-row items-center space-x-2 space-y-0">
                                <Checkbox
                                  checked={isUnitOfMeasureManual}
                                  onCheckedChange={(checked) => setIsUnitOfMeasureManual(!!checked)}
                                  className="h-5 w-5"
                                />
                                <FormLabel className="text-xs cursor-pointer">Manual</FormLabel>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Additional Item Information */}
                <AccordionItem
                  value="additional-info"
                  className="rounded-lg border px-4"
                >
                  <AccordionTrigger className="hover:no-underline text-lg font-semibold">
                    Additional Item Information
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {createField('engas_property_number_v1', 'eNGAS Property Number V1', 'Default for all items')}
                       {createField('engas_property_number_v2', 'eNGAS Property Number V2', 'Default for all items')}
                       {createField('est_useful_life', 'Estimated Useful Life')}
                       {createField('po_number', 'PO Number')}
                       {createField('air_ris_number', 'AIR/RIS Number')}
                       {createField('jev_number', 'JEV Number')}
                       {createField('balance_per_card', 'Balance Per Card', '', 'number')}
                       {createField('on_hand_per_count', 'On Hand Per Count', '', 'number')}
                       {createField('short_over_qty', 'Shortage/Overage Qty', '', 'number')}
                       {createField('short_over_val', 'Shortage/Overage Value', '', 'number')}
                       {createField('prev_condition', 'Previous Condition')}
                       {createField('location', 'Location/Whereabouts')}
                       {createField('current_condition', 'Current Condition')}
                       {createTextarea('remarks', 'Remarks', '', 'md:col-span-full')}
                       {createTextarea('notes', 'Notes', '', 'md:col-span-full')}
                       {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                        <>
                            <div className="md:col-span-full lg:col-span-1">
                                {createDateField('deadline', 'Set Deadline')}
                            </div>
                            <div className="md:col-span-full lg:col-span-2">
                                {createTextarea('deadline_instructions', 'Deadline Instructions')}
                            </div>
                            <div className="md:col-span-full">
                                <FormField
                                    control={form.control}
                                    name="responsible_member_id"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Responsible Member</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                if (value === 'UNASSIGNED') {
                                                    field.onChange('');
                                                    form.setValue('responsible_member_name', '');
                                                } else {
                                                    const selectedUser = users?.find(u => u.id === value);
                                                    field.onChange(value);
                                                    form.setValue('responsible_member_name', selectedUser?.name || '');
                                                }
                                            }}
                                            value={field.value || ''}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Assign a member to this task..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="UNASSIGNED">None</SelectItem>
                                                {users?.map(user => (
                                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </>
                       )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Disposition Information */}
                <AccordionItem
                    value="disposition-info"
                    className="rounded-lg border px-4"
                    hidden={itemStatus !== 'inactive'}
                >
                    <AccordionTrigger className="hover:no-underline text-lg font-semibold">
                        Disposition & Return Details
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {createDateField('date_returned', 'Date Returned')}
                            {createDateField('date_recorded', 'Date Recorded')}
                            {createField('prs_number', 'PRS #')}
                            {createField('iirup_number', 'IIRUP #')}
                            {createField('are_mr_number', 'ARE/MR Number')}
                            {createField('series', 'Series')}
                            {createField('attachment', 'Attachment')}
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-medium text-md">Mode of Disposition</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {createCheckboxField('disposition_destroyed', 'Destroyed & Thrown')}
                                {createCheckboxField('disposition_sale', 'Sale')}
                                {createCheckboxField('disposition_service', 'Continued in Service')}
                                {createCheckboxField('disposition_salvaged', 'To Be Salvaged')}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-medium text-md">Auction Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {createDateField('auction_date', 'Auction Date')}
                                {createDateField('auction_or_date', 'OR Date')}
                                {createField('auction_or_number', 'OR Number')}
                                {createField('auction_amount', 'Amount', '', 'number')}
                            </div>
                        </div>
                         <div className="space-y-4">
                            <h4 className="font-medium text-md">Status/Remarks (Accounting Office)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {createCheckboxField('accounting_status_dropped', 'Dropped')}
                                {createField('accounting_status_others', 'Others', 'Specify other status')}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Individual Item Information */}
                 <AccordionItem
                  value="individual-info"
                  className="rounded-lg border px-4"
                  hidden={isIndividualItemDisabled}
                >
                  <AccordionTrigger className="hover:no-underline text-lg font-semibold">
                    Individual Item Information
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {individualFields.map((field, index) => (
                      <div key={field.id} className="p-4 rounded-md border">
                        <h4 className="font-semibold mb-4">Item #{index + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name={`individual_items.${index}.individualSerialNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Serial Number</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ''} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`individual_items.${index}.individualPropertyNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Property Number</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ''} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`individual_items.${index}.individualEngasNumberV1`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>eNGAS Number V1</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ''} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={form.control}
                            name={`individual_items.${index}.individualEngasNumberV2`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>eNGAS Number V2</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value ?? ''} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
                
                {/* Item Accessories Information */}
                <AccordionItem
                  value="accessories-info"
                  className="rounded-lg border px-4"
                  hidden={areAccessoriesDisabled}
                >
                  <AccordionTrigger className="hover:no-underline text-lg font-semibold">
                    Item Accessories Information
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {accessoryFields.map((field, index) => {
                      const noAccessories = form.watch(`item_accessories.${index}.noAccessories`);
                      return (
                        <div key={field.id} className="p-4 rounded-md border">
                           <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Accessories for Item #{index + 1}</h4>
                             <FormField
                              control={form.control}
                              name={`item_accessories.${index}.noAccessories`}
                              render={({ field: noAccField }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={noAccField.value}
                                      onCheckedChange={(checked) => {
                                        noAccField.onChange(checked);
                                        if (checked) {
                                            form.setValue(`item_accessories.${index}.accessoryArticle`, '');
                                            form.setValue(`item_accessories.${index}.accessoryBrandModel`, '');
                                            form.setValue(`item_accessories.${index}.accessoryParticulars`, '');
                                            form.setValue(`item_accessories.${index}.accessorySerialNumber`, '');
                                            form.setValue(`item_accessories.${index}.accessoryPropertyNumber`, '');
                                            form.setValue(`item_accessories.${index}.accessoryUnitValue`, undefined);
                                        }
                                      }}
                                      className="h-5 w-5"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm cursor-pointer">No Accessories</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField control={form.control} name={`item_accessories.${index}.accessoryArticle`} render={({ field }) => (
                                <FormItem><FormLabel>Article</FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isLoading || noAccessories} className="disabled:opacity-70" /></FormControl><FormMessage /></FormItem>
                              )} />
                            <FormField control={form.control} name={`item_accessories.${index}.accessoryBrandModel`} render={({ field }) => (
                                <FormItem><FormLabel>Brand/Model</FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isLoading || noAccessories} className="disabled:opacity-70" /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={form.control} name={`item_accessories.${index}.accessoryParticulars`} render={({ field }) => (
                                <FormItem className="md:col-span-full"><FormLabel>Particulars</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} disabled={isLoading || noAccessories} className="disabled:opacity-70" /></FormControl><FormMessage /></FormItem>
                              )} />
                            <FormField control={form.control} name={`item_accessories.${index}.accessorySerialNumber`} render={({ field }) => (
                                <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isLoading || noAccessories} className="disabled:opacity-70" /></FormControl><FormMessage /></FormItem>
                              )} />
                            <FormField control={form.control} name={`item_accessories.${index}.accessoryPropertyNumber`} render={({ field }) => (
                                <FormItem><FormLabel>Property Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} disabled={isLoading || noAccessories} className="disabled:opacity-70" /></FormControl><FormMessage /></FormItem>
                              )} />
                            <FormField control={form.control} name={`item_accessories.${index}.accessoryUnitValue`} render={({ field }) => (
                                <FormItem><FormLabel>Unit Value</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} disabled={isLoading || noAccessories} className="disabled:opacity-70" /></FormControl><FormMessage /></FormItem>
                              )} />
                          </div>
                        </div>
                      )
                    })}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="flex justify-end gap-4 pt-4">
                 <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                    Cancel
                 </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    'Submit for Approval'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
