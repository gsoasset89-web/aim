
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, CheckCircle, HeartHandshake, TrendingUp, Terminal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';


const StatCard = ({ title, value, icon: Icon, isLoading, description, children }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean, description: string, children?: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-1/4 mt-1" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
            {children}
        </CardContent>
    </Card>
);

const calculateDataHealth = (item: InventoryItem): number => {
    const fields = [
        'article', 'brand_model', 'serial_number', 'particulars',
        'acquisition_date', 'acquisition_cost', 'property_number', 'classification',
        'est_useful_life', 'unit_of_measure', 'unit_value', 'responsibility_center',
        'accountable_person', 'location', 'current_condition'
    ];
    const filledFields = fields.filter(field => {
        const value = item[field as keyof InventoryItem];
        return value !== null && value !== undefined && value !== '';
    }).length;
    return (filledFields / fields.length) * 100;
};

export default function OverviewPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    
    // Data fetching
    const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const inventoryQuery = useMemo(() => firestore ? collection(firestore, 'inventory') : null, [firestore]);

    const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);
    const { data: inventoryItems, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryQuery);

    const isLoading = isInventoryLoading || isUsersLoading || isUserLoading;

    const currentUser = useMemo(() => {
        if (!users || !user) return null;
        return users.find(u => u.id === user.uid);
    }, [users, user]);

    const {
        itemsAccountableFor,
        overallDataHealth,
        personalDataHealth,
    } = useMemo(() => {
        if (!users || !inventoryItems || !currentUser) return { itemsAccountableFor: 0, overallDataHealth: 0, personalDataHealth: 0 };
        
        const accountableItems = inventoryItems.filter(item => item.accountable_person === currentUser.name) || [];
        
        const totalHealth = inventoryItems.reduce((acc, item) => acc + calculateDataHealth(item), 0) || 0;
        const overallHealth = inventoryItems.length ? totalHealth / inventoryItems.length : 0;
        
        const personalTotalHealth = accountableItems.reduce((acc, item) => acc + calculateDataHealth(item), 0) || 0;
        const personalHealth = accountableItems.length ? personalTotalHealth / accountableItems.length : 0;

        return {
            itemsAccountableFor: accountableItems.length,
            overallDataHealth: overallHealth,
            personalDataHealth: personalHealth,
        };
    }, [users, inventoryItems, currentUser]);

    if (isLoading) {
        return (
            <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="lg:col-span-4"><Skeleton className="h-full w-full" /></Card>
                    <Card className="lg:col-span-3"><Skeleton className="h-full w-full" /></Card>
                </div>
            </main>
        )
    }

    const displayUser = currentUser ?? {
        id: 'local-user',
        name: 'Local User',
        email: 'local@example.com',
        role: 'Member' as const,
        verification: 'Authorized' as const,
    };
    
    const features = [
      'Centralized Inventory Management for ICS and PAR records.',
      'User-friendly interface for adding, editing, and tracking items.',
      'Advanced search and filtering capabilities.',
      'Automated QR code generation for easy item identification.',
      'Secure, role-based access control for different user levels.',
      'Comprehensive audit trails to track all changes to inventory items.',
    ];

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
            <h1 className="text-2xl font-semibold font-headline">Welcome back, {displayUser.name}!</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Items You're Accountable For" value={itemsAccountableFor} icon={UserCheck} isLoading={isLoading} description="Assets assigned under your name." />
                <StatCard title="Your Data Health Score" value={`${personalDataHealth.toFixed(0)}%`} icon={CheckCircle} isLoading={isLoading} description="Completeness of your items' data.">
                    <Progress value={personalDataHealth} className="mt-2" />
                </StatCard>
                <StatCard title="Overall Data Health" value={`${overallDataHealth.toFixed(0)}%`} icon={HeartHandshake} isLoading={isLoading} description="Completeness of all items' data.">
                    <Progress value={overallDataHealth} className="mt-2" />
                </StatCard>
            </div>
            
            <div className="grid gap-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp /> About A.I.M</CardTitle>
                        <CardDescription>Asset Inventory Management</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <section>
                          <h2 className="text-md font-semibold mb-2">What is A.I.M?</h2>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            A.I.M. (Asset Inventory Management) is a comprehensive, web-based system designed to streamline the tracking and management of inventory items for the General Services Office (GSO). It provides a centralized and secure platform for maintaining accurate records of both Inventory Custodian Slips (ICS) and Property Acknowledgement Receipts (PAR), ensuring accountability and simplifying the entire asset lifecycle from acquisition to disposal.
                          </p>
                        </section>
                        <section>
                          <h2 className="text-md font-semibold mb-2">Key Features</h2>
                           <div className="space-y-3">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start">
                                    <Badge variant="default" className="mr-3 mt-1 h-5 w-5 flex-shrink-0 items-center justify-center p-0">
                                      <span>{index + 1}</span>
                                    </Badge>
                                    <p className="text-sm text-muted-foreground">{feature}</p>
                                </div>
                            ))}
                          </div>
                        </section>
                         <section>
                            <h2 className="text-md font-semibold mb-2">System Maintenance</h2>
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Important Note on System Integrity</AlertTitle>
                                <AlertDescription>
                                    Regular maintenance is key to keeping the A.I.M. system running smoothly and securely. This makes sure the app stays reliable.
                                </AlertDescription>
                            </Alert>
                        </section>
                      </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
