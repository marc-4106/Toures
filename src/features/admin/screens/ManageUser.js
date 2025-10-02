// components/UserList.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';

export default function UserList({ onSelectUser }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    });

    return () => unsub();
  }, []);

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelectUser(item)}>
          <View style={{ padding: 12, borderBottomWidth: 1 }}>
            <Text>{item.displayName} ({item.email})</Text>
            <Text>Role: {item.role}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}
