import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedPlants } from '../contexts/SavedPlantsContext';
import { useReminders } from '../contexts/ReminderContext';

// Tab components
import PlantOverviewTab from '../components/plant-profile/PlantOverviewTab';
import PlantJournalTab from '../components/plant-profile/PlantJournalTab';
import PlantRemindersTab from '../components/plant-profile/PlantRemindersTab';
import PlantInfoTab from '../components/plant-profile/PlantInfoTab';

export default function PlantProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { savedPlants, removePlant } = useSavedPlants();
  const { getPlantReminders } = useReminders();
  
  const [plant, setPlant] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [plantReminders, setPlantReminders] = useState([]);
  
  // Find the plant data based on the ID
  useEffect(() => {
    if (id && savedPlants.length > 0) {
      // Convert id to string for comparison since URL params are always strings
      const plantId = String(id);
      console.log('Looking for plant with ID:', plantId);
      console.log('Available plant IDs:', savedPlants.map(p => String(p.id)));
      
      const foundPlant = savedPlants.find(p => String(p.id) === plantId);
      if (foundPlant) {
        console.log('Found plant:', foundPlant.plantData?.commonName);
        setPlant(foundPlant);
        setPlantReminders(getPlantReminders(plantId));
      } else {
        // Plant not found, go back to My Plants
        console.log('Plant not found with ID:', plantId);
        Alert.alert('Error', 'Plant not found');
        router.back();
      }
    }
  }, [id, savedPlants, getPlantReminders, router]);
  
  // Handle removing the plant
  const handleRemovePlant = () => {
    Alert.alert(
      'Remove Plant',
      'Are you sure you want to remove this plant from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            if (plant && plant.id) {
              // Convert ID to string to ensure consistent type
              const plantId = String(plant.id);
              removePlant(plantId);
              router.back();
            }
          }
        }
      ]
    );
  };
  
  if (!plant) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {plant.plantData?.commonName || 'Plant Details'}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Plant Image */}
      <View style={styles.imageContainer}>
        {plant.imageUri ? (
          <Image 
            source={{ uri: plant.imageUri }} 
            style={styles.plantImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImageContainer}>
            <MaterialIcons name="camera-alt" size={40} color="#fff" />
            <Text style={styles.noImageText}>Add a photo</Text>
          </View>
        )}
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'journal' && styles.activeTab]}
          onPress={() => setActiveTab('journal')}
        >
          <Text style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'reminders' && styles.activeTab]}
          onPress={() => setActiveTab('reminders')}
        >
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.activeTabText]}>
            Reminders
            {plantReminders.length > 0 && (
              <Text style={styles.badgeText}> {plantReminders.length}</Text>
            )}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Info</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab Content */}
      <ScrollView style={styles.contentContainer}>
        {activeTab === 'overview' && (
          <PlantOverviewTab plant={plant} onRemove={handleRemovePlant} />
        )}
        {activeTab === 'journal' && (
          <PlantJournalTab plant={plant} />
        )}
        {activeTab === 'reminders' && (
          <PlantRemindersTab plant={plant} reminders={plantReminders} />
        )}
        {activeTab === 'info' && (
          <PlantInfoTab plant={plant} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40, // To balance the header
  },
  imageContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#e0e0e0',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  badgeText: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
});
