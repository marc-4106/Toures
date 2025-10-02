import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, Modal, Pressable, RefreshControl } from 'react-native';
import { auth, db } from '../../../services/firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import noimage from '../../../../assets/noimage.jpg';

const UnderDevelopmentModal = ({ visible, onClose }) => {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.modalOverlay} onPress={onClose}>
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>Under Development</Text>
          <Text style={modalStyles.modalMessage}>
            This feature is currently under development. Please check back later!
          </Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.modalButton}>
            <Text style={modalStyles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const MyListScreen = () => {
  const [selectedItemToDelete, setSelectedItemToDelete] = useState(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);
  const [developmentModalVisible, setDevelopmentModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyList = async (uid) => {
    // Set loading/refreshing states true immediately when fetch starts
    setLoading(true);
    // refreshing state is managed by onRefresh caller, but ensure it's reset in finally
    
    if (!uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const listRef = collection(db, 'users', uid, 'myList');
      const snapshot = await getDocs(listRef);

      const savedDestinations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          imageUrl: data.imageURL || data.imageUrl || null,
          ...data,
        };
      });

      setMyList(savedDestinations);
    } catch (error) {
      console.error('Error fetching My List:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Ensure fetchMyList is called with the current userUid
    if (userUid) {
      fetchMyList(userUid);
    } else {
      // If userUid is not available, stop refreshing immediately
      setRefreshing(false);
    }
  }, [userUid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        // Call fetchMyList directly once user UID is available
        fetchMyList(user.uid);
      } else {
        setUserUid(null);
        setMyList([]);
        setLoading(false);
        setRefreshing(false); // Reset refreshing if user logs out
      }
    });

    return () => unsubscribe();
  }, []); // Empty dependency array to run only on mount/unmount

  const handleDelete = async () => {
  if (!userUid || !selectedItemToDelete) return;

  try {
    await deleteDoc(doc(db, 'users', userUid, 'myList', selectedItemToDelete.id));
    setMyList(prev => prev.filter(item => item.id !== selectedItemToDelete.id));
  } catch (error) {
    console.error('Error deleting item:', error);
  } finally {
    setConfirmDeleteVisible(false);
    setSelectedItemToDelete(null);
  }
};

  const handleGetDirection = (item) => {
    setDevelopmentModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemBox}>
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : noimage}
        style={styles.image}
        onError={(e) => console.log('Image loading error:', e.nativeEvent.error, item.imageUrl)}
      />
      
      <View style={styles.itemContentRight}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          {item.description && <Text style={styles.description} numberOfLines={2}>{item.description}</Text>}
        </View>
        
        <View style={styles.buttonContainer}>
  <TouchableOpacity
    style={styles.getDirectionButton}
    onPress={() => handleGetDirection(item)}
  >
    <Text style={styles.getDirectionButtonText}>Get Direction</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.getDirectionButton, { backgroundColor: '#ff4d4d', marginLeft: 10 }]}
    onPress={() => {
      setSelectedItemToDelete(item);
      setConfirmDeleteVisible(true);
    }}
  >
    <Text style={styles.getDirectionButtonText}>Remove</Text>
  </TouchableOpacity>
</View>
        
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My List</Text>
      {/* Show loading spinner only if actively loading and not just refreshing */}
      {loading && myList.length === 0 ? (
        <ActivityIndicator size="large" color="#1badf9" style={styles.loadingIndicator} />
      ) : myList.length === 0 ? (
        <Text style={styles.noData}>No saved destinations</Text>
      ) : (
        <FlatList
          data={myList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1badf9"
              colors={['#1badf9']}
            />
          }
        />
      )}

      <UnderDevelopmentModal
        visible={developmentModalVisible}
        onClose={() => setDevelopmentModalVisible(false)}
      />
      <Modal
  transparent
  visible={confirmDeleteVisible}
  animationType="fade"
  onRequestClose={() => setConfirmDeleteVisible(false)}
>
  <Pressable style={modalStyles.modalOverlay} onPress={() => setConfirmDeleteVisible(false)}>
    <View style={modalStyles.modalContainer}>
      <Text style={modalStyles.modalTitle}>Confirm Deletion</Text>
      <Text style={modalStyles.modalMessage}>
        Are you sure you want to remove "{selectedItemToDelete?.name}"?
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[modalStyles.modalButton, { backgroundColor: '#ff4d4d' }]}
          onPress={handleDelete}
        >
          <Text style={modalStyles.modalButtonText}>Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={modalStyles.modalButton}
          onPress={() => setConfirmDeleteVisible(false)}
        >
          <Text style={modalStyles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Pressable>
</Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  list: {
    gap: 12,
    paddingBottom: 20
  },
  itemBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#e0e0e0',
    flexShrink: 0,
  },
  itemContentRight: {
    flex: 1,
    justifyContent: 'space-between',
    height: 90,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#666',
    flexShrink: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  getDirectionButton: {
    backgroundColor: '#1badf9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  getDirectionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noData: {
    textAlign: 'center',
    marginTop: 40,
    color: '#888',
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 50,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  modalButton: {
    backgroundColor: '#1badf9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyListScreen;
