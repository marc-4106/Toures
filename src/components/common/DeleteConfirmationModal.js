import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

const DeleteConfirmationModal = ({ visible, onClose, onConfirm, itemName }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.deleteModalView}>
          <Text style={styles.deleteModalTitle}>Confirm Permanent Deletion</Text>
          <Text style={styles.deleteModalText}>
            Are you sure you want to permanently delete "{itemName}"? This action cannot be undone.
          </Text>
          <View style={styles.deleteModalButtons}>
            <Pressable style={[styles.modalButton, styles.cancelDeleteButton]} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.modalButton, styles.confirmDeleteButton]} onPress={onConfirm}>
              <Text style={[styles.modalButtonText, { color: 'white' }]}>Delete Permanently</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalView: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#F1F1F1',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 16,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    flex: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelDeleteButton: {
    backgroundColor: '#ccc',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc3545',
  },
});

export default DeleteConfirmationModal;