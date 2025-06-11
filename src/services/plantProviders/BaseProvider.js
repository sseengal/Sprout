// Base Plant Provider Interface
export default class BaseProvider {
  constructor(apiKey) {
    if (this.constructor === BaseProvider) {
      throw new Error("Cannot instantiate abstract class");
    }
    this.apiKey = apiKey;
  }

  async identifyPlant(imageBase64) {
    throw new Error('identifyPlant() must be implemented');
  }
  
  async getPlantDetails(plantId) {
    throw new Error('getPlantDetails() must be implemented');
  }
  
  async getCareTips(plantName) {
    throw new Error('getCareTips() must be implemented');
  }
}
