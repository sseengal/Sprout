import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { JournalEntry } from './JournalEntry';
import { getJournalEntries, addJournalEntry } from '../../services/plantStorage';

export const JournalTab = ({ plantId }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEntry, setNewEntry] = useState({
    description: '',
    images: [],
    type: 'note'
  });

  // Load journal entries when component mounts or plantId changes
  useEffect(() => {
    if (!plantId) {
      console.error('No plantId provided to JournalTab');
      return;
    }

    const loadEntries = async () => {
      try {
        setIsLoading(true);
        const loadedEntries = await getJournalEntries(plantId);
        setEntries(loadedEntries);
      } catch (error) {
        console.error('Failed to load journal entries:', error);
        Alert.alert('Error', 'Failed to load journal entries');
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, [plantId]);

  const takePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        addImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to select photos');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        addImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const addImage = (uri) => {
    if (newEntry.images.length >= 5) {
      Alert.alert('Maximum images', 'You can only add up to 5 images per entry.');
      return;
    }
    
    setNewEntry(prev => ({
      ...prev,
      images: [...prev.images, { uri }]
    }));
  };

  const removeImage = (index) => {
    const updatedImages = [...newEntry.images];
    updatedImages.splice(index, 1);
    setNewEntry({
      ...newEntry,
      images: updatedImages
    });
  };

  const handleAddEntry = async () => {
    if (!plantId) {
      Alert.alert('Error', 'Cannot save entry: No plant ID available');
      return;
    }

    if (!newEntry.description.trim() && newEntry.images.length === 0) {
      // Don't save empty entries
      return;
    }

    try {
      setIsLoading(true);
      
      // Create the entry object
      const entry = {
        type: newEntry.type,
        description: newEntry.description.trim(),
        images: [...newEntry.images],
        date: new Date().toISOString()
      };
      
      // Save the entry
      await addJournalEntry(plantId, entry);
      
      // Reload entries to ensure we have the latest data
      const updatedEntries = await getJournalEntries(plantId);
      setEntries(updatedEntries);
      
      // Reset form and close modal
      setNewEntry({
        description: '',
        images: [],
        title: 'Journal Entry',
        type: 'note'
      });
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Failed to save journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && entries.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading journal entries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {entries.length === 0 ? (
          <View style={styles.centered}>
            <Text>No journal entries yet. Add your first entry!</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <JournalEntry key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Journal Entry</Text>
              <Text style={styles.modalSubtitle}>Record your plant's progress</Text>
              
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollViewContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { minHeight: 100, textAlignVertical: 'top' }]}
                  placeholder="Add notes about your plant..."
                  multiline
                  numberOfLines={4}
                  value={newEntry.description}
                  onChangeText={(text) => setNewEntry({...newEntry, description: text})}
                />

                <Text style={styles.inputLabel}>Images ({newEntry.images.length}/5)</Text>
                
                {/* Images row with horizontal scrolling */}
                <View style={styles.imagesSection}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesScrollView}
                    contentContainerStyle={styles.imagesScrollViewContent}
                  >
                    {newEntry.images.map((image, index) => (
                      <View key={index} style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: image.uri }} 
                          style={styles.imagePreview} 
                          resizeMode="cover"
                        />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <MaterialIcons name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Camera/Gallery Buttons - Always visible when under limit */}
                  {newEntry.images.length < 5 && (
                    <View style={styles.imageButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.imageButton}
                        onPress={takePhoto}
                      >
                        <MaterialIcons name="camera-alt" size={20} color="#2E7D32" />
                        <Text style={styles.imageButtonText}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.imageButton}
                        onPress={pickFromGallery}
                      >
                        <MaterialIcons name="photo-library" size={20} color="#2E7D32" />
                        <Text style={styles.imageButtonText}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton, 
                      styles.saveButton, 
                      (!newEntry.description.trim() && newEntry.images.length === 0) && { opacity: 0.5 }
                    ]}
                    onPress={handleAddEntry}
                    disabled={!newEntry.description.trim() && newEntry.images.length === 0}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#4CAF50',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalScrollView: {
    width: '100%',
    marginBottom: 16,
  },
  modalScrollViewContent: {
    paddingBottom: 20,
  },
  imagesSection: {
    marginBottom: 16,
  },
  imagesScrollView: {
    marginBottom: 16,
    maxHeight: 120, // Slightly more than thumbnail height
  },
  imagesScrollViewContent: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  imagePreviewContainer: {
    width: 70,
    height: 105,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 8, // Add some horizontal padding
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginHorizontal: 4,
  },
  imageButtonText: {
    color: '#2E7D32',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },

  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#757575',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#4CAF50',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
