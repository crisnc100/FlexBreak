import { signInAnonymously, type User } from 'firebase/auth';
import { nativeAuth } from '../../config/firebase';

let pendingSignIn: Promise<User> | undefined;

/** Share a single sign-in across concurrent startup, purchase and coach calls. */
export async function getAuthenticatedUser(): Promise<User> {
  await nativeAuth.authStateReady();
  if (nativeAuth.currentUser) return nativeAuth.currentUser;
  if (!pendingSignIn) {
    pendingSignIn = signInAnonymously(nativeAuth)
      .then(({ user }) => user)
      .finally(() => { pendingSignIn = undefined; });
  }
  return pendingSignIn;
}

export async function getBackendToken(forceRefresh = false): Promise<string> {
  const user = await getAuthenticatedUser();
  return user.getIdToken(forceRefresh);
}
