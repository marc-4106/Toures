// src/services/firestoreDestinations.js

import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
// NOTE: Adjust the path to your firebaseConfig file if needed
import app from './firebaseConfig'; 

// Initialize Firestore instance
const db = getFirestore(app);

const destinationsCollectionRef = collection(db, 'destinations');

// --- READ (Used by ManageDestination) ---
export const fetchDestinations = async () => {
  try {
    const snapshot = await getDocs(destinationsCollectionRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching destinations:", error);
    throw new Error("Failed to load destinations.");
  }
};

// --- CREATE (Used by ManageDestination) ---
export const addDestination = async (destinationData) => {
  try {
    const docRef = await addDoc(destinationsCollectionRef, {
      ...destinationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef; // Returns the document reference for logging
  } catch (error) {
    console.error("Error adding destination:", error);
    throw error; // Propagate the error to ManageDestination.js
  }
};

// --- UPDATE (Used by ManageDestination) ---
export const updateDestination = async (id, destinationData) => {
  try {
    const docRef = doc(db, 'destinations', id);
    await updateDoc(docRef, {
      ...destinationData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating destination ${id}:`, error);
    throw error;
  }
};

// --- ARCHIVE (Special Update) ---
export const archiveDestination = async (id) => {
  try {
    const docRef = doc(db, 'destinations', id);
    await updateDoc(docRef, {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error archiving destination ${id}:`, error);
    throw error;
  }
};

// --- UNARCHIVE (Special Update) ---
export const unarchiveDestination = async (id) => {
  try {
    const docRef = doc(db, 'destinations', id);
    await updateDoc(docRef, {
      isArchived: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error unarchiving destination ${id}:`, error);
    throw error;
  }
};

// --- DELETE (Optional, but included for completeness) ---
export const deleteDestination = async (id) => {
  try {
    const docRef = doc(db, 'destinations', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting destination ${id}:`, error);
    throw error;
  }
};