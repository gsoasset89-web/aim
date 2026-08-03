
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const formSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Full name is required')
      .regex(/^[a-zA-Z\s]+$/, 'Only letters and spaces are allowed'),
    email: z
      .string()
      .email('Invalid email address')
      .refine(email => email.endsWith('@gsobaguio.com'), {
          message: 'Email must be a @gsobaguio.com address',
      }),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched'
  });

  const handleRegister = async (values: FormValues) => {
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
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const newUser: Omit<User, 'id' | 'number'> = {
          name: values.name,
          email: values.email,
          role: 'Member',
          verification: 'Unauthorized',
        };

        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        
        setDoc(userDocRef, newUser)
          .then(async () => {
            toast({
              title: 'Registration Successful',
              description: 'Your account has been created. An administrator will verify your account shortly.',
            });
            if (auth.currentUser) {
              await auth.signOut();
            }
            router.push('/login');
          })
          .catch((error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'create',
                requestResourceData: newUser,
            }));
            throw error; // Rethrow to be caught by outer catch
          });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'An unknown error occurred.',
      });
      setIsLoading(false);
    }
  };


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
      <Card className="mx-auto max-w-lg my-8 z-20 bg-white/10 backdrop-blur-lg border border-primary/30 text-white shadow-2xl shadow-primary/20 animate-in fade-in-0 zoom-in-95 duration-500 transition-all hover:scale-105 hover:shadow-primary/40">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white pt-4">Create an Account</CardTitle>
          <CardDescription className="text-gray-300">
            Enter your information to get started with A.I.M
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[a-zA-Z\s]*$/.test(value)) {
                            field.onChange(value);
                          }
                        }}
                        disabled={isLoading}
                        className="bg-white/20 border-white/30 placeholder:text-gray-300 text-white transition-all duration-300 focus:shadow-[0_0_15px_hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/50%)] focus-visible:ring-primary focus-visible:ring-offset-0"
                      />
                    </FormControl>
                     <FormDescription className="text-gray-400">
                      Full name must only contain letters and spaces.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@gsobaguio.com"
                        {...field}
                        disabled={isLoading}
                        className="bg-white/20 border-white/30 placeholder:text-gray-300 text-white transition-all duration-300 focus:shadow-[0_0_15px_hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/50%)] focus-visible:ring-primary focus-visible:ring-offset-0"
                      />
                    </FormControl>
                    <FormDescription className="text-gray-400">
                      Must be a valid @gsobaguio.com email address.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          {...field}
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
                    </FormControl>
                     <FormDescription className="text-gray-400">
                      6+ characters with at least one number.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...field}
                          disabled={isLoading}
                          className="bg-white/20 border-white/30 placeholder:text-gray-300 text-white transition-all duration-300 focus:shadow-[0_0_15px_hsl(var(--primary))] hover:shadow-[0_0_15px_hsl(var(--primary)/50%)] focus-visible:ring-primary focus-visible:ring-offset-0 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-300 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                     <FormDescription className="text-gray-400">
                      Passwords must match.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || !form.formState.isValid}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm text-gray-300">
            Already have an account?{' '}
            <Link href="/login" className="underline hover:text-white transition-colors">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    