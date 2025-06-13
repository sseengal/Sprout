import AsyncStorage from '@react-native-async-storage/async-storage';
import { savePlant, getSavedPlants, deletePlant } from '../plantStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('plantStorage', () => {
  const mockPlantData = {
    suggestions: [{
      plant_details: {
        common_names: ['Test Plant'],
        scientific_name: 'Testus plantus',
        family: 'Testaceae',
        genus: 'Testus'
      }
    }],
    plantInfo: {
      careGuide: {
        light: 'Bright indirect light',
        water: 'When top inch of soil is dry'
      }
    }
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Mock getItem to return empty array by default
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
  });

  describe('savePlant', () => {
    it('should save a plant successfully', async () => {
      await savePlant(mockPlantData);
      
      // Verify AsyncStorage.setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      
      // Get the saved data
      const [key, value] = AsyncStorage.setItem.mock.calls[0];
      const savedPlants = JSON.parse(value);
      
      // Verify the saved data
      expect(key).toBe('@saved_plants');
      expect(savedPlants).toHaveLength(1);
      expect(savedPlants[0].plantName).toBe('Test Plant');
      expect(savedPlants[0].scientificName).toBe('Testus plantus');
      expect(savedPlants[0].careInfo.light).toBe('Bright indirect light');
    });

    it('should prevent duplicate plants', async () => {
      // First save should work
      await savePlant(mockPlantData);
      
      // Second save with same data should throw
      await expect(savePlant(mockPlantData)).rejects.toThrow('This plant has already been saved');
    });
  });

  describe('getSavedPlants', () => {
    it('should return empty array when no plants are saved', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      const plants = await getSavedPlants();
      expect(plants).toEqual([]);
    });

    it('should return saved plants', async () => {
      const mockPlants = [
        { id: '1', plantName: 'Plant 1' },
        { id: '2', plantName: 'Plant 2' }
      ];
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockPlants));
      
      const plants = await getSavedPlants();
      expect(plants).toEqual(mockPlants);
    });
  });

  describe('deletePlant', () => {
    it('should delete a plant by id', async () => {
      const mockPlants = [
        { id: '1', plantName: 'Plant 1' },
        { id: '2', plantName: 'Plant 2' }
      ];
      
      // Mock getItem to return our test data
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockPlants));
      
      // Delete a plant
      const result = await deletePlant('1');
      
      // Verify result
      expect(result).toBe(true);
      
      // Verify setItem was called with updated array
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@saved_plants',
        JSON.stringify([{ id: '2', plantName: 'Plant 2' }])
      );
    });

    it('should return false if plant not found', async () => {
      const mockPlants = [
        { id: '1', plantName: 'Plant 1' }
      ];
      
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockPlants));
      
      const result = await deletePlant('non-existent-id');
      expect(result).toBe(false);
      // Should not call setItem if no changes
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
