// src/features/admin/screens/SupportTickets.js
import React, { useEffect, useState, useMemo } from "react";
import { useRoute } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  Image,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { getAuth } from "firebase/auth";
import { Picker } from "@react-native-picker/picker";

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState("ongoing"); 
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const route = useRoute();
  const { ticketId } = route.params || {};

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || "system";
  const actorName = currentUser?.email || currentUser?.displayName || currentUserId;
  const actorId = currentUserId;

  // Real-time tickets listener
  useEffect(() => {
    const q = query(collection(db, "supportTickets"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setTickets(data);
      setLoading(false);
    }, (err) => {
      console.error("tickets snapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Auto-set ticket status to Pending when viewed
  useEffect(() => {
    if (!selectedTicket) return;

    if (selectedTicket.status !== "Pending") {
      const ticketRef = doc(db, "supportTickets", selectedTicket.id);
      updateDoc(ticketRef, {
        status: "Pending",
        updatedAt: serverTimestamp(),
      }).then(async () => {
        // Audit log
        await addDoc(collection(db, "activityLogs"), {
          actionType: "VIEW",
          actorName,
          actorId,
          targetEntity: "SupportTicket",
          targetId: selectedTicket.id,
          details: `Ticket viewed (status set to Pending)`,
          timestamp: serverTimestamp(),
        });

        await addDoc(collection(db, `supportTickets/${selectedTicket.id}/logs`), {
          action: "Status changed to Pending (ticket opened)",
          by: actorName,
          createdAt: serverTimestamp(),
        });

        setSelectedTicket((prev) => ({ ...prev, status: "Pending" }));
      }).catch((err) => {
        console.error("Error updating ticket status on open:", err);
      });
    }
  }, [selectedTicket]);

  // Load admins
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        if (cancelled) return;
        const adminList = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d?.role === "superadmin") {
            adminList.push({ id: docSnap.id, ...d });
          }
        });
        setAdmins(adminList);
      } catch (e) {
        console.warn("Failed to load admins:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Deep-linking ticketId
  useEffect(() => {
    if (ticketId && tickets.length > 0) {
      const found = tickets.find((t) => t.id === ticketId);
      if (found) setSelectedTicket(found);
    }
  }, [ticketId, tickets]);

  // Fetch ticket-specific logs
  useEffect(() => {
    if (!selectedTicket) {
      setLogs([]);
      return;
    }
    const logsRef = collection(db, `supportTickets/${selectedTicket.id}/logs`);
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      const l = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setLogs(l);
    }, (err) => {
      console.warn("logs snapshot error:", err);
    });

    return () => unsubLogs();
  }, [selectedTicket?.id]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    switch (filter) {
      case "resolved":
        return tickets.filter((t) => t.status === "Resolved");
      case "mine":
        return tickets.filter((t) => t.assignedTo === currentUserId);
      case "pending":
        return tickets.filter((t) => t.status === "Pending");
      case "new":
        return tickets.filter((t) => t.status === "New");
      case "ongoing":
      default:
        return tickets.filter((t) => t.status !== "Resolved");
    }
  }, [tickets, filter, currentUserId]);

  // Reply via email
// --- Reply via email
async function handleReply(ticket) {
  if (!ticket.userEmail) return Alert.alert("⚠️ No email found for this ticket.");

  const subject = encodeURIComponent(`Re: ${ticket.subject}`);
  const body = encodeURIComponent(`Hello,\n\nRegarding your support ticket:\n\n"${ticket.description}"\n\nBest,\nToures Support`);

  Linking.openURL(`mailto:${ticket.userEmail}?subject=${subject}&body=${body}`);

  // Activity log with full details
  await addDoc(collection(db, "activityLogs"), {
    actionType: "REPLY",
    actorName,
    actorId,
    targetEntity: "SupportTicket",
    targetId: ticket.id,
    details: `Replied via email to ${ticket.userEmail} regarding ticket: "${ticket.subject || 'Untitled'}"`,
    timestamp: serverTimestamp(),
  });
}


  // Update status
  async function handleStatusUpdate(ticketId, newStatus) {
    try {
      const ticketRef = doc(db, "supportTickets", ticketId);
      const updateData = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === "Resolved") updateData.resolvedAt = serverTimestamp();

      await updateDoc(ticketRef, updateData);

      // Audit log
      await addDoc(collection(db, "activityLogs"), {
        actionType: newStatus.toUpperCase(),
        actorName,
        actorId,
        targetEntity: "SupportTicket",
        targetId: ticketId,
        details: `Ticket status updated to ${newStatus}`,
        timestamp: serverTimestamp(),
      });

      // Ticket logs
      await addDoc(collection(db, `supportTickets/${ticketId}/logs`), {
        action: `Status changed to ${newStatus}`,
        by: actorName,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Updated", "Ticket status updated successfully.");
    } catch (e) {
      console.error("Error updating status:", e);
      Alert.alert("Error", "Failed to update status.");
    }
  }

  // Assign ticket
  async function handleAssign(ticketId, adminId) {
    try {
      const ticketRef = doc(db, "supportTickets", ticketId);
      await updateDoc(ticketRef, { assignedTo: adminId || null, updatedAt: serverTimestamp() });

      const assignedAdmin = admins.find((a) => a.id === adminId);
      const assignedEmail = assignedAdmin?.email || "Unassigned";

      // Audit log
      await addDoc(collection(db, "activityLogs"), {
        actionType: "ASSIGN",
        actorName,
        actorId,
        targetEntity: "SupportTicket",
        targetId: ticketId,
        details: adminId ? `Assigned to ${assignedEmail}` : "Unassigned",
        timestamp: serverTimestamp(),
      });

      await addDoc(collection(db, `supportTickets/${ticketId}/logs`), {
        action: adminId ? `Assigned to ${assignedEmail}` : "Unassigned",
        by: actorName,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Assigned", "Ticket assignment updated.");
    } catch (e) {
      console.error("Assign error:", e);
      Alert.alert("Error", "Failed to assign ticket.");
    }
  }

  // Add internal note
  async function handleAddNote() {
    if (!noteText.trim() || !selectedTicket) return;
    const note = noteText.trim();
    try {
      await addDoc(collection(db, "activityLogs"), {
        actionType: "NOTE",
        actorName,
        actorId,
        targetEntity: "SupportTicket",
        targetId: selectedTicket.id,
        details: `Note added: ${note}`,
        timestamp: serverTimestamp(),
      });

      await addDoc(collection(db, `supportTickets/${selectedTicket.id}/logs`), {
        action: `Note: ${note}`,
        by: actorName,
        createdAt: serverTimestamp(),
      });

      setNoteText("");
      Alert.alert("Saved", "Note saved to ticket activity log.");
    } catch (e) {
      console.error("Add note error:", e);
      Alert.alert("Error", "Failed to save note.");
    }
  }

  // Render ticket card
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.ticketCard} onPress={() => setSelectedTicket(item)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.subject} numberOfLines={1}>{item.subject || "Untitled Ticket"}</Text>
        <Text style={[styles.status, { color: item.status === "Resolved" ? "#16a34a" : item.status === "Pending" ? "#eab308" : "#0ea5e9" }]}>{item.status || "New"}</Text>
      </View>
      <Text style={styles.email}>{item.userEmail || "No email"}</Text>
      <Text style={styles.date}>{item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "Unknown date"}</Text>
      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 12, color: "#64748b" }}>{item.priority ? `Priority: ${item.priority}` : ""}</Text>
        {item.assignedTo && <Text style={{ fontSize: 12, color: "#475569" }}>• Assigned: {item.assignedTo}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Support Tickets</Text>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {["ongoing","pending","resolved","mine"].map((f) => (
          <TouchableOpacity key={f} style={[styles.tabButton, (filter===f) && styles.tabActive]} onPress={()=>setFilter(f)}>
            <Text style={[styles.tabText, (filter===f)&&styles.tabTextActive]}>
              {f==="ongoing"?"Ongoing":f==="pending"?"Pending":f==="resolved"?"Resolved":"My Tickets"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color="#0f172a" style={{marginTop:40}} /> : 
      filteredTickets.length===0 ? <Text style={styles.empty}>No tickets found for this filter.</Text> : 
      <FlatList data={filteredTickets} keyExtractor={item=>item.id} renderItem={renderItem} contentContainerStyle={{paddingBottom:60}} />}
      
      {/* Ticket Modal */}
      {selectedTicket && (
        <Modal visible={!!selectedTicket} animationType="slide" transparent onRequestClose={()=>setSelectedTicket(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedTicket.subject || "Untitled Ticket"}</Text>
                <Text style={styles.modalLabel}>Ticket ID: <Text style={styles.modalValue}>{selectedTicket.id}</Text></Text>
                <Text style={styles.modalLabel}>Email:</Text>
                <Text style={styles.modalValue}>{selectedTicket.userEmail || "Not provided"}</Text>
                <Text style={styles.modalLabel}>Description:</Text>
                <Text style={styles.modalDescription}>{selectedTicket.description || "No description provided."}</Text>

                {selectedTicket.screenshotUrl && (
                  <>
                    <Text style={styles.modalLabel}>Attached Screenshot:</Text>
                    <TouchableOpacity onPress={()=>setImageViewerOpen(true)}>
                      <Image source={{uri:selectedTicket.screenshotUrl}} style={styles.screenshot} resizeMode="contain" />
                    </TouchableOpacity>
                  </>
                )}

                <Text style={styles.modalLabel}>Status: <Text style={{color:selectedTicket.status==="Resolved"?"#16a34a":selectedTicket.status==="Pending"?"#eab308":"#0ea5e9",fontWeight:"700"}}>{selectedTicket.status||"New"}</Text></Text>

                <Text style={styles.modalLabel}>Submitted: <Text style={styles.modalValue}>{selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString() : "Unknown"}</Text></Text>

                {/* Status Picker */}
                <View style={{marginTop:12}}>
                  <Text style={[styles.modalLabel,{marginBottom:6}]}>Update Status</Text>
                  <View style={[styles.input,{padding:0}]}>
                    <Picker selectedValue={selectedTicket.status||"Pending"} onValueChange={(val)=>handleStatusUpdate(selectedTicket.id,val)} style={Platform.OS==="web"?{height:44}:{}}>
                      <Picker.Item label="Pending" value="Pending"/>
                      <Picker.Item label="Resolved" value="Resolved"/>
                    </Picker>
                  </View>
                </View>

                {/* Assignment Picker */}
                <View style={{marginTop:12}}>
                  <Text style={[styles.modalLabel,{marginBottom:6}]}>Assign To</Text>
                  <View style={[styles.input,{padding:0}]}>
                    <Picker selectedValue={selectedTicket.assignedTo||""} onValueChange={(val)=>handleAssign(selectedTicket.id,val)} style={Platform.OS==="web"?{height:44}:{}}>
                      <Picker.Item label="Unassigned" value=""/>
                      {admins.map(a=><Picker.Item key={a.id} label={a.displayName||a.email||a.id} value={a.id}/>)}
                    </Picker>
                  </View>
                </View>

                {/* Admin Note */}
                <View style={{marginTop:14}}>
                  <Text style={[styles.modalLabel,{marginBottom:6}]}>Add Internal Note</Text>
                  <TextInput style={[styles.input,{minHeight:80}]} placeholder="Private note for this ticket" value={noteText} onChangeText={setNoteText} multiline/>
                  <View style={{flexDirection:"row",justifyContent:"flex-end",marginTop:8}}>
                    <TouchableOpacity style={[styles.button,{backgroundColor:"#3b82f6"}]} onPress={handleAddNote}>
                      <Ionicons name="chatbox-ellipses-outline" size={16} color="#fff"/>
                      <Text style={styles.buttonText}>Save Note</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Activity Log */}
                <Text style={[styles.modalLabel,{marginTop:14}]}>Activity Log</Text>
                {logs.length===0?<Text style={{color:"#64748b",marginTop:6}}>No activity yet.</Text>:
                  logs.map(log=>(
                    <View key={log.id} style={{marginTop:8}}>
                      <Text style={{fontSize:13,color:"#0f172a",fontWeight:"700"}}>{log.action}</Text>
                      <Text style={{fontSize:12,color:"#64748b"}}>by {log.by} — {log.createdAt?.toDate?log.createdAt.toDate().toLocaleString():""}</Text>
                    </View>
                  ))
                }
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.actionButton,{backgroundColor:"#10b981"}]} onPress={()=>handleReply(selectedTicket)}>
                  <Ionicons name="mail-outline" size={18} color="#fff"/>
                  <Text style={styles.buttonText}>Reply via Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton,{backgroundColor:"#ef4444"}]} onPress={()=>setSelectedTicket(null)}>
                  <Ionicons name="close-outline" size={18} color="#fff"/>
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Fullscreen Image Viewer */}
          <Modal visible={imageViewerOpen} transparent animationType="fade">
            <TouchableOpacity style={{flex:1,backgroundColor:"#000",justifyContent:"center"}} onPress={()=>setImageViewerOpen(false)}>
              <Image source={{uri:selectedTicket.screenshotUrl}} style={{width:"100%",height:"90%",alignSelf:"center"}} resizeMode="contain"/>
            </TouchableOpacity>
          </Modal>
        </Modal>
      )}
    </View>
  );
}

// === Styles (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 16 },
  filterTabs: { flexDirection: "row", marginBottom: 16, backgroundColor: "#e2e8f0", borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontWeight: "600", color: "#475569", fontSize: 14 },
  tabTextActive: { color: "#0f172a" },
  ticketCard: { backgroundColor: "#fff", borderRadius: 8, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subject: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  email: { fontSize: 13, color: "#64748b", marginTop: 4 },
  date: { fontSize: 12, color: "#94a3b8", marginTop: 3 },
  status: { fontWeight: "700", fontSize: 14 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 40, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { backgroundColor: "#fff", borderRadius: 10, padding: 20, width: "100%", maxWidth: 850, maxHeight: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 10 },
  modalLabel: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginTop: 10 },
  modalValue: { fontWeight: "500", color: "#334155" },
  modalDescription: { fontSize: 15, color: "#334155", lineHeight: 22, marginTop: 6 },
  screenshot: { width: "100%", height: 180, borderRadius: 8, marginTop: 8 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", marginTop: 20, gap: 8 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  button: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, fontSize: 16, color: "#0f172a" },
});
