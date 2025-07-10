import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';

export default function MyPlantsScreen() {
  const { savedPlants, removePlant } = useSavedPlants();
  const router = useRouter();

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
          <Text style={styles.plantName} numberOfLines={1}>
            {item.plantData.commonName || 'Unnamed Plant'}
          </Text>
          {item.plantData.scientificName && (
            <Text style={styles.scientificName} numberOfLines={1}>
              {item.plantData.scientificName}
            </Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeletePlant(item.id)}
      >
        <MaterialIcons name="delete-outline" size={22} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: '#2E7D32' }} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>My Plants</Text>
          </View>
        </View>
      </SafeAreaView>
      <View style={styles.content}>
        {savedPlants.length > 0 ? (
          <FlatList
            data={savedPlants}
            renderItem={renderPlantItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
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
    </View>
  );
}

// Convert styles to StyleSheet
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2E7D32',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
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
  deleteButton: {
    padding: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
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
});
