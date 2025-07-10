import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'SPROUT_SAVED_PLANTS';
const SavedPlantsContext = createContext();

export function SavedPlantsProvider({ children }) {
  const [savedPlants, setSavedPlants] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved plants from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data) setSavedPlants(JSON.parse(data));
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  // Save to AsyncStorage whenever savedPlants changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlants));
    }
  }, [savedPlants, isLoaded]);

  // plant should have at least: id, imageUri, commonName, scientificName, etc.
  const addPlant = useCallback((plant) => {
    setSavedPlants((prev) => {
      // avoid duplicates by checking for a unique id or imageUri+scientificName
      const exists = prev.some(
        (p) => (plant.id && p.id === plant.id) ||
                (plant.imageUri && p.imageUri === plant.imageUri && p.scientificName === plant.scientificName)
      );
      if (exists) return prev;
      return [...prev, { ...plant, savedAt: Date.now() }];
    });
  }, []);

  // Remove plant by id
  const removePlant = useCallback((plantId) => {
    setSavedPlants((prev) => prev.filter((p) => p.id !== plantId));
    
    // Publish event to AsyncStorage for other contexts to detect
    AsyncStorage.setItem('PLANT_DELETED_EVENT', JSON.stringify({
      plantId,
      timestamp: Date.now()
    })).catch(error => console.error('Error publishing plant deletion event:', error));
  }, []);

  // Utility to check if a plant is saved (by id or imageUri+scientificName)
  const isPlantSaved = useCallback((plant) => {
    return savedPlants.some(
      (p) => (plant.id && p.id === plant.id) ||
              (plant.imageUri && p.imageUri === plant.imageUri && p.scientificName === plant.scientificName)
    );
  }, [savedPlants]);

  return (
    <SavedPlantsContext.Provider value={{ savedPlants, addPlant, removePlant, isPlantSaved }}>
      {children}
    </SavedPlantsContext.Provider>
  );
}

export function useSavedPlants() {
  return useContext(SavedPlantsContext);
}
