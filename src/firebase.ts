import { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export type FirebaseUserState = {
  user: FirebaseUser | null;
  isUserLoading: boolean;
};

let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let hasAttemptedInit = false;

function initializeFirebase() {
  if (hasAttemptedInit) {
    return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
  }

  hasAttemptedInit = true;

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const hasConfig = Object.values(config).every((value) => typeof value === 'string' && value.length > 0);

  if (!hasConfig) {
    return { app: null, auth: null, firestore: null };
  }

  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config as any);
    authInstance = getAuth(firebaseApp);
    firestoreInstance = getFirestore(firebaseApp);
  } catch {
    firebaseApp = null;
    authInstance = null;
    firestoreInstance = null;
  }

  return { app: firebaseApp, auth: authInstance, firestore: firestoreInstance };
}

export function useAuth() {
  return initializeFirebase().auth as any;
}

export function useFirestore() {
  return initializeFirebase().firestore as any;
}

export function useUser() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const auth = useAuth();

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return {
    user: user as FirebaseUser | null,
    isUserLoading,
  } satisfies FirebaseUserState;
}

export function useCollection<T>(_query?: unknown) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(_query));
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!_query) {
      setData([] as T[]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    Promise.resolve()
      .then(() => {
        if (!isActive) return;
        setData([] as T[]);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [_query]);

  return {
    data,
    isLoading,
    error,
  };
}

export function useDoc<T>(_query?: unknown) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(Boolean(_query));
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!_query) {
      setData(undefined);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    Promise.resolve()
      .then(() => {
        if (!isActive) return;
        setData(undefined);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [_query]);

  return {
    data,
    isLoading,
    error,
  };
}

export function useAuthState() {
  const { user, isUserLoading } = useUser();

  return {
    user,
    isLoading: isUserLoading,
  };
}
