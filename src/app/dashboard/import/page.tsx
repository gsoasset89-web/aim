'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { writeBatch, collection, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Loader2, Upload, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { InventoryItem, User } from '@/lib/types';
import Image from 'next/image';

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const currentUser = useMemo(() => {
    if (!authUser || !users) return null;
    return users.find(u => u.id === authUser.uid);
  }, [authUser, users]);

  const handleImport = async () => {
    if (!selectedFile || !firestore || !currentUser) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
        const headers = rows.shift()?.split(',') || [];
        const batch = writeBatch(firestore);
        const approvalCol = collection(firestore, 'approvals');

        rows.forEach(row => {
            const values = row.split(',');
            const article = values[headers.indexOf('article')] || values[headers.indexOf('ARTICLE')];
            if (!article) return;

            const id = `ID-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            batch.set(doc(approvalCol), {
                itemId: id,
                itemArticle: article,
                action: 'create',
                requestedByUserId: currentUser.id,
                requestedByUserName: currentUser.name,
                status: 'pending',
                timestamp: serverTimestamp(),
                data: { id, article, status: 'active', type: 'ics' }
            });
        });

        await batch.commit();
        toast({ title: 'Import Complete', description: 'Records are pending approval.' });
      } catch (err: any) { toast({ variant: 'destructive', title: 'Import Failed' }); }
      finally { setIsLoading(false); }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 md:px-8">
      <Card className="max-w-4xl mx-auto w-full mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-6 w-6 text-primary" /> Import Data</CardTitle>
          <CardDescription>Upload CSV files to bulk-add inventory items for review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>CSV Requirements</AlertTitle>
            <AlertDescription>
                Ensure your CSV file contains an <strong>article</strong> column. Each record will be submitted for approval.
            </AlertDescription>
          </Alert>
          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleImport} disabled={isLoading || !selectedFile} className="w-full">
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
            Start Import
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
