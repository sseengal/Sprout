import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';
import { useReminders } from '../../contexts/ReminderContext';

export default function MyPlantsScreen() {
  const { savedPlants, removePlant } = useSavedPlants();
  const { reminders } = useReminders();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleDeletePlant = (plantId) => {
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to remove this plant from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            removePlant(plantId);
          }
        }
      ]
    );
  };
  
  // Filter plants based on search query
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedPlants;
    }
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return savedPlants.filter(plant => {
      const commonName = plant.plantData?.commonName || '';
      const scientificName = plant.plantData?.scientificName || '';
      
      return commonName.toLowerCase().includes(normalizedQuery) || 
             scientificName.toLowerCase().includes(normalizedQuery);
    });
  }, [savedPlants, searchQuery]);
  
  const renderPlantItem = ({ item }) => (
    <View style={styles.plantItem}>
      <TouchableOpacity
        style={styles.plantItemContent}
        onPress={() => router.push({
          pathname: '/(tabs)/Analysis',
          params: { 
            plantData: JSON.stringify(item.plantData),
            imageUri: item.imageUri,
            isSavedView: true,  // Mark this as a saved plant view
            savedGeminiInfo: item.plantData.geminiInfo  // Include previously fetched Gemini data
          }
        })}
      >
        <Image 
          source={{ uri: item.imageUri }} 
          style={styles.plantImage} 
          resizeMode="cover"
        />
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>
            {item.plantData.commonName || 'Unknown Plant'}
          </Text>
          <Text style={styles.scientificName}>
            {item.plantData.scientificName || ''}
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePlant(item.id)}
        >
          <MaterialIcons name="delete" size={24} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>My Plants</Text>
          <TouchableOpacity 
            style={styles.reminderHeaderButton}
            onPress={() => router.push('/reminders')}
          >
            <MaterialIcons name="notifications" size={24} color="#fff" />
            {reminders.length > 0 && (
              <View style={styles.headerReminderBadge}>
                <Text style={styles.headerReminderBadgeText}>{reminders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>
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
        
        {savedPlants.length > 0 ? (
          <FlatList
            data={filteredPlants}
            renderItem={renderPlantItem}
            keyExtractor={(item) => item.id}
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
            <MaterialIcons name="bookmark-border" size={64} color="#DDD" />
            <Text style={styles.emptyText}>No saved plants yet</Text>
            <Text style={styles.emptySubtext}>
              Save plants from the Analysis screen to see them here
            </Text>
          </View>
        )}
      </View>
      

      

    </SafeAreaView>
  );
}

// Convert styles to StyleSheet
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2E7D32',
    padding: 16,
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  reminderHeaderButton: {
    padding: 8,
    position: 'relative',
  },
  headerReminderBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerReminderBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  plantItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  plantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  plantInfo: {
    flex: 1,
    marginRight: 8,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
  },
  deleteButton: {
    padding: 12,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
  },
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
