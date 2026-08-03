
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect to the new overview page
        router.push('/dashboard/overview');
      } else {
        // If user is not logged in, redirect to the login page
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // Show a loading spinner while checking auth state
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background overflow-hidden">
      <video
        src="/video/backlogreg.mp4"
        autoPlay
        loop
        muted
        className="fixed z-0 w-auto min-w-full min-h-full max-w-none object-cover"
      />
      <div className="fixed inset-0 z-10 bg-black opacity-50"></div>
      <Loader2 className="h-12 w-12 animate-spin text-primary z-20" />
    </div>
  );
}
