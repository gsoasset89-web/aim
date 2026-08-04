const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyCI-OX429M-_eZ3I64w0oagIBE1fiAhzrk',
  authDomain: 'studio-6232395803-16b59.firebaseapp.com',
  projectId: 'studio-6232395803-16b59',
  storageBucket: 'studio-6232395803-16b59.appspot.com',
  messagingSenderId: '123447107137',
  appId: '1:123447107137:web:ea3a9acb7ca227650cb0c0',
};

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
};
