
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { File } from 'lucide-react';
import Link from 'next/link';

export default function DownloadableFilesPage() {
  const files = [
    { name: 'New ICS', href: 'https://drive.google.com/uc?export=download&id=12mwR9dfFtBHJEbnz3cqmvsDtXFJ93Ie6' },
    { name: 'ICS Transfer', href: 'https://drive.google.com/uc?export=download&id=1sbOdzRGjUZZNdIF0wHM30CV4s0fqwvU4' },
    { name: 'New PAR', href: 'https://drive.google.com/uc?export=download&id=10R1Aw9h_q6kQSYBI4rQw8qqoTXS_IqN_' },
    { name: 'PAR Transfer', href: 'https://drive.google.com/uc?export=download&id=12j4_bcKK1wrBhpZCG898AYTIWfLswRKs' },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 md:px-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold font-headline">Downloadable Files</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Available Forms</CardTitle>
          <CardDescription>
            Click on a file to download the document.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <Link key={index} href={file.href} download>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-4 p-6 text-base h-auto"
                  >
                    <File className="h-6 w-6 text-primary" />
                    <span>{file.name}</span>
                  </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
