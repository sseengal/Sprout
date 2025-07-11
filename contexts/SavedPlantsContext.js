import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as PlantStorage from '../services/plantStorage';

const SavedPlantsContext = createContext();

export function SavedPlantsProvider({ children }) {
  const [savedPlants, setSavedPlants] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved plants using the storage service on mount
  useEffect(() => {
    PlantStorage.getSavedPlants()
      .then((plants) => {
        setSavedPlants(plants);
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading saved plants:', error);
        setIsLoaded(true);
      });
  }, []);

  // We don't need to save here as the storage service handles saving

  // Add a plant using the standardized storage service
  const addPlant = useCallback(async (plant) => {
    try {
      const savedPlant = await PlantStorage.savePlant(plant);
      setSavedPlants(prev => [...prev, savedPlant]);
      return savedPlant;
    } catch (error) {
      console.error('Error adding plant:', error);
      throw error;
    }
  }, []);

  // Remove plant by id using the storage service
  const removePlant = useCallback(async (plantId) => {
    try {
      const success = await PlantStorage.deletePlant(plantId);
      if (success) {
        setSavedPlants(prev => prev.filter(p => String(p.id) !== String(plantId)));
      }
      return success;
    } catch (error) {
      console.error('Error removing plant:', error);
      return false;
    }
  }, []);
  
  // Update an existing plant
  const updatePlant = useCallback(async (plantId, newData) => {
    try {
      const updatedPlant = await PlantStorage.updatePlant(plantId, newData);
      if (updatedPlant) {
        setSavedPlants(prev => 
          prev.map(p => String(p.id) === String(plantId) ? updatedPlant : p)
        );
      }
      return updatedPlant;
    } catch (error) {
      console.error('Error updating plant:', error);
      return null;
    }
  }, []);

  // Utility to check if a plant is saved (by id or imageUri+scientificName)
  const isPlantSaved = useCallback((plant) => {
    return savedPlants.some(
      (p) => (plant.id && String(p.id) === String(plant.id)) ||
              (plant.imageUri && p.imageUri === plant.imageUri && p.scientificName === plant.scientificName)
    );
  }, [savedPlants]);

  return (
    <SavedPlantsContext.Provider value={{ 
      savedPlants, 
      addPlant, 
      removePlant, 
      updatePlant,
      isPlantSaved,
      isLoaded
    }}>
      {children}
    </SavedPlantsContext.Provider>
  );
}

export function useSavedPlants() {
  return useContext(SavedPlantsContext);
}
