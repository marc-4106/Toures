import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	FlatList,
	TouchableOpacity,
	Image,
	Modal,
	Alert,
} from 'react-native';
import { db } from '../../../services/firebaseConfig';
import {
	collection,
	addDoc,
	getDocs,
	doc,
	deleteDoc,
	updateDoc,
} from 'firebase/firestore';

const UserManagement = () => {
	const [search, setSearch] = useState('');
	const [users, setUsers] = useState([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] =
		useState(false);
	const [userToDelete, setUserToDelete] = useState(null);

	const [newUser, setNewUser] = useState({
		name: '',
		email: '',
		password: '',
		role: ['User'], // Use 'role', not 'roles'
	});

	// Fetch users from Firestore
	useEffect(() => {
		const fetchUsers = async () => {
			const querySnapshot = await getDocs(collection(db, 'users'));
			const data = querySnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			setUsers(data);
		};
		fetchUsers();
	}, []);

	const filteredUsers = users.filter((user) =>
		user.name?.toLowerCase().includes(search.toLowerCase())
	);

	const handleAddUser = async () => {
		if (!newUser.name || !newUser.email || !newUser.password) {
			Alert.alert('Please fill all fields');
			return;
		}

		try {
			const docRef = await addDoc(collection(db, 'users'), {
				...newUser,
				avatar: `https://i.pravatar.cc/150?u=${newUser.email}`,
				lastActive: new Date().toDateString(),
				dateAdded: new Date().toDateString(),
			});
			setUsers((prev) => [...prev, { id: docRef.id, ...newUser }]);
			setModalVisible(false);
			setNewUser({ name: '', email: '', password: '', role: ['User'] });
		} catch (error) {
			console.error('Error adding user: ', error);
		}
	};
	const handleEditUser = (user) => {
		setIsEditMode(true);
		setSelectedUserId(user.id);
		setNewUser({
			name: user.name,
			email: user.email,
			password: user.password || '',
			role: [user.role],
		});
		setModalVisible(true);
	};

	const handleSaveEdit = async () => {
		if (!selectedUserId) return;

		try {
			await updateDoc(doc(db, 'users', selectedUserId), {
				name: newUser.name,
				email: newUser.email,
				role: newUser.role[0],
				lastActive: new Date().toDateString(),
			});

			setUsers((prev) =>
				prev.map((u) =>
					u.id === selectedUserId
						? { ...u, ...newUser, role: newUser.role[0] }
						: u
				)
			);

			// Reset modal states
			setModalVisible(false);
			setIsEditMode(false);
			setSelectedUserId(null);
			setNewUser({ name: '', email: '', password: '', role: ['User'] });
		} catch (error) {
			console.error('Error updating user:', error);
		}
	};

	const confirmDeleteUser = (user) => {
		setUserToDelete(user);
		setConfirmDeleteModalVisible(true);
	};

	const deleteUser = async () => {
		if (!userToDelete) return;
		try {
			await deleteDoc(doc(db, 'users', userToDelete.id));
			setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
			setConfirmDeleteModalVisible(false);
			setUserToDelete(null);
		} catch (error) {
			console.error('Error deleting user:', error);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>User Management</Text>
			</View>

			{/* Search & Add */}
			<View style={styles.searchRow}>
				<TextInput
					style={styles.searchInput}
					placeholder='Search'
					value={search}
					onChangeText={setSearch}
				/>
				<TouchableOpacity
					style={styles.addButton}
					onPress={() => setModalVisible(true)}>
					<Text style={styles.addText}>+ Add user</Text>
				</TouchableOpacity>
			</View>

			{/* List Headers */}
			<View style={styles.listHeader}>
				<Text style={[styles.headerText, { flex: 2 }]}>User name</Text>
				<Text style={[styles.headerText, { flex: 2 }]}>Access</Text>
				<Text style={styles.headerText}>Last active</Text>
				<Text style={styles.headerText}>Date added</Text>
				<Text style={styles.headerText}>Actions</Text>
			</View>

			{/* User List */}
			<FlatList
				data={filteredUsers}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<View style={styles.userRow}>
						<View style={[styles.userInfo, { flex: 2 }]}>
							<Image source={{ uri: item.avatar }} style={styles.avatar} />
							<View>
								<Text style={styles.name}>{item.name}</Text>
								<Text style={styles.email}>{item.email}</Text>
							</View>
						</View>

						<View style={[styles.rolesContainer, { flex: 2 }]}>
							<View style={styles.roleBadge}>
								<Text style={styles.roleText}>{item.role}</Text>
							</View>
						</View>

						<Text style={styles.detailText}>{item.lastActive}</Text>
						<Text style={styles.detailText}>{item.dateAdded}</Text>

						{/* ✅ ACTION BUTTONS */}
						<View style={styles.actionsContainer}>
							<TouchableOpacity
								style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
								onPress={() => handleEditUser(item)}>
								<Text style={styles.actionText}>Edit</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.actionButton, { backgroundColor: '#F44336' }]}
								onPress={() => confirmDeleteUser(item)}>
								<Text style={styles.actionText}>Delete</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			/>

			{/* Add User Modal */}
			<Modal visible={modalVisible} animationType='slide' transparent>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.title}>Add New User</Text>
						<TextInput
							placeholder='Name'
							style={styles.input}
							value={newUser.name}
							onChangeText={(text) => setNewUser({ ...newUser, name: text })}
						/>
						<TextInput
							placeholder='Email'
							style={styles.input}
							value={newUser.email}
							onChangeText={(text) => setNewUser({ ...newUser, email: text })}
						/>
						<TextInput
							placeholder='Password'
							style={styles.input}
							secureTextEntry
							value={newUser.password}
							onChangeText={(text) =>
								setNewUser({ ...newUser, password: text })
							}
						/>

						<View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
							<TouchableOpacity
								onPress={() => setNewUser({ ...newUser, role: ['Admin'] })}
								style={[
									styles.roleSelectButton,
									newUser.role[0] === 'Admin' && styles.selectedRole,
								]}>
								<Text>Admin</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setNewUser({ ...newUser, role: ['User'] })}
								style={[
									styles.roleSelectButton,
									newUser.role[0] === 'User' && styles.selectedRole,
								]}>
								<Text>User</Text>
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={styles.addButton}
							onPress={isEditMode ? handleSaveEdit : handleAddUser}>
							<Text style={styles.addText}>
								{isEditMode ? 'Update User' : 'Save User'}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => setModalVisible(false)}
							style={{ marginTop: 10 }}>
							<Text style={{ color: 'red', textAlign: 'center' }}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
			<Modal
				visible={confirmDeleteModalVisible}
				transparent
				animationType='fade'>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text
							style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
							Confirm Deletion
						</Text>
						<Text style={{ marginBottom: 20 }}>
							Are you sure you want to delete{' '}
							<Text style={{ fontWeight: 'bold' }}>{userToDelete?.name}</Text>?
						</Text>

						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'flex-end',
								gap: 10,
							}}>
							<TouchableOpacity
								onPress={() => setConfirmDeleteModalVisible(false)}
								style={[styles.actionButton, { backgroundColor: '#888' }]}>
								<Text style={styles.actionText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={deleteUser}
								style={[styles.actionButton, { backgroundColor: '#F44336' }]}>
								<Text style={styles.actionText}>Delete</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, padding: 16, backgroundColor: '#fff' },
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	title: { fontSize: 24, fontWeight: 'bold' },
	profileImage: { width: 40, height: 40, borderRadius: 20 },
	searchRow: {
		flexDirection: 'row',
		marginVertical: 16,
		gap: 10,
		alignItems: 'center',
	},
	searchInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 10,
		borderRadius: 10,
		backgroundColor: '#f9f9f9',
	},
	filterButton: {
		backgroundColor: '#eaeaea',
		padding: 10,
		borderRadius: 10,
	},
	addButton: {
		backgroundColor: '#0F37F1',
		padding: 10,
		borderRadius: 10,
	},
	filterText: { color: '#000' },
	addText: { color: '#fff', fontWeight: 'bold' },
	listHeader: {
		flexDirection: 'row',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderColor: '#eee',
	},
	headerText: {
		fontWeight: '600',
		color: '#666',
		flex: 1,
		fontSize: 14,
	},
	userRow: {
		flexDirection: 'row',
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderColor: '#f0f0f0',
		alignItems: 'center',
	},
	userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
	name: { fontWeight: '600', fontSize: 16 },
	email: { color: '#888', fontSize: 12 },
	rolesContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
	},
	roleBadge: {
		backgroundColor: '#0F37F1',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	roleText: { fontSize: 12, color: '#fff' },
	detailText: { flex: 1, fontSize: 13, color: '#FFFFFF' },
	pagination: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginVertical: 16,
		gap: 10,
	},
	pageNumber: {
		padding: 10,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#ccc',
	},
	modalContainer: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 10,
		width: '90%',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 8,
		marginBottom: 10,
	},
	roleSelectButton: {
		flex: 1,
		padding: 10,
		borderWidth: 1,
		borderColor: '#888',
		borderRadius: 8,
		alignItems: 'center',
	},
	selectedRole: {
		backgroundColor: '#ccc',
	},
	actionsContainer: {
		flex: 1,
		flexDirection: 'row',
		gap: 8,
		justifyContent: 'flex-start',
	},
	actionButton: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 6,
		alignItems: 'center',
	},
	actionText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
});

export default UserManagement;
