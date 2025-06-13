import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MyPlantsScreen = ({ navigation }) => {
  const [plants, setPlants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFocused = useIsFocused();

  // No storage service used anymore. Always show empty state for now.
useEffect(() => {
  setIsLoading(false);
  setPlants([]);
}, []);

  const renderPlantItem = ({ item }) => (
    <TouchableOpacity
      style={styles.plantItem}
      onPress={() => navigation.navigate('SavedPlantDetails', { plant: item })}
    >
      <View style={styles.plantInfo}>
        <Text style={styles.plantName} numberOfLines={1} ellipsizeMode="tail">
          {item.plantName}
        </Text>
        {item.scientificName && (
          <Text style={styles.scientificName} numberOfLines={1} ellipsizeMode="tail">
            {item.scientificName}
          </Text>
        )}
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#888" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (plants.length === 0) {
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
      <FlatList
        data={plants}
        renderItem={renderPlantItem}
        keyExtractor={(item) => item.id}
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
  listContent: {
    padding: 16,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
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
