import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSavedPlants } from '../contexts/SavedPlantsContext';
import ReminderModal from '../components/reminders/ReminderModal';
import { useReminders } from '../contexts/ReminderContext';

/**
 * Plant Selector Screen for adding reminders to multiple plants
 */
export default function PlantSelectorScreen() {
  const { savedPlants } = useSavedPlants();
  const { addReminder } = useReminders();
  const router = useRouter();
  
  // State for selected plants and modal
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPlant, setCurrentPlant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toggle plant selection
  const togglePlantSelection = (plant) => {
    if (selectedPlants.some(p => p.id === plant.id)) {
      setSelectedPlants(prev => prev.filter(p => p.id !== plant.id));
    } else {
      setSelectedPlants(prev => [...prev, plant]);
    }
  };
  
  // Check if a plant is selected
  const isPlantSelected = (plantId) => {
    return selectedPlants.some(p => p.id === plantId);
  };
  
  // Open reminder modal for a specific plant
  const openReminderModal = (plant) => {
    setCurrentPlant(plant);
    setModalVisible(true);
  };
  
  // Filter plants based on search query
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedPlants;
    }
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return savedPlants.filter(plant => {
      const commonName = plant.plantData?.commonName || plant.commonName || '';
      const scientificName = plant.plantData?.scientificName || '';
      
      return commonName.toLowerCase().includes(normalizedQuery) || 
             scientificName.toLowerCase().includes(normalizedQuery);
    });
  }, [savedPlants, searchQuery]);
  
  // Handle save reminder for multiple plants
  const handleSaveReminder = async (reminderData) => {
    setLoading(true);
    
    try {
      // Create a reminder for each selected plant
      const promises = selectedPlants.map(plant => {
        const plantReminder = {
          ...reminderData,
          plant_id: plant.id,
          plant_name: plant.plantData?.commonName || plant.commonName || 'Plant'
        };
        return addReminder(plantReminder);
      });
      
      await Promise.all(promises);
      
      // Navigate back to reminders screen
      router.back();
    } catch (error) {
      console.error('Error creating reminders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Render a plant item
  const renderPlantItem = ({ item }) => {
    const isSelected = isPlantSelected(item.id);
    const plantName = item.plantData?.commonName || item.commonName || 'Unknown Plant';
    
    return (
      <TouchableOpacity 
        style={[styles.plantItem, isSelected && styles.plantItemSelected]}
        onPress={() => togglePlantSelection(item)}
      >
        <Image 
          source={{ uri: item.imageUri }} 
          style={styles.plantImage} 
          resizeMode="cover"
        />
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{plantName}</Text>
          {item.plantData?.scientificName && (
            <Text style={styles.scientificName}>{item.plantData.scientificName}</Text>
          )}
        </View>
        <MaterialIcons 
          name={isSelected ? "check-circle" : "radio-button-unchecked"} 
          size={24} 
          color={isSelected ? "#2E7D32" : "#AAAAAA"} 
        />
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Plants</Text>
        <View style={styles.rightPlaceholder} />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search plants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {/* Plant List */}
      {savedPlants.length > 0 ? (
        <FlatList
          data={filteredPlants}
          renderItem={renderPlantItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={searchQuery ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={64} color="#DDD" />
              <Text style={styles.emptyText}>No plants match your search</Text>
              <Text style={styles.emptySubtext}>
                Try a different search term
              </Text>
            </View>
          ) : null}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="local-florist" size={64} color="#DDD" />
          <Text style={styles.emptyText}>No plants saved</Text>
          <Text style={styles.emptySubtext}>
            Add plants to your collection first
          </Text>
        </View>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            selectedPlants.length === 0 && styles.actionButtonDisabled
          ]}
          onPress={() => {
            if (selectedPlants.length > 0) {
              openReminderModal(selectedPlants[0]);
            }
          }}
          disabled={selectedPlants.length === 0}
        >
          <MaterialIcons name="notifications-active" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>
            Add Reminder to {selectedPlants.length} {selectedPlants.length === 1 ? 'Plant' : 'Plants'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Reminder Modal */}
      <ReminderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveReminder}
        plantName={selectedPlants.length > 1 
          ? `${selectedPlants.length} plants` 
          : selectedPlants[0]?.plantData?.commonName || selectedPlants[0]?.commonName || 'Plant'
        }
      />
      
      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Creating reminders...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  rightPlaceholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  plantItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2E7D32',
    borderWidth: 1,
  },
  plantImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
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
  actionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
});
