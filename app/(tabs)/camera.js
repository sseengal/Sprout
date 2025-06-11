import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  StatusBar 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { identifyPlant } from '../../src/services/plantService';

const CameraScreen = () => {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraType, setCameraType] = useState('back');

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const analyzePlant = async () => {
    if (!image) return;

    setIsLoading(true);
    try {
      console.log('Analyzing plant with PlantNet...');
      // Call the PlantNet API with the image URI
      const plantData = await identifyPlant(image);
      console.log('Plant Data:', plantData);
      
      if (!plantData || !plantData.suggestions || plantData.suggestions.length === 0) {
        throw new Error('No plant suggestions found');
      }
      
      // Navigate to results screen with the plant data
      router.push({
        pathname: '/plant-details/index',
        params: { 
          plantData: JSON.stringify(plantData),
          imageUri: image
        }
      });
      
    } catch (error) {
      console.error('Error analyzing plant:', error);
      Alert.alert(
        'Analysis Failed', 
        error.message || 'Could not identify the plant. Please try with a clearer image.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>No access to camera</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              // Request permission again
              (async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                setHasPermission(status === 'granted');
              })();
            }}
          >
            <Text style={styles.buttonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing your plant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.preview} />
            <View style={styles.buttonRow}>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#f44336' }]}
                  onPress={() => setImage(null)}
                >
                  <MaterialIcons name="close" size={20} color="white" />
                  <Text style={styles.buttonText}> Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#4CAF50' }]}
                  onPress={analyzePlant}
                  disabled={isLoading}
                >
                  <MaterialIcons name="check" size={20} color="white" />
                  <Text style={styles.buttonText}> Use This</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.title}>Plant Identifier</Text>
            <Text style={styles.subtitle}>Take a photo or choose from gallery</Text>
            
            <View style={styles.cameraPlaceholder}>
              <MaterialIcons name="photo-camera" size={80} color="#ddd" />
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#2E7D32' }]} 
                onPress={takePicture}
              >
                <MaterialIcons name="camera-alt" size={24} color="white" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={pickImage}
              >
                <MaterialIcons name="photo-library" size={24} color="white" />
                <Text style={styles.actionButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 30,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
});
