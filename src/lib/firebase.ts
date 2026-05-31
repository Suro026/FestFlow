import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNgrAMBZ6sKj-Zov2aNnAVin9o1wZzXSE",
  authDomain: "bits2bytes-b2b27.firebaseapp.com",
  projectId: "bits2bytes-b2b27",
  storageBucket: "bits2bytes-b2b27.firebasestorage.app",
  messagingSenderId: "52348104145",
  appId: "1:52348104145:web:28280721f186cd0a4504f0",
  measurementId: "G-KNREFL63KB"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;