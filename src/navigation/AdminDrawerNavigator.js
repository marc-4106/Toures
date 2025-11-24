import React, { useState, useEffect } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import ManageDestination from "../features/admin/screens/ManageDestination";
import ManageEvents from "../features/admin/screens/ManageEvents";
import SettingsScreen from "../features/admin/screens/SettingsScreen";
import FeedbackScreen from "../features/admin/screens/FeedbackScreen";
import Dashboard from "../features/admin/screens/DashboardScreen";
import UserManagement from "../features/admin/screens/UserManagement";
import Reports from "../features/admin/screens/ReportsScreen";
import Notifications from "../features/admin/screens/Notifications";
import SupportTickets from "../features/admin/screens/SupportTickets";
import AuditTrail from "../features/admin/screens/AuditTrail";
import CustomDrawer from "../components/common/CustomAdminDrawer";
import { getUnreadCount, notiEmitter } from "../services/notificationLogs";
import { Alert } from "react-native";

const Drawer = createDrawerNavigator();

export default function AppDrawerNavigator({ role }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification badge live updates
  useEffect(() => {
    const updateUnread = async () => {
      const count = await getUnreadCount();
      setUnreadCount(count);
    };

    updateUnread();
    const sub = notiEmitter.addListener("updated", updateUnread);
    return () => sub.remove();
  }, []);

  // ✅ Guard: Block restricted navigation for Admin
  const restrictedForAdmin = [
  "User Management",
  "Audit Trail",
  "Reports",
  "Support / Tickets", // new restriction
];


  const handleRestrictedAccess = (routeName) => {
    if (role === "admin" && restrictedForAdmin.includes(routeName)) {
      Alert.alert(
        "Access Restricted",
        "You don't have permission to access this section. Please contact a SuperAdmin."
      );
      return false;
    }
    return true;
  };

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenListeners={{
        state: (e) => {
          const route = e.data?.state?.routes[e.data?.state?.index];
          if (route && !handleRestrictedAccess(route.name)) {
            e.preventDefault(); // stop unauthorized navigation
          }
        },
      }}
      drawerContent={(props) => (
        <CustomDrawer
          {...props}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          role={role}
          unreadCount={unreadCount}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: "permanent",
        drawerStyle: { width: isCollapsed ? 60 : 240 },
      }}
    >
      <Drawer.Screen name="Dashboard" component={Dashboard} />
      <Drawer.Screen name="Manage Destinations" component={ManageDestination} />
      <Drawer.Screen name="Manage Events" component={ManageEvents} />
      <Drawer.Screen name="Feedback" component={FeedbackScreen} />
      <Drawer.Screen name="Notifications" component={Notifications} />
      <Drawer.Screen name="Support / Tickets" component={SupportTickets} />
      <Drawer.Screen name="User Management" component={UserManagement} />
      <Drawer.Screen name="Audit Trail" component={AuditTrail} />
      <Drawer.Screen name="Reports" component={Reports} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
