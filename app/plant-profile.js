import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSavedPlants } from '../contexts/SavedPlantsContext';
import { useReminders } from '../contexts/ReminderContext';
import * as PlantStorage from '../services/plantStorage';
import Toast from 'react-native-toast-message';
import { generatePlantPetName } from '../utils/nameGenerator';
import * as ImagePicker from 'expo-image-picker';

// Import components
import { OverviewTab, JournalTab, RemindersTab, InfoTab } from '../components/PlantProfile';

// Import styles
import { plantProfileStyles as styles } from '../styles/plantProfileStyles';

function PlantProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { removePlant } = useSavedPlants();
  const { getPlantReminders } = useReminders();
  const [plantReminders, setPlantReminders] = useState([]);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [petName, setPetName] = useState('');
  const [newImageUri, setNewImageUri] = useState(null);
  
  useEffect(() => {
    const loadPlant = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        // Get plant by ID using our storage service
        const plantData = await PlantStorage.getPlantById(id);
        setPlant(plantData);
        
        // Load reminders for this plant
        if (plantData) {
          const reminders = getPlantReminders(plantData.id);
          setPlantReminders(reminders);
        }
      } catch (error) {
        console.error('Error loading plant:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPlant();
  }, [id, getPlantReminders]);
  
  const handleDelete = async () => {
    try {
      if (!plant?.id) return;
      
      await removePlant(plant.id);
      Toast.show({
        type: 'success',
        text1: 'Plant removed',
        text2: `${plant.commonName || 'Plant'} has been removed from your collection`,
        position: 'top',
        visibilityTime: 2000,
      });
      router.back();
    } catch (error) {
      console.error('Error deleting plant:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not remove plant',
        position: 'top',
        visibilityTime: 2000,
      });
    }
  };
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab handleDelete={handleDelete} />;
      case 'journal':
        return <JournalTab />;
      case 'reminders':
        return <RemindersTab plantReminders={plantReminders} />;
      case 'info':
        return <InfoTab plant={plant} />;
      default:
        return null;
    }
  };
  
  // The renderInfoTab function has been moved to the InfoTab component
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }
  
  if (!plant) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#DDD" />
        <Text style={styles.emptyText}>Plant not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Get plant name for display
  const commonName = plant.petName || plant.commonName || plant.plantData?.commonName || 'Unknown Plant';
  
  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{commonName}</Text>
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => {
            setPetName(plant.petName || plant.commonName || '');
            setIsRenameModalVisible(true);
          }}
        >
          <MaterialIcons name="edit" size={24} color="#2E7D32" />
        </TouchableOpacity>
      </View>
      
      {/* Plant image or placeholder */}
      {plant.imageUri ? (
        <Image 
          source={{ uri: plant.imageUri }} 
          style={styles.plantImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialIcons name="camera-alt" size={48} color="#FFFFFF" />
          <Text style={styles.imagePlaceholderText}>Add a photo</Text>
        </View>
      )}
      
      {/* Tab navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'overview' && styles.activeTabItem]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialIcons 
            name="home" 
            size={24} 
            color={activeTab === 'overview' ? '#2E7D32' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'journal' && styles.activeTabItem]}
          onPress={() => setActiveTab('journal')}
        >
          <MaterialCommunityIcons 
            name="notebook-outline" 
            size={24} 
            color={activeTab === 'journal' ? '#2E7D32' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>Journal</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'reminders' && styles.activeTabItem]}
          onPress={() => setActiveTab('reminders')}
        >
          <MaterialCommunityIcons 
            name="bell-outline" 
            size={24} 
            color={activeTab === 'reminders' ? '#2E7D32' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.activeTabText]}>Reminders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === 'info' && styles.activeTabItem]}
          onPress={() => setActiveTab('info')}
        >
          <MaterialIcons 
            name="info-outline" 
            size={24} 
            color={activeTab === 'info' ? '#2E7D32' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Info</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab content */}
      {renderTabContent()}
      
      {/* Rename Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isRenameModalVisible}
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rename Plant</Text>
              <Text style={styles.modalSubtitle}>Give your plant a pet name</Text>
              
              <TextInput
                style={styles.textInput}
                value={petName}
                onChangeText={setPetName}
                placeholder="Enter a pet name"
              />
              
              <TouchableOpacity 
                style={styles.generateNameButton}
                onPress={() => {
                  // Generate a fun name using the plant's common name as context if available
                  const plantType = plant.commonName || plant.plantData?.commonName || '';
                  const funName = generatePlantPetName(plantType);
                  setPetName(funName);
                }}
              >
                <MaterialIcons name="auto-fix-high" size={20} color="#2E7D32" />
                <Text style={styles.generateNameButtonText}>Generate Fun Name</Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Update Plant Image</Text>
              
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: newImageUri || plant.imageUri }} 
                  style={styles.imagePreview} 
                  resizeMode="cover"
                />
              </View>
              
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={async () => {
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
                        setNewImageUri(result.assets[0].uri);
                      }
                    } catch (error) {
                      console.error('Error taking picture:', error);
                      Alert.alert('Error', 'Failed to take picture. Please try again.');
                    }
                  }}
                >
                  <MaterialIcons name="camera-alt" size={20} color="#2E7D32" />
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={async () => {
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
                        setNewImageUri(result.assets[0].uri);
                      }
                    } catch (error) {
                      console.error('Error picking image:', error);
                      Alert.alert('Error', 'Failed to pick image. Please try again.');
                    }
                  }}
                >
                  <MaterialIcons name="photo-library" size={20} color="#2E7D32" />
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsRenameModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={async () => {
                    try {
                      // Prepare update data
                      const updateData = { petName };
                      
                      // Add image URI if a new image was selected
                      if (newImageUri) {
                        updateData.imageUri = newImageUri;
                      }
                      
                      // Update the plant with the new data
                      const updatedPlant = await PlantStorage.updatePlant(plant.id, updateData);
                      if (updatedPlant) {
                        setPlant(updatedPlant);
                        Toast.show({
                          type: 'success',
                          text1: 'Plant updated',
                          text2: newImageUri ? 'Name and image updated' : `Renamed to ${petName}`,
                          position: 'top',
                          visibilityTime: 2000,
                        });
                      }
                    } catch (error) {
                      console.error('Error updating plant:', error);
                      Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Could not update plant',
                        position: 'top',
                        visibilityTime: 2000,
                      });
                    } finally {
                      setIsRenameModalVisible(false);
                      setNewImageUri(null); // Reset image state
                    }
                  }}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Styles have been moved to /styles/plantProfileStyles.js

export default PlantProfileScreen;
