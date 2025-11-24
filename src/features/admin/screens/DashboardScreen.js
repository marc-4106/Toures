import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import app from "../../../services/firebaseConfig";

import AdminDashboard from "./AdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";

const DashboardScreen = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore(app);

    // Listen to login/logout status
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserRole("guest");
        setLoading(false);
        return;
      }

      try {
        const userDoc = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDoc);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserRole((data.role || "admin").toLowerCase());
        } else {
          console.warn("⚠️ No role found — defaulting to admin");
          setUserRole("admin");
        }
      } catch (error) {
        console.error("❌ Failed to get role:", error);
        setUserRole("admin");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe(); // clean up listener
  }, []);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0f37f1" />
        <Text>Loading dashboard...</Text>
      </View>
    );

  if (userRole === "superadmin") {
    return <SuperAdminDashboard />;
  }

  if (userRole === "admin") {
    return <AdminDashboard />;
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>No role assigned. Please contact system administrator.</Text>
    </View>
  );
};

export default DashboardScreen;
