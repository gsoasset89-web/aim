'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  useEffect(() => {
    // If user is already logged in, redirect to the dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard/overview');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!auth || !firestore) {
        toast({
            variant: 'destructive',
            title: 'Firebase not initialized',
            description: 'The application is not connected to the backend services.',
        });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        // Fetch user profile from Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          if (userData.verification === 'Authorized') {
            sessionStorage.setItem('user', JSON.stringify({ ...userData, id: user.uid }));
            
            const audio = new Audio('/audio/login.mp3');
            audio.play().catch(e => console.error("Error playing audio:", e));

            toast({
              title: 'Login Successful',
              description: `Welcome back, ${userData.name}!`,
            });
            router.push('/dashboard/overview');
          } else {
            await auth.signOut();
            toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: 'Account not verified. Contact an administrator for verification.',
            });
          }
        } else {
            await auth.signOut();
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: 'User profile not found.',
            });
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render nothing or a loader while checking auth state to prevent flash of login page
  if (isUserLoading || user) {
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
      <Card className="mx-auto max-w-sm w-full z-20 bg-white/10 backdrop-blur-lg border border-primary/30 text-white shadow-2xl shadow-primary/20 animate-in fade-in-0 zoom-in-95 duration-500 transition-all hover:scale-105 hover:shadow-primary/40">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-2 flex items-center justify-center">
              <Image src="/images/gso_logo.png" alt="GSO Logo" width={96} height={96} />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">A.I.M</CardTitle>
          <CardDescription className="text-gray-300">
            Welcome to the Asset Inventory Management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@gsobaguio.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                 className="bg-white/20 border-white/30 placeholder:text-gray-300 text-white transition-all duration-300 focus:shadow-[0_0_15px_hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/50%)] focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-white">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-white/20 border-white/30 placeholder:text-gray-300 text-white transition-all duration-300 focus:shadow-[0_0_15px_hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/50%)] focus-visible:ring-primary focus-visible:ring-offset-0 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-300">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline hover:text-white transition-colors">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
