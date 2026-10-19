import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

import { CONFIG } from 'src/shared/config';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

function ensureApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;

  if (!CONFIG.firebase.projectId) {
    throw new Error('Firebase belum dikonfigurasi. Hubungi administrator.');
  }

  firebaseApp = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: CONFIG.firebase.apiKey,
        authDomain: CONFIG.firebase.authDomain,
        projectId: CONFIG.firebase.projectId,
      });
  return firebaseApp;
}

function ensureAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;
  firebaseAuth = getAuth(ensureApp());
  return firebaseAuth;
}

export async function getGoogleIdToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(ensureAuth(), provider);
  return result.user.getIdToken();
}
