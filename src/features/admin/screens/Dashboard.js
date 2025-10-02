import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import UsersCard from "../../../components/dashboard/UsersCard";
import DestinationsCard from "../../../components/dashboard/DestinationsCard";
import MostViewedCard from "../../../components/dashboard/MostViewedCard";
import PendingReportsCard from "../../../components/dashboard/PendingReportsCard";
import NewUsersCard from "../../../components/dashboard/NewUsersCard";

const AdminHomeScreen = ({ navigation }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <UsersCard />
      <DestinationsCard navigation={navigation} />
      {/* <MostViewedCard />
      <PendingReportsCard />
      <NewUsersCard /> */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
  },
});

export default AdminHomeScreen;
