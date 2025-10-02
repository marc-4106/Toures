import React, { useState, useEffect } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import ManageDestination from '../features/admin/screens/ManageDestination';
import ManageEvents from '../features/admin/screens/ManageEvents';
import SettingsScreen from '../features/admin/screens/SettingsScreen';
import FeedbackScreen from '../features/admin/screens/FeedbackScreen';
import Dashboard from '../features/admin/screens/Dashboard';
import UserManagement from '../features/admin/screens/UserManagement';
import LogReports from '../features/admin/screens/LogReports';
import Notifications from '../features/admin/screens/Notifications';
import SupportTickets from '../features/admin/screens/SupportTickets';
import AuditTrail from '../features/admin/screens/AuditTrail';

import CustomDrawer from '../components/common/CustomAdminDrawer';

const Drawer = createDrawerNavigator();

export default function AppDrawerNavigator({ role }) { // 👈 accept role as prop
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => (
        <CustomDrawer
          {...props}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          role={role}   // 👈 forward role to CustomDrawer
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'permanent',
        drawerStyle: { width: isCollapsed ? 60 : 240 },
      }}
    >
      {/* Superadmin + Admin Screens (filtered by CustomDrawer) */}
      <Drawer.Screen name="Dashboard" component={Dashboard} />
      <Drawer.Screen name="User Management" component={UserManagement} />
      <Drawer.Screen name="Audit Trail" component={AuditTrail} />
      <Drawer.Screen name="Manage Destinations" component={ManageDestination} />
      <Drawer.Screen name="Manage Events" component={ManageEvents} />
      <Drawer.Screen name="Logs / Reports" component={LogReports} />
      <Drawer.Screen name="Feedback" component={FeedbackScreen} />
      <Drawer.Screen name="Notifications" component={Notifications} />
      <Drawer.Screen name="Support / Tickets" component={SupportTickets} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}