import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Switch,
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useReminders } from '../contexts/ReminderContext';
import { useSavedPlants } from '../contexts/SavedPlantsContext';
import { useRouter } from 'expo-router';
import ReminderItem from '../components/reminders/ReminderItem';
import ReminderModal from '../components/reminders/ReminderModal';
import RemindersHeader from '../components/common/RemindersHeader';
import * as NotificationService from '../services/notificationService';

/**
 * Care Reminders page
 */
export default function RemindersScreen() {
  const { 
    reminders, 
    toggleReminderEnabled, 
    toggleAllReminders,
    areAllRemindersEnabled,
    deleteReminder,
    completeReminder,
    updateReminder
  } = useReminders();
  
  const { savedPlants } = useSavedPlants();
  const router = useRouter();
  
  const [allEnabled, setAllEnabled] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);
  
  // Update the all enabled state when reminders change
  useEffect(() => {
    setAllEnabled(areAllRemindersEnabled());
  }, [reminders, areAllRemindersEnabled]);
  
  // Filter out reminders for plants that have been deleted
  useEffect(() => {
    const checkForDeletedPlantReminders = async () => {
      // Create a set of saved plant IDs for faster lookup
      const savedPlantIds = new Set(savedPlants.map(plant => plant.id));
      
      // Find reminders for plants that no longer exist
      const remindersToDelete = reminders.filter(reminder => 
        reminder.plant_id && !savedPlantIds.has(reminder.plant_id)
      );
      
      // Delete reminders for plants that no longer exist
      if (remindersToDelete.length > 0) {
        console.log(`Removing ${remindersToDelete.length} reminders for deleted plants`);
        remindersToDelete.forEach(reminder => {
          deleteReminder(reminder.id);
        });
      }
    };
    
    // Only run this check when reminders or saved plants change
    if (reminders.length > 0) {
      checkForDeletedPlantReminders();
    }
  }, [reminders, savedPlants, deleteReminder]);
  
  // Handle toggle all reminders
  const handleToggleAll = (value) => {
    setAllEnabled(value);
    toggleAllReminders(value);
  };
  
  // Handle edit reminder
  const handleEditReminder = (reminder) => {
    setCurrentReminder(reminder);
    setEditModalVisible(true);
  };
  
  // Handle save edited reminder
  const handleSaveReminder = (updatedReminder) => {
    updateReminder(updatedReminder);
    setEditModalVisible(false);
    setCurrentReminder(null);
  };
  
  // Group reminders by plant
  const remindersByPlant = reminders.reduce((acc, reminder) => {
    const plantId = reminder.plant_id;
    if (!acc[plantId]) {
      acc[plantId] = {
        plantId,
        plantName: reminder.plant_name,
        reminders: []
      };
    }
    acc[plantId].reminders.push(reminder);
    return acc;
  }, {});
  
  const plantGroups = Object.values(remindersByPlant);
  
  // Navigate to plant details
  const navigateToPlant = (plantId) => {
    const plant = savedPlants.find(p => p.id === plantId);
    if (plant) {
      router.push({
        pathname: '/(tabs)/Analysis',
        params: { 
          plantData: JSON.stringify(plant.plantData),
          imageUri: plant.imageUri,
          isSavedView: true,
          savedGeminiInfo: plant.plantData.geminiInfo
        }
      });
    }
  };
  
  // Handle delete reminder - directly delete without confirmation
  const handleDeleteReminder = (reminderId) => {
    deleteReminder(reminderId);
  };
  
  // Render a plant group with its reminders
  const renderPlantGroup = ({ item }) => {
    const plant = savedPlants.find(p => p.id === item.plantId);
    const plantImage = plant ? plant.imageUri : null;
    
    return (
      <View style={styles.plantGroup}>
        <TouchableOpacity 
          style={styles.plantHeader}
          onPress={() => navigateToPlant(item.plantId)}
        >
          {plantImage && (
            <Image 
              source={{ uri: plantImage }} 
              style={styles.plantImage} 
              resizeMode="cover"
            />
          )}
          <Text style={styles.plantName}>{item.plantName}</Text>
          <MaterialIcons name="chevron-right" size={20} color="#2E7D32" />
        </TouchableOpacity>
        
        {item.reminders.map(reminder => (
          <ReminderItem
            key={reminder.id}
            reminder={reminder}
            onToggle={() => toggleReminderEnabled(reminder.id)}
            onDelete={() => handleDeleteReminder(reminder.id)}
            onComplete={() => completeReminder(reminder.id)}
            onEdit={() => handleEditReminder(reminder)}
            showPlantName={false}
          />
        ))}
      </View>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-off" size={64} color="#DDD" />
      <Text style={styles.emptyText}>No reminders set</Text>
      <Text style={styles.emptySubtext}>
        Add reminders to your plants to see them here
      </Text>
    </View>
  );
  
  // Test notification functions
  const triggerTestWateringForeground = async () => {
    try {
      const notificationId = await NotificationService.triggerTestForegroundNotification('watering', 'Monstera');
      Alert.alert("Test Notification", "Foreground watering notification triggered!");
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      Alert.alert("Error", "Failed to trigger test notification");
    }
  };
  
  const triggerTestWateringBackground = async () => {
    try {
      const notificationId = await NotificationService.triggerTestBackgroundNotification('watering', 'Monstera');
      Alert.alert("Test Notification", "Background watering notification scheduled! It will appear in 5 seconds.");
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      Alert.alert("Error", "Failed to trigger test notification");
    }
  };
  
  const triggerTestFertilizingForeground = async () => {
    try {
      const notificationId = await NotificationService.triggerTestForegroundNotification('fertilizing', 'Snake Plant');
      Alert.alert("Test Notification", "Foreground fertilizing notification triggered!");
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      Alert.alert("Error", "Failed to trigger test notification");
    }
  };
  
  const triggerTestFertilizingBackground = async () => {
    try {
      const notificationId = await NotificationService.triggerTestBackgroundNotification('fertilizing', 'Snake Plant');
      Alert.alert("Test Notification", "Background fertilizing notification scheduled! It will appear in 5 seconds.");
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      Alert.alert("Error", "Failed to trigger test notification");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom header component */}
      <RemindersHeader />
      <View style={styles.content}>
        {/* Global toggle */}
        <View style={styles.globalToggleContainer}>
          <Text style={styles.globalToggleText}>
            {allEnabled ? 'All reminders enabled' : 'All reminders disabled'}
          </Text>
          <Switch
            value={allEnabled}
            onValueChange={handleToggleAll}
            trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
            thumbColor={allEnabled ? '#2E7D32' : '#f5f5f5'}
          />
        </View>
        
        {/* Reminders list */}
        {reminders.length > 0 ? (
          <FlatList
            data={plantGroups}
            renderItem={renderPlantGroup}
            keyExtractor={item => item.plantId}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          renderEmptyState()
        )}
        
        {/* Test notification buttons */}
        <View style={styles.testButtonsContainer}>
          <Text style={styles.testButtonsTitle}>Test Notifications</Text>
          
          {/* Watering test buttons */}
          <Text style={styles.testButtonsSubtitle}>Watering Notifications</Text>
          <View style={styles.testButtonsRow}>
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#2196F3' }]}
              onPress={triggerTestWateringForeground}
            >
              <MaterialIcons name="water-drop" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Foreground</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#2196F3', opacity: 0.8 }]}
              onPress={triggerTestWateringBackground}
            >
              <MaterialIcons name="notifications" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Background</Text>
            </TouchableOpacity>
          </View>
          
          {/* Fertilizing test buttons */}
          <Text style={styles.testButtonsSubtitle}>Fertilizing Notifications</Text>
          <View style={styles.testButtonsRow}>
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#8BC34A' }]}
              onPress={triggerTestFertilizingForeground}
            >
              <MaterialIcons name="compost" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Foreground</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#8BC34A', opacity: 0.8 }]}
              onPress={triggerTestFertilizingBackground}
            >
              <MaterialIcons name="notifications" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Background</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Add Reminder Button */}
        <TouchableOpacity 
          style={styles.addReminderButton}
          onPress={() => router.push('/plant-selector')}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addReminderButtonText}>Add Reminder</Text>
        </TouchableOpacity>
      </View>
      
      {/* Edit Reminder Modal */}
      <ReminderModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveReminder}
        reminder={currentReminder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  globalToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  globalToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  plantGroup: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  plantImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  // Test notification button styles
  testButtonsContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 8,
  },
  testButtonsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  testButtonsSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginTop: 8,
    marginBottom: 8,
  },
  testButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Add Reminder Button styles
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  addReminderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
