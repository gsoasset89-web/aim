'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.warn('Firebase initialization with explicit config failed, retrying with fallback config.', e);
      try {
        firebaseApp = initializeApp({
          ...firebaseConfig,
          apiKey: firebaseConfig.apiKey || 'AIzaSyCI-OX429M-_eZ3I64w0oagIBE1fiAhzrk',
          authDomain: firebaseConfig.authDomain || 'studio-6232395803-16b59.firebaseapp.com',
          projectId: firebaseConfig.projectId || 'studio-6232395803-16b59',
          storageBucket: firebaseConfig.storageBucket || 'studio-6232395803-16b59.appspot.com',
          messagingSenderId: firebaseConfig.messagingSenderId || '123447107137',
          appId: firebaseConfig.appId || '1:123447107137:web:ea3a9acb7ca227650cb0c0',
        });
      } catch (fallbackError) {
        console.error('Firebase initialization failed.', fallbackError);
        firebaseApp = initializeApp();
      }
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  
  // Set persistence to session to log out user when tab is closed.
  setPersistence(auth, browserSessionPersistence);

  return {
    firebaseApp,
    auth: auth,
    firestore: firestore,
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './hooks/use-memo-firebase';
export * from './errors';
export * from './error-emitter';