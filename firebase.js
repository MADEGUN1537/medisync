import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, updatePassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCTn42CsUeEk8dlMFC6bHaBWBw8a39VLZs",
    authDomain: "medisync-f4f0a.firebaseapp.com",
    projectId: "medisync-f4f0a",
    storageBucket: "medisync-f4f0a.firebasestorage.app",
    messagingSenderId: "1005919919082",
    appId: "1:1005919919082:web:3393e89fd46e1691ad3093"
};

// Initialize Firebase
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence)
        .catch((error) => {
            console.error('Error setting persistence:', error.message, error.stack);
        });
} catch (error) {
    console.error('Firebase initialization error:', error.message, error.stack);
    throw error;
}

// Save medication to Firestore with retry logic
export async function saveMedicationToFirebase(med, retries = 3, delay = 1000) {
    if (!auth.currentUser) {
        console.error('No authenticated user found for saving medication');
        throw new Error('No authenticated user found');
    }
    if (!Array.isArray(med.times) || med.times.length === 0 || !med.times.every(time => typeof time === 'string')) {
        console.error('Invalid times array:', med.times);
        throw new Error('Medication times must be a non-empty array of strings');
    }
    try {
        console.log('Saving medication for user:', auth.currentUser.uid, 'with data:', med);
        const docRef = await addDoc(collection(db, "medications"), {
            ...med,
            userId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });
        console.log('Medication saved successfully, doc ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving medication:', error.message, error.stack);
        if (error.code === 'permission-denied' && retries > 0) {
            console.warn(`Permission denied, retrying (${retries} attempts left)...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return saveMedicationToFirebase(med, retries - 1, delay * 2);
        }
        throw error;
    }
}

// Save vitals to Firestore
export async function saveVitalsToFirebase(vitals) {
    if (!auth.currentUser) {
        console.error('No authenticated user found for saving vitals');
        throw new Error('No authenticated user found');
    }
    try {
        console.log('Saving vitals for user:', auth.currentUser.uid, 'with data:', vitals);
        const docRef = await addDoc(collection(db, "vitals"), {
            ...vitals,
            userId: auth.currentUser.uid
        });
        console.log('Vitals saved successfully, doc ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving vitals:', error.message, error.stack);
        throw error;
    }
}

// Delete medication from Firestore
export async function deleteMedicationFromFirebase(docId) {
    if (!auth.currentUser) {
        console.error('No authenticated user found for deleting medication');
        throw new Error('No authenticated user found');
    }
    try {
        console.log('Deleting medication for user:', auth.currentUser.uid, 'doc ID:', docId);
        await deleteDoc(doc(db, "medications", docId));
        console.log('Medication deleted successfully, doc ID:', docId);
    } catch (error) {
        console.error('Error deleting medication:', error.message, error.stack);
        throw error;
    }
}

// Signup with email, password, first name, last name, and phone number
export async function signup(email, password, firstName, lastName, phoneNumber) {
    try {
        console.log('Attempting signup with email:', email, 'firstName:', firstName, 'lastName:', lastName);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, "users", user.uid), {
            firstName,
            lastName,
            email,
            phoneNumber,
            createdAt: serverTimestamp()
        });
        
        return user;
    } catch (error) {
        console.error('Signup error:', error.message, error.stack);
        throw new Error(error.message);
    }
}

// Login with email and password
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error.code, error.message, error.stack);
        if (error.code === 'auth/network-request-failed') {
            throw new Error('Network error: Unable to connect. Please check your internet connection.');
        } else if (error.code === 'auth/wrong-password') {
            throw new Error('Incorrect password. Please try again.');
        } else if (error.code === 'auth/user-not-found') {
            throw new Error('No account found with this email. Please sign up.');
        } else {
            throw new Error(`Login failed: ${error.message}`);
        }
    }
}

// Get current user
export function getCurrentUser() {
    return auth.currentUser;
}

// Export Firestore and auth functions
export { auth, db, getFirestore, collection, query, where, onSnapshot, addDoc, doc, setDoc, serverTimestamp, deleteDoc, getDoc, updatePassword };
