import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedPlants } from '../../contexts/SavedPlantsContext';

const MyPlantsScreen = () => {
  const { savedPlants, removePlant } = useSavedPlants();
  const router = useRouter();

  const handleRemove = (plant) => {
    Alert.alert(
      'Remove Plant',
      'Are you sure you want to remove this plant from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removePlant(plant.id) },
      ]
    );
  };

  const renderPlantItem = ({ item }) => (
    <View style={[styles.plantItem, { flexDirection: 'row', alignItems: 'center' }]}> 
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        onPress={() => {
          console.log('DEBUG: Plant item rendered:', JSON.stringify(item, null, 2));
          Alert.alert('Plant Data', JSON.stringify(item, null, 2));
          router.push({ pathname: '/(tabs)/Analysis', params: { plantData: JSON.stringify(item) } });
        }}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.plantImage} />
        ) : (
          <View style={[styles.plantImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}> 
            <MaterialIcons name="local-florist" size={28} color="#bbb" />
          </View>
        )}
        <View style={styles.plantInfo}>
          <Text style={styles.plantName} numberOfLines={1} ellipsizeMode="tail">
            {item.plantData?.commonName || item.plantData?.scientificName || 'Unnamed Plant'}
          </Text>
          {item.plantData?.scientificName && (
            <Text style={styles.scientificName} numberOfLines={1} ellipsizeMode="tail">
              {item.plantData.scientificName}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleRemove(item)} style={{ padding: 8 }}>
        <MaterialIcons name="delete" size={22} color="#c62828" />
      </TouchableOpacity>
    </View>
  );

  if (!savedPlants || savedPlants.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="local-florist" size={64} color="#DDD" />
        <Text style={styles.emptyText}>No saved plants yet</Text>
        <Text style={styles.emptySubtext}>Save plants to see them here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: '#2E7D32' }} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Plants</Text>
          </View>
        </View>
      </SafeAreaView>
      <FlatList
        data={savedPlants}
        renderItem={renderPlantItem}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  plantImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#f0f0f0',
  },
  plantInfo: {
    flex: 1,
    marginRight: 8,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: '#EEE',
    marginLeft: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFF',
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
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default MyPlantsScreen;
