import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSavedPlants } from '../contexts/SavedPlantsContext';
import { useReminders } from '../contexts/ReminderContext';
import * as PlantStorage from '../services/plantStorage';
import Toast from 'react-native-toast-message';

// Import components
import { OverviewTab, JournalTab, RemindersTab, InfoTab } from '../components/PlantProfile';

// Import styles
import { plantProfileStyles as styles } from '../styles/plantProfileStyles';

export default function PlantProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { removePlant } = useSavedPlants();
  const { getPlantReminders } = useReminders();
  const [plantReminders, setPlantReminders] = useState([]);
  
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
  const commonName = plant.commonName || plant.plantData?.commonName || 'Unknown Plant';
  
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
        <View style={styles.headerRight} />
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
    </View>
  );
}

// Styles have been moved to /styles/plantProfileStyles.js
