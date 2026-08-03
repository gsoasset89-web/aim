
'use client';

import { useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export default function ItemDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const firestore = useFirestore();

  const itemDocRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'inventory', id);
  }, [firestore, id]);

  const { data: item, isLoading, error } = useDoc<InventoryItem>(itemDocRef);
  
  const safeParseDate = (dateInput: string | Timestamp | undefined): Date | null => {
    if (!dateInput) return null;
    if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput);
      return isValid(parsed) ? parsed : null;
    }
    if (typeof dateInput === 'object' && 'seconds' in dateInput) {
      return (dateInput as Timestamp).toDate();
    }
    return null;
  };

  const formatDateForDisplay = (dateValue: string | Timestamp | undefined): string => {
    const date = safeParseDate(dateValue);
    if (!date || !isValid(date)) return 'N/A';
    return format(date, 'MM/dd/yyyy');
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };
  
  const formatPropertyNumber = (propNum: string | undefined): string => {
    if (!propNum) return '';
    if (propNum.includes('T') && propNum.includes('Z')) {
        return propNum.split('T')[0];
    }
    return propNum;
  };

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b">
      <p className="w-full sm:w-1/3 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="w-full sm:w-2/3 text-base font-semibold">{value || 'N/A'}</p>
    </div>
  );

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden p-4">
        <video
            src="/video/backlogreg.mp4"
            autoPlay
            loop
            muted
            className="fixed z-0 w-auto min-w-full min-h-full max-w-none object-cover"
        />
        <div className="fixed inset-0 z-10 bg-black opacity-50"></div>
        <Card className="w-full max-w-2xl z-20 bg-white/10 backdrop-blur-lg border border-primary/30 text-white shadow-2xl shadow-primary/20 animate-in fade-in-0 zoom-in-95 duration-500">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="bg-white rounded-full p-2 flex items-center justify-center">
                        <Image src="/images/gso_logo.png" alt="GSO Logo" width={64} height={64} />
                    </div>
                </div>
                <CardTitle className="text-2xl text-white">Item Details</CardTitle>
                <CardDescription className="text-gray-300">
                    Asset information from the General Services Office.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center text-destructive">
                        <p>Error loading item details.</p>
                        <p className="text-sm">{error.message}</p>
                    </div>
                ) : !item ? (
                     <div className="text-center text-lg font-semibold text-gray-300 h-64 flex items-center justify-center">
                        Item not found.
                    </div>
                ) : (
                    <div>
                        <DetailRow label="Item Type" value={item.type?.toUpperCase()} />
                        <DetailRow label="Name of Article" value={item.article} />
                        <DetailRow label="Brand/Model" value={item.brand_model} />
                        <DetailRow label="Serial Number" value={item.serial_number} />
                        <DetailRow label="Number" value={item.number} />
                        <DetailRow label="Property Number" value={formatPropertyNumber(item.property_number)} />
                        <DetailRow label="Acquisition Date" value={formatDateForDisplay(item.acquisition_date)} />
                        <DetailRow label="Acquisition Cost" value={formatCurrency(item.acquisition_cost)} />
                        <DetailRow label="Accountable Officer" value={item.accountable_person} />
                        <DetailRow label="Responsibility Center" value={item.responsibility_center} />
                    </div>

                )}
            </CardContent>
        </Card>
    </div>
  );
}
