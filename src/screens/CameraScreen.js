import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { identifyPlant } from '../services/plantService';

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (galleryStatus.status !== 'granted') {
        Alert.alert('Permission required', 'We need gallery permission to select photos');
      }
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
          exif: false,
        });
        setCapturedImage(photo.uri);
        await processImage(photo.base64);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCapturedImage(result.assets[0].uri);
        await processImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processImage = async (base64Image) => {
    if (!base64Image) return;
    
    setIsLoading(true);
    try {
      const result = await identifyPlant(base64Image);
      console.log('Plant identification results:', JSON.stringify(result, null, 2));
      
      if (result) {
        // Navigate to PlantDetails with the complete result
        router.push({
          pathname: '/plant-details',
          params: {
            plantData: JSON.stringify({
              ...result,
              // Ensure we have the plant name and details in the expected format
              plant_name: result.plantName || (result.suggestions && result.suggestions[0]?.plant_name) || 'Unknown Plant',
              plant_details: {
                ...result.housePlantData,
                // Add any additional details from the API response
                scientific_name: [result.suggestions?.[0]?.plant_name || 'Unknown'],
                taxonomy: {
                  family: result.housePlantData?.family || 'Unknown',
                  genus: result.suggestions?.[0]?.plant_name?.split(' ')[0] || 'Unknown'
                },
                // Add care tips if available
                care_tips: result.careTips || []
              },
              probability: result.suggestions?.[0]?.probability || 0
            })
          }
        });
      } else {
        Alert.alert('No matches found', 'We couldn\'t identify this plant. Please try with a clearer image.');
      }
    } catch (error) {
      console.error('Error identifying plant:', error);
      Alert.alert('Error', 'Failed to identify plant. Please try again.');
    } finally {
      setIsLoading(false);
      setCapturedImage(null);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {capturedImage ? (
        <Image source={{ uri: capturedImage }} style={styles.preview} />
      ) : (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          ratio="16:9"
        >
          <View style={styles.overlay}>
            <View style={styles.overlayInner} />
          </View>
        </Camera>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={pickImage}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>📁 Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.captureButton]} 
          onPress={takePicture}
          disabled={isLoading}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setCameraType(
            cameraType === Camera.Constants.Type.back 
              ? Camera.Constants.Type.front 
              : Camera.Constants.Type.back
          )}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🔄 Flip</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Identifying plant...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  overlayInner: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  button: {
    padding: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});
