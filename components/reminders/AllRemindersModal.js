import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Switch,
  Modal,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useReminders } from '../../contexts/ReminderContext';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';
import { useRouter } from 'expo-router';
import ReminderItem from './ReminderItem';

/**
 * Modal component to display and manage all reminders globally
 */
export default function AllRemindersModal({ visible, onClose }) {
  const { 
    reminders, 
    toggleReminderEnabled, 
    toggleAllReminders,
    areAllRemindersEnabled,
    deleteReminder,
    completeReminder,
    addReminder
  } = useReminders();
  
  const { savedPlants } = useSavedPlants();
  const router = useRouter();
  
  const [allEnabled, setAllEnabled] = useState(false);
  
  // Update the all enabled state when reminders change
  useEffect(() => {
    setAllEnabled(areAllRemindersEnabled());
  }, [reminders, areAllRemindersEnabled]);
  
  // Handle toggle all reminders
  const handleToggleAll = (value) => {
    setAllEnabled(value);
    toggleAllReminders(value);
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
  
  // Navigate to plant details
  const navigateToPlant = (plantId) => {
    const plant = savedPlants.find(p => p.id === plantId);
    if (plant) {
      onClose(); // Close modal before navigation
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
            onDelete={() => deleteReminder(reminder.id)}
            onComplete={() => completeReminder(reminder.id)}
            showPlantName={false}
          />
        ))}
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Care Reminders</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
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
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  globalToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  globalToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
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
  closeButton: {
    backgroundColor: '#e0e0e0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
