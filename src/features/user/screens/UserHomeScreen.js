import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
  Image,
  FlatList,
  RefreshControl,
  Linking,
  Alert,
  Platform,
  Modal, BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { collection, getDocs, getDoc, query, where, doc, setDoc  } from 'firebase/firestore';
import { db, auth} from '../../../services/firebaseConfig';
import UnderDevelopmentModal from '../../../components/common/UnderDevelopmentModal';
import noimage from '../../../../assets/noimage.jpg';
import { useFocusEffect } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [backModalVisible, setBackModalVisible] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [refreshing, setRefreshing] = useState(false);

  const categories = ['Popular', 'Hotel', 'Restaurant', 'Resort', 'Mall', 'Heritage'];

  const [categoryData, setCategoryData] = useState({
    Popular: [],
    Hotel: [],
    Restaurant: [],
    Resort: [],
    Mall: [],
    Heritage: [],
  });
  const [filteredSliderData, setFilteredSliderData] = useState([]);

  const fetchDestinations = async () => {
  try {
    const destinationsQuery = query(
      collection(db, 'destinations'),
      where('isArchived', '!=', true)
    );
    const querySnapshot = await getDocs(destinationsQuery);

    const categorized = {
      Popular: [],
      Hotel: [],
      Restaurant: [],
      Resort: [],
      Mall: [],
      Heritage: [],
    };
    const tempSliderData = [];

    querySnapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const destinationId = docSnapshot.id;
      const { category, name, imageURL, description, coordinates, isFeatured } = data;

      let latitude = null;
      let longitude = null;

      if (
        coordinates &&
        typeof coordinates === 'object' &&
        coordinates !== null &&
        !Array.isArray(coordinates)
      ) {
        latitude = coordinates.latitude;
        longitude = coordinates.longitude;
      }

      const destinationData = { id: destinationId, ...data, latitude, longitude };

    
      if (isFeatured === true) {
        tempSliderData.push({
  id: destinationId,
  title: name,
  image:
    typeof imageURL === 'string' && imageURL.startsWith('http')
      ? { uri: imageURL }
      : noimage,
});
      }

    
      if (Array.isArray(category)) {
        category.forEach((cat) => {
          if (categorized[cat]) {
            categorized[cat].push(destinationData);
          }
        });
      } else if (categorized[category]) {
        categorized[category].push(destinationData);
      }
    });

    setCategoryData(categorized);
    setFilteredSliderData(tempSliderData.slice(0, 4));
  } catch (error) {
    console.error('Error fetching destinations:', error);
  } finally {
    setRefreshing(false);
  }
};


  useEffect(() => {
    fetchDestinations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDestinations();
  }, []);

  const dataToShow = categoryData[selectedCategory] || [];

// const handleAddToList = async (item) => {
//   const user = auth.currentUser;
//   if (!user) return;

//   const docRef = doc(db, 'users', user.uid, 'myList', item.id);
//   await setDoc(docRef, item);  
// };

const handleAddToList = async (item) => {
  const user = auth.currentUser;
  if (!user) return;

  const docRef = doc(db, 'users', user.uid, 'myList', item.id);

  try {
    const existingDoc = await getDoc(docRef);

    if (existingDoc.exists()) {
      Alert.alert("Already Saved", "This destination is already in your list.");
    } else {
      await setDoc(docRef, item);
      Alert.alert("Saved", "Destination added to your list.");
    }
  } catch (error) {
    console.error("Error adding to list:", error);
    Alert.alert("Error", "Something went wrong while saving.");
  }
};

  useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      setBackModalVisible(true); 
      return true; 
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [])
);


  const renderItem = ({ item }) => (
    <View style={styles.itemBox}>
      <Image
        source={item.imageURL ? { uri: item.imageURL } : noimage}
        style={styles.itemImage}
      />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description || 'No description available.'}
        </Text>
        <View style={styles.itemButtonsContainer}>
          <TouchableOpacity onPress={() => handleAddToList(item)} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Add to My List</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Get Direction</Text>
          </TouchableOpacity>
          <UnderDevelopmentModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
          />
        </View>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.contentArea}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {categories.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setSelectedCategory(item)}
            style={styles.categoryItem}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextSelected,
              ]}
            >
              {item}
            </Text>
            {selectedCategory === item && <View style={styles.underline} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#888"
          />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notification')}
          style={styles.iconContainer}
        >
          <Icon name="notifications-outline" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.sliderContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={screenWidth}
          pagingEnabled
          decelerationRate="fast"
        >
          {filteredSliderData.map((item) => (
            <View key={item.id} style={styles.slide}>
              <Image source={item.image} style={styles.slideImage} />
              <View style={styles.titleContainer}>
                <Text style={styles.slideText}>{item.title}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={dataToShow}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={true}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.flatListContentContainer}
        ListEmptyComponent={
          <View style={styles.noDataView}>
            <Text style={styles.noDataText}>No data as of the moment</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.flatList}
      />
      <Modal
  transparent
  visible={backModalVisible}
  animationType="fade"
  onRequestClose={() => setBackModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Logout?</Text>
      <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>

      <View style={styles.modalButtons}>
        <TouchableOpacity
          onPress={() => setBackModalVisible(false)}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setBackModalVisible(false);
            navigation.replace('Login');
          }}
          style={styles.logoutConfirmButton}
        >
          <Text style={styles.logoutConfirmText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </View>
  );
};

const COMMON_HEIGHT = 48;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    height: COMMON_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    marginRight: 10,
  },
  searchInput: {
    fontSize: 16,
  },
  iconContainer: {
    width: COMMON_HEIGHT,
    height: COMMON_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sliderContainer: {
    marginTop: 20,
  },
  slide: {
    width: screenWidth,
    height: 220,
    position: 'relative',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slideText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  contentArea: {
    marginTop: 10,
  },
  categoryList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  categoryText: {
    fontSize: 16,
    color: '#888',
  },
  categoryTextSelected: {
    color: '#1badf9',
    fontWeight: '600',
  },
  underline: {
    marginTop: 4,
    height: 2,
    width: '100%',
    backgroundColor: '#1badf9',
    borderRadius: 1,
  },
  flatList: {
    flex: 1,
  },
  flatListContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#ccc',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemButtonsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#1badf9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDataView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
  },
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 20,
  alignItems: 'center',
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
},
modalMessage: {
  fontSize: 16,
  textAlign: 'center',
  marginBottom: 20,
},
modalButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
},
cancelButton: {
  flex: 1,
  paddingVertical: 10,
  marginRight: 10,
  backgroundColor: '#ccc',
  borderRadius: 5,
  alignItems: 'center',
},
cancelText: {
  fontSize: 16,
  color: '#333',
},
logoutConfirmButton: {
  flex: 1,
  paddingVertical: 10,
  backgroundColor: '#FF3B30',
  borderRadius: 5,
  alignItems: 'center',
},
logoutConfirmText: {
  fontSize: 16,
  color: '#fff',
  fontWeight: 'bold',
},

});

export default HomeScreen;