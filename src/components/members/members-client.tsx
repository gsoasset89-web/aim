

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, BadgeCheck, BadgeX, MoreHorizontal, Trash2 } from 'lucide-react';
import type { User, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { useUser } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const ROLES: UserRole[] = ['Developer', 'Admin', 'Member', 'View Only'];
const VERIFICATION_STATUSES: User['verification'][] = ['Authorized', 'Unauthorized'];

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const [confirmationText, setConfirmationText] = useState('');
  const isConfirmDisabled = confirmationText.toLowerCase() !== 'confirm';

  useEffect(() => {
    if (open) {
      setConfirmationText('');
    }
  }, [open]);

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the user{' '}
            <strong>{user.name}</strong> ({user.email}) and all their associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-delete-text">
            To confirm, please type "confirm" below:
          </Label>
          <Input
            id="confirm-delete-text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            autoComplete="off"
            disabled={isLoading}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isConfirmDisabled || isLoading}
            className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Delete User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export default function MembersClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const usersCollection = useMemo(
    () => firestore ? collection(firestore, 'users'): null,
    [firestore]
  );
  const { data: users, isLoading } = useCollection<User>(usersCollection);
  
  const currentUserProfile = useMemo(() => {
    if (!authUser || !users) return null;
    return users.find(u => u.id === authUser.uid);
  }, [authUser, users]);


  const handleUpdateUser = (
    userId: string,
    email: string,
    role?: UserRole,
    verification?: User['verification']
  ) => {
    if (!firestore) return;
    setUpdatingUserId(userId);
    setIsActionLoading(true);
    
    const userDocRef = doc(firestore, 'users', userId);
    const updateData: Partial<User> = {};
    if (role) updateData.role = role;
    if (verification) updateData.verification = verification;

    updateDoc(userDocRef, updateData)
      .then(() => {
        if (verification === 'Authorized') {
          const notificationRef = collection(firestore, `users/${userId}/notifications`);
          const message = 'Welcome! Your account has been authorized by an administrator.';
          addDoc(notificationRef, {
            userId: userId,
            message: message,
            isRead: false,
            timestamp: serverTimestamp(),
            link: '/dashboard',
          }).catch(error => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: notificationRef.path,
                  operation: 'create',
                  requestResourceData: { message: message },
              }));
          });
        }
        
        if (role) {
          const notificationRef = collection(firestore, `users/${userId}/notifications`);
          const message = `Your user role has been updated to: ${role}.`;
          addDoc(notificationRef, {
            userId: userId,
            message: message,
            isRead: false,
            timestamp: serverTimestamp(),
            link: '/dashboard/members',
          }).catch(error => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: notificationRef.path,
                  operation: 'create',
                  requestResourceData: { message: message },
              }));
          });
        }

        toast({
          title: 'User Updated',
          description: `Successfully updated ${email}.`,
        });
      })
      .catch((error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }));
      })
      .finally(() => {
        setUpdatingUserId(null);
        setIsActionLoading(false);
      });
  };
  
  const handleDeleteUser = () => {
    if (!userToDelete || !firestore) return;
    setIsActionLoading(true);
    const userDocRef = doc(firestore, 'users', userToDelete.id);
    deleteDoc(userDocRef)
      .then(() => {
        toast({
          title: 'User Deleted',
          description: `Successfully deleted ${userToDelete.name}.`,
        });
      })
      .catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'delete',
        }));
      })
      .finally(() => {
        setIsActionLoading(false);
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
      });
  }

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(
      (user) =>
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const canPerformActionOn = (targetUser: User): boolean => {
    if (!authUser || !currentUserProfile) return false;
    if (authUser.uid === targetUser.id) return false; // Cannot act on self

    switch (currentUserProfile.role) {
      case 'Developer':
        return true; // Developer can act on anyone (except themselves)
      case 'Admin':
        // Admin can act on anyone except a Developer
        return targetUser.role !== 'Developer';
      case 'Member':
      case 'View Only':
      default:
        return false;
    }
  };

  const PaginationControls = () => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1 || isLoading || isActionLoading}
      >
        Previous
      </Button>
      <div className="flex items-center justify-center text-sm font-medium px-2 sm:px-4">
        Page {currentPage} of {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages || isLoading || isActionLoading}
      >
        Next
      </Button>
    </div>
  );

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 md:px-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold font-headline">Members</h1>
      </div>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>User List</CardTitle>
              <CardDescription className="mt-1">
                A list of all registered users in the system.
              </CardDescription>
            </div>
            <div className="flex items-center justify-end w-full sm:w-auto">
              <PaginationControls />
            </div>
          </div>
          <div className="relative pt-4">
            <Search className="absolute left-2.5 top-6.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Name, Email, or Role..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading || isActionLoading}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
          <div className="h-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Actions</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Role</TableHead>
                  <TableHead className="text-center">
                    Verification Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 5 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => {
                    const isActionable = canPerformActionOn(user);
                    const isCurrentlyUpdating = updatingUserId === user.id;

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="text-center">
                          {isCurrentlyUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : isActionable ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isActionLoading}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="cursor-pointer">
                                    Change Role
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                      {ROLES.filter((r) => r !== user.role).map((role) => (
                                        <DropdownMenuItem
                                          key={role}
                                          onSelect={() => handleUpdateUser(user.id, user.email, role)}
                                          className="cursor-pointer"
                                        >
                                          {role}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="cursor-pointer">
                                    Change Verification
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                      {VERIFICATION_STATUSES.filter(
                                        (v) => v !== user.verification
                                      ).map((status) => (
                                        <DropdownMenuItem
                                          key={status}
                                          onSelect={() =>
                                            handleUpdateUser(
                                              user.id,
                                              user.email,
                                              undefined,
                                              status
                                            )
                                          }
                                          className="cursor-pointer"
                                        >
                                          {status}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                {(currentUserProfile?.role === 'Developer' || currentUserProfile?.role === 'Admin') && (
                                   <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setUserToDelete(user);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete User
                                    </DropdownMenuItem>
                                   </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button variant="ghost" size="icon" disabled>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-center capitalize">
                          {user.role}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              user.verification === 'Authorized'
                                ? 'default'
                                : 'destructive'
                            }
                            className="gap-1"
                          >
                            {user.verification === 'Authorized' ? (
                              <BadgeCheck className="h-4 w-4" />
                            ) : (
                              <BadgeX className="h-4 w-4" />
                            )}
                            {user.verification}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {isLoading ? 'Loading users...' : 'No users found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Showing{' '}
            <strong>
              {paginatedUsers.length > 0
                ? (currentPage - 1) * itemsPerPage + 1
                : 0}
            </strong>{' '}
            to{' '}
            <strong>
              {(currentPage - 1) * itemsPerPage + paginatedUsers.length}
            </strong>{' '}
            of <strong>{filteredUsers.length}</strong> users
          </div>
          <PaginationControls />
        </CardFooter>
      </Card>
      <DeleteUserDialog 
        user={userToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteUser}
        isLoading={isActionLoading}
      />
    </main>
  );
}
