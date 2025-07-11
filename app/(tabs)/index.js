import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { getPlantDetails, fetchPlantImage } from '../../utils/analysisUtils';
import { createStandardPlantData } from '../../utils/plantDataModel';
import { extractPlantInfo } from '../../utils/plantDetails';

export default function HomeScreen() {
  const [plantName, setPlantName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSearch = async () => {
    if (!plantName.trim()) {
      return;
    }
    
    setLoading(true);
    try {
      // Get plant details from Gemini
      const geminiResponse = await getPlantDetails(plantName);
      
      if (!geminiResponse) {
        throw new Error('Could not get plant information');
      }
      
      // Fetch a plant image
      const imageUrl = await fetchPlantImage(plantName);
      
      // Extract plant info from Gemini response
      const plantInfo = extractPlantInfo(geminiResponse);
      
      // Create standardized plant data
      const standardPlantData = createStandardPlantData({
        geminiData: {
          ...geminiResponse,
          plantInfo: plantInfo
        },
        imageUri: imageUrl,
        searchType: 'text',
        searchTerm: plantName
      });
      
      // Add explicit flag for text search that Analysis page is looking for
      standardPlantData.textSearch = true;
      
      console.log('DEBUG: Home page sending text search data:', {
        plantName,
        hasGeminiData: !!geminiResponse,
        hasImageUrl: !!imageUrl,
        standardPlantData: JSON.stringify(standardPlantData)
      });
      
      // Navigate to Analysis screen with the data
      router.push({
        pathname: '/(tabs)/Analysis',
        params: {
          plantData: JSON.stringify(standardPlantData),
          plantName: plantName,
          savedGeminiInfo: JSON.stringify(geminiResponse),
          imageUri: imageUrl,
          isTextSearch: 'true' // Add explicit param flag for text search
        }
      });
    } catch (error) {
      console.error('Error searching for plant:', error);
      Toast.show({
        type: 'error',
        text1: 'Search failed',
        text2: error.message || 'Could not find information about this plant',
        position: 'top',
        visibilityTime: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Plant Search</Text>
        <Text style={styles.subtitle}>Search for plants by name</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter plant name..."
          value={plantName}
          onChangeText={setPlantName}
          onSubmitEditing={onSearch}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={onSearch}
          disabled={loading || !plantName.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialIcons name="search" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialIcons name="info-outline" size={24} color="#2E7D32" style={styles.infoIcon} />
        <Text style={styles.infoText}>
          Enter the name of a plant to search for information about it. You can search by common name or scientific name.
        </Text>
      </View>
      
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Popular searches:</Text>
        {['Rose', 'Sunflower', 'Aloe Vera', 'Monstera'].map((plant, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.tipButton}
            onPress={() => {
              setPlantName(plant);
              onSearch();
            }}
          >
            <Text style={styles.tipText}>{plant}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  searchButton: {
    width: 50,
    height: 50,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    color: '#2E7D32',
    fontSize: 14,
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  tipButton: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tipText: {
    color: '#2E7D32',
    fontSize: 14,
  },
});
