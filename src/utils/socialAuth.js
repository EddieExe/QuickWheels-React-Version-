// socialAuth.js
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.email);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      isAdmin: false,
      createdAt: new Date(),
      provider: "google",
    });
  }

  const updatedSnap = await getDoc(userRef);
  const isAdmin = updatedSnap.exists() && updatedSnap.data().isAdmin === true;
  return { user, isAdmin };
}

export async function signInWithMicrosoft() {
  const provider = new OAuthProvider("microsoft.com");
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.email);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      isAdmin: false,
      createdAt: new Date(),
      provider: "microsoft",
    });
  }

  const updatedSnap = await getDoc(userRef);
  const isAdmin = updatedSnap.exists() && updatedSnap.data().isAdmin === true;
  return { user, isAdmin };
}
