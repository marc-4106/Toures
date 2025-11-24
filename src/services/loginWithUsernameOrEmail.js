import { signInWithEmailAndPassword } from "firebase/auth";
import { query, where, getDocs, collection } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

/**
 * Logs in a user using either email or username.
 * 
 * @param {string} identifier - The email or username entered by the user.
 * @param {string} password - The password entered by the user.
 * @returns {Promise<UserCredential>} Firebase user credential if login succeeds.
 */
export async function loginWithUsernameOrEmail(identifier, password) {
  let emailToUse = identifier.trim().toLowerCase();

  try {
    // If the user entered a username (no "@")
    if (!identifier.includes("@")) {
      const q = query(collection(db, "users"), where("username", "==", identifier.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error("Username not found");
      }

      // Extract email associated with username
      emailToUse = snap.docs[0].data().email;
    }

    // Attempt Firebase Auth login
    const cred = await signInWithEmailAndPassword(auth, emailToUse, password);

    // Optional: check if account is restricted (isActive false)
    const q2 = query(collection(db, "users"), where("email", "==", emailToUse));
    const snap2 = await getDocs(q2);
    if (!snap2.empty && snap2.docs[0].data().isActive === false) {
      throw new Error("This account is restricted or disabled.");
    }

    return cred;
  } catch (err) {
    console.error("Login failed:", err.message);
    throw err;
  }
}
