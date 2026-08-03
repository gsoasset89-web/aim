'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Target, Goal, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  const features = [
    'Centralized Inventory Management for ICS and PAR records.',
    'User-friendly interface for adding, editing, and tracking items.',
    'Advanced search and filtering capabilities.',
    'Automated QR code generation for easy item identification.',
    'Secure, role-based access control for different user levels.',
    'Comprehensive audit trails to track all changes to inventory items.',
    'Data visualization for tracking inventory metrics.',
    'Downloadable forms for official use.',
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 md:px-8">
      <div className="grid gap-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold font-headline">About A.I.M - Asset Inventory Management</CardTitle>
            <CardDescription>
              A modern solution for tracking and managing government assets efficiently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8 pr-6">
              <section>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Goal className="text-primary"/> Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To empower the General Services Office (GSO) with a robust, centralized, and user-friendly digital platform that streamlines asset management. We aim to ensure accountability, transparency, and efficiency throughout the entire lifecycle of government property, from acquisition to disposal.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Target className="text-primary"/> Our Vision</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To be the definitive digital tool for public asset management, eliminating manual and redundant processes. We envision a future where every government asset is accurately tracked, readily accounted for, and managed with the highest standards of integrity, setting a benchmark for operational excellence in public service.
                </p>
              </section>
              
              <section>
                <h2 className="text-xl font-semibold mb-2">What is A.I.M?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  A.I.M. (Asset Inventory Management) is a comprehensive, web-based system designed to streamline the tracking and management of inventory items for the General Services Office (GSO). It provides a centralized and secure platform for maintaining accurate records of both Inventory Custodian Slips (ICS) and Property Acknowledgement Receipts (PAR), ensuring accountability and simplifying the entire asset lifecycle from acquisition to disposal.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Key Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start p-3 bg-secondary/50 rounded-lg">
                       <CheckCircle className="h-5 w-5 mr-3 mt-1 flex-shrink-0 text-primary" />
                      <p className="text-secondary-foreground">{feature}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">System Maintenance</h2>
                 <Alert>
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>Important Note on System Integrity</AlertTitle>
                  <AlertDescription>
                    Regular maintenance is key to keeping the A.I.M. system running smoothly and securely. This makes sure the app stays reliable.
                  </AlertDescription>
                </Alert>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-2">Developers</h2>
                <p className="text-muted-foreground">
                  Developed by: Kyle Russel Lucero & Samuel Sta Cruz
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
