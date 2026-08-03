
'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { User, InventoryItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Award, UserCheck, Shield, Calendar, BarChartHorizontal } from 'lucide-react';

const ProfileStat = ({ icon: Icon, label, value, isLoading }: { icon: React.ElementType, label: string, value: string | number, isLoading: boolean }) => (
    <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
        <Icon className="h-6 w-6 text-primary flex-shrink-0" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {isLoading ? (
                <Skeleton className="h-6 w-24 mt-1" />
            ) : (
                <p className="font-semibold text-lg">{value}</p>
            )}
        </div>
    </div>
);


export default function ProfilePage() {
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    const usersQuery = useMemo(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
    const { data: users, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

    const currentUser = useMemo(() => {
        if (!authUser || !users) return null;
        return users.find(u => u.id === authUser.uid);
    }, [authUser, users]);
    
    const accountableItemsQuery = useMemo(() => {
        if (!firestore || !currentUser?.name) return null;
        return query(collection(firestore, 'inventory'), where('accountable_person', '==', currentUser.name));
    }, [firestore, currentUser]);
    
    const { data: accountableItems, isLoading: isInventoryLoading } = useCollection<InventoryItem>(accountableItemsQuery);


    const isLoading = isUserLoading || isUsersLoading || isInventoryLoading;

    if (isLoading || !currentUser) {
        return (
            <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </main>
        )
    }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold font-headline">Your Profile</CardTitle>
                    <CardDescription>
                        This is your personal information as it appears in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border rounded-lg">
                            <div className="flex-shrink-0">
                                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                                    <UserCheck className="h-12 w-12 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                                <p className="text-muted-foreground">{currentUser.email}</p>
                                <div className="mt-2 flex gap-2">
                                     <Badge variant="outline">{currentUser.role}</Badge>
                                     <Badge variant={currentUser.verification === 'Authorized' ? 'default' : 'destructive'}>
                                        {currentUser.verification}
                                     </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ProfileStat 
                                icon={Award} 
                                label="Contribution Score" 
                                value={currentUser.contributionScore || 0} 
                                isLoading={isLoading} 
                            />
                            <ProfileStat 
                                icon={BarChartHorizontal} 
                                label="Items You're Accountable For" 
                                value={accountableItems?.length || 0} 
                                isLoading={isLoading} 
                            />
                             <ProfileStat 
                                icon={Shield} 
                                label="Role" 
                                value={currentUser.role} 
                                isLoading={isLoading} 
                            />
                             <ProfileStat 
                                icon={Calendar} 
                                label="Last Activity" 
                                value={currentUser.lastActivity ? formatDistanceToNow(currentUser.lastActivity.toDate(), { addSuffix: true }) : 'No activity yet'}
                                isLoading={isLoading} 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
