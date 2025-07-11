import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ReminderItem from './ReminderItem';
import ReminderModal from './ReminderModal';
import { useReminders } from '../../contexts/ReminderContext';

/**
 * Card component to display and manage care reminders for a plant
 */
const CareScheduleCard = ({ plant }) => {
  const { 
    getPlantReminders, 
    addReminder, 
    updateReminder, 
    deleteReminder, 
    toggleReminderEnabled,
    completeReminder
    // generateDefaultReminders removed as the function no longer exists
  } = useReminders();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  
  // Get reminders for this plant
  const plantReminders = getPlantReminders(plant.id);
  
  // Handle adding a new reminder
  const handleAddReminder = () => {
    setEditingReminder(null);
    setModalVisible(true);
  };
  
  // Handle editing an existing reminder
  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setModalVisible(true);
  };
  
  // Handle saving a reminder (new or edited)
  const handleSaveReminder = (reminderData) => {
    if (editingReminder) {
      // Update existing reminder
      updateReminder(editingReminder.id, reminderData);
    } else {
      // Add new reminder
      addReminder({
        ...reminderData,
        plant_id: plant.id
      });
    }
  };
  
  // Handle deleting a reminder
  const handleDeleteReminder = (id) => {
    deleteReminder(id);
  };
  
  // Handle generating default reminders
  const handleGenerateDefaults = () => {
    // The generateDefaultReminders function has been removed
    // Instead, we'll create basic watering and fertilizing reminders manually
    const wateringReminder = {
      plant_id: plant.id,
      care_type: 'watering',
      frequency_days: 7, // Default to weekly watering
      next_due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      enabled: true
    };
    
    const fertilizingReminder = {
      plant_id: plant.id,
      care_type: 'fertilizing',
      frequency_days: 30, // Default to monthly fertilizing
      next_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      enabled: true
    };
    
    // Add the reminders
    addReminder(wateringReminder);
    addReminder(fertilizingReminder);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Care Schedule</Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddReminder}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      {plantReminders.length > 0 ? (
        <FlatList
          data={plantReminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReminderItem
              reminder={item}
              onToggle={toggleReminderEnabled}
              onEdit={handleEditReminder}
              onDelete={handleDeleteReminder}
              onComplete={completeReminder}
            />
          )}
          style={styles.remindersList}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-none" size={48} color="#aaa" />
          <Text style={styles.emptyText}>No care reminders set</Text>
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={handleGenerateDefaults}
          >
            <Text style={styles.generateButtonText}>Generate Recommended Schedule</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ReminderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveReminder}
        reminder={editingReminder}
        plantName={plant.plantData?.commonName || 'Plant'}
        plantId={plant.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  remindersList: {
    maxHeight: 300,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  generateButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CareScheduleCard;
