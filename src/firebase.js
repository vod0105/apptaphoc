import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth,GoogleAuthProvider  } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDjl5J9MrPIrvK8lCvsJuYJdpb8loVqlRI",
  authDomain: "taptrung-16ec4.firebaseapp.com",
  projectId: "taptrung-16ec4",
  storageBucket: "taptrung-16ec4.firebasestorage.app",
  messagingSenderId: "194821021375",
  appId: "1:194821021375:web:ff61630796ede74401700a",
  measurementId: "G-E8VZGQNGJY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
