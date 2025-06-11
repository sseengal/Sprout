import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Dimensions,
  Modal,
  Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getAllPlantInfo } from '../../utils/geminiService';

/**
 * Enhanced text formatter for Gemini API responses
 * Handles:
 * - Headers (##, ###, etc.)
 * - Bold and italic text
 * - Lists (numbered and bulleted)
 * - Code blocks
 * - Links
 */
const FormattedText = ({ content, type = 'details' }) => {
  // Handle undefined or null content
  if (content === undefined || content === null) {
    console.warn('FormattedText received undefined or null content');
    return <Text style={{ color: '#d32f2f', margin: 10, textAlign: 'center' }}>No content available</Text>;
  }

  // Convert content to string if it's not already
  const contentString = typeof content === 'string' ? content : String(content);

  // Process content based on type
  const processContent = (text) => {
    if (!text) return [];
    
    // Ensure text is a string before splitting
    const textString = typeof text === 'string' ? text : String(text);
    const lines = textString.split('\n');
    
    // If we got an empty string, return a single empty paragraph
    if (lines.length === 0) return [{ type: 'paragraph', text: '' }];
    const elements = [];
    let inList = false;
    let inCodeBlock = false;
    let codeBlockContent = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          elements.push({
            type: 'code',
            content: codeBlockContent.join('\n')
          });
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
          // Close any open list
          if (inList) {
            elements.push({ type: 'listEnd' });
            inList = false;
          }
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Skip empty lines unless it's within a list
      if (line === '') {
        if (inList) {
          elements.push({ type: 'listEnd' });
          inList = false;
        }
        continue;
      }

      // Handle headers
      const headerMatch = line.match(/^(#{1,3})\s*(.+)/);
      if (headerMatch) {
        if (inList) {
          elements.push({ type: 'listEnd' });
          inList = false;
        }
        elements.push({
          type: 'header',
          level: headerMatch[1].length,
          text: headerMatch[2].trim()
        });
        continue;
      }

      // Handle lists
      const listMatch = line.match(/^(\s*[-*•]|\d+\.)\s+(.+)/);
      if (listMatch) {
        if (!inList) {
          elements.push({ type: 'listStart' });
          inList = true;
        }
        elements.push({
          type: 'listItem',
          text: listMatch[2].trim()
        });
        continue;
      }

      // Handle regular text
      if (inList) {
        // If we're in a list but this line doesn't start with a bullet,
        // append it to the previous list item
        const lastItem = elements[elements.length - 1];
        if (lastItem && lastItem.type === 'listItem') {
          lastItem.text += ' ' + line;
          continue;
        }
      }

      // If we get here, it's a regular paragraph
      if (inList) {
        elements.push({ type: 'listEnd' });
        inList = false;
      }
      elements.push({
        type: 'paragraph',
        text: line
      });
    }

    // Close any open list
    if (inList) {
      elements.push({ type: 'listEnd' });
    }

    return elements;
  };

  // Process content
  const elements = processContent(contentString);

  // If we have no elements after processing, show a message
  if (!elements || elements.length === 0) {
    return <Text style={{ color: '#666', margin: 10, textAlign: 'center', fontStyle: 'italic' }}>No content available</Text>;
  }

  return (
    <View style={styles.detailsContainer}>
      {elements.map((element, index) => {
        switch (element.type) {
          case 'header':
            return (
              <Text 
                key={`h-${index}`} 
                style={[
                  styles.headerText,
                  element.level === 1 && styles.header1,
                  element.level === 2 && styles.header2,
                  element.level === 3 && styles.header3,
                ]}
              >
                {element.text}
              </Text>
            );
          
          case 'paragraph':
            return (
              <Text key={`p-${index}`} style={styles.paragraph}>
                {element.text}
              </Text>
            );
          
          case 'listStart':
            return (
              <View key={`list-${index}`} style={styles.listContainer}>
                {elements
                  .filter((e, i) => e.type === 'listItem' && 
                    i > index && 
                    (elements[i-1]?.type === 'listStart' || elements[i-1]?.type === 'listItem'))
                  .map((item, itemIndex) => (
                    <View key={`item-${itemIndex}`} style={styles.listItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.listItemText}>{item.text}</Text>
                    </View>
                  ))
                }
              </View>
            );
          
          case 'code':
            return (
              <View key={`code-${index}`} style={styles.codeBlock}>
                <Text style={styles.codeText}>{element.content}</Text>
              </View>
            );
          
          default:
            return null;
        }
      })}
    </View>
  );
};

const { width } = Dimensions.get('window');

const PlantDetailsScreen = ({ plantData, imageUri }) => {
  const router = useRouter();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [careInfo, setCareInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [isConfidenceModalVisible, setIsConfidenceModalVisible] = useState(false);

  // Extract plant information
  useEffect(() => {
    const loadPlantData = async () => {
      try {
        console.log('Raw plantData from props:', plantData);
        
        if (!plantData) {
          throw new Error('No plant data available');
        }
        
        setPlant(plantData);
        await extractCareInfo(plantData);
      } catch (err) {
        console.error('Error loading plant data:', err);
        setError(err.message || 'Failed to load plant data');
        Alert.alert('Error', 'Failed to load plant details');
      } finally {
        setLoading(false);
      }
    };

    const extractCareInfo = async (plantData) => {
      if (!plantData) {
        console.log('No plant data provided');
        return;
      }
      
      try {
        // Check for existing Gemini data in the new format
        if (plantData.plantInfo) {
          setCareInfo({
            ...plantData.plantInfo,
            source: 'Gemini AI',
            hasGeminiData: true
          });
          return;
        }
        
        // If we have a plant name but no Gemini data, fetch it
        const plantName = plantData.suggestions?.[0]?.plant_details?.common_names?.[0] || 
                        plantData.housePlantData?.commonNames?.[0];
        
        if (!plantName) {
          console.log('No plant name available to fetch care info');
          setCareInfo({
            basicInfo: { name: 'Unknown Plant' },
            careGuide: { summary: 'No care information available for this plant.' },
            source: 'Error',
            hasGeminiData: false
          });
          return;
        }
        
        console.log('Fetching plant info for:', plantName);
        const plantInfo = await getAllPlantInfo(plantName);
        
        if (plantInfo) {
          setCareInfo({
            ...plantInfo,
            source: 'Gemini AI',
            hasGeminiData: true
          });
        } else {
          console.log('No Gemini data available for:', plantName);
          setCareInfo({
            basicInfo: { name: plantName },
            careGuide: { summary: 'No care information available for this plant.' },
            source: 'Gemini AI',
            hasGeminiData: false
          });
        }
        
      } catch (error) {
        console.error('Error fetching plant info from Gemini:', error);
        setCareInfo({
          basicInfo: { name: getPlantName() },
          careGuide: { 
            summary: 'Could not fetch plant information. Please check your internet connection and try again.'
          },
          source: 'Error',
          hasGeminiData: false
        });
      }
    };

    loadPlantData();
  }, [plantData]);

  // Get plant name from the first suggestion or House Plant data
  const getPlantName = () => {
    // Try to get a common name from house plant data first
    if (plant?.housePlantData?.commonNames?.[0]) {
      return plant.housePlantData.commonNames[0];
    }
    
    // Try to get a common name from PlantNet data
    if (plant?.suggestions?.[0]?.plant_details?.common_names?.length > 0) {
      return plant.suggestions[0].plant_details.common_names[0];
    }
    
    // If no common name, use the scientific name but format it nicely
    const scientificName = getScientificName();
    if (scientificName) {
      // Convert scientific name to title case for better readability
      return scientificName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    return 'Unknown Plant';
  };

  // Get scientific name if available
  const getScientificName = () => {
    if (plant?.housePlantData?.scientificName) return plant.housePlantData.scientificName;
    if (plant?.suggestions?.[0]?.plant_details?.scientific_name) {
      return plant.suggestions[0].plant_details.scientific_name;
    }
    return null;
  };

  // Get confidence percentage
  const getConfidence = () => {
    if (plant?.suggestions?.[0]?.probability) {
      return Math.round(plant.suggestions[0].probability * 100);
    }
    return null;
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // Render error state
  if (error || !plant) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>{error || 'No plant data available'}</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render plant details
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2E7D32" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {imageUri && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.plantImage}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.infoContainer}>
              <View style={styles.nameContainer}>
                <Text style={styles.plantName}>
                  {getPlantName()}
                </Text>
                {(() => {
                  const scientificName = getScientificName();
                  if (scientificName) {
                    return (
                      <Text style={styles.scientificName}>
                        {scientificName}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
              
              {getConfidence() && (
                <Pressable
                  onPress={() => setIsConfidenceModalVisible(true)}
                  style={({ pressed }) => [
                    styles.confidenceContainer,
                    { opacity: pressed ? 0.6 : 1 }
                  ]}
                >
                  <View style={styles.confidenceContent}>
                    <Text style={styles.confidenceText}>
                      Confidence: {getConfidence()}%
                    </Text>
                    <MaterialIcons name="info-outline" size={16} color="#2E7D32" style={styles.infoIcon} />
                  </View>
                </Pressable>
              )}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'details' && styles.activeTab]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
                  Details
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'care' && styles.activeTab]}
                onPress={() => setActiveTab('care')}
              >
                <Text style={[styles.tabText, activeTab === 'care' && styles.activeTabText]}>
                  Care Guide
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'details' ? (
                <View style={styles.section}>
                  {careInfo?.hasGeminiData ? (
                    <ScrollView style={styles.detailsScroll}>
                      {/* Basic Info */}
                      {careInfo.basicInfo && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>Basic Information</Text>
                          {careInfo.basicInfo.scientificName && (
                            <View style={styles.infoRow}>
                              <MaterialIcons name="science" size={18} color="#2E7D32" style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                <Text style={styles.infoLabel}>Scientific Name: </Text>
                                {careInfo.basicInfo.scientificName}
                              </Text>
                            </View>
                          )}
                          {careInfo.basicInfo.family && (
                            <View style={styles.infoRow}>
                              <MaterialIcons name="family-restroom" size={18} color="#2E7D32" style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                <Text style={styles.infoLabel}>Family: </Text>
                                {careInfo.basicInfo.family}
                              </Text>
                            </View>
                          )}
                          {careInfo.basicInfo.origin && (
                            <View style={styles.infoRow}>
                              <MaterialIcons name="place" size={18} color="#2E7D32" style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                <Text style={styles.infoLabel}>Origin: </Text>
                                {careInfo.basicInfo.origin}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Description */}
                      {careInfo.description && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>Description</Text>
                          <Text style={styles.infoText}>{careInfo.description}</Text>
                        </View>
                      )}

                      {/* Natural Habitat */}
                      {careInfo.naturalHabitat && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>Natural Habitat</Text>
                          <Text style={styles.infoText}>{careInfo.naturalHabitat}</Text>
                        </View>
                      )}

                      {/* Toxicity */}
                      {careInfo.toxicity && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>Toxicity</Text>
                          <Text style={styles.infoText}>{careInfo.toxicity}</Text>
                        </View>
                      )}
                    </ScrollView>
                  ) : (
                    <View style={[styles.centered, {padding: 40}]}>
                      <ActivityIndicator size="large" color="#2E7D32" />
                      <Text style={{marginTop: 20, color: '#666', textAlign: 'center'}}>
                        Loading plant details...
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                // Care Guide Tab
                <View style={styles.section}>
                  {careInfo?.hasGeminiData ? (
                    <ScrollView style={styles.detailsScroll}>
                      {/* Care Guide Summary */}
                      {careInfo.careGuide?.summary && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>Care Summary</Text>
                          <Text style={styles.infoText}>{careInfo.careGuide.summary}</Text>
                        </View>
                      )}

                      {/* Watering */}
                      {careInfo.careGuide?.watering && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>
                            <MaterialIcons name="opacity" size={18} color="#2E7D32" /> Watering
                          </Text>
                          {typeof careInfo.careGuide.watering === 'string' ? (
                            <Text style={styles.infoText}>{careInfo.careGuide.watering}</Text>
                          ) : (
                            <View>
                              {careInfo.careGuide.watering.frequency && (
                                <View style={styles.infoRow}>
                                  <MaterialIcons name="schedule" size={18} color="#2E7D32" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Frequency: </Text>
                                    {careInfo.careGuide.watering.frequency}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.watering.method && (
                                <View style={[styles.infoRow, {marginTop: 8}]}>
                                  <MaterialIcons name="water-drop" size={18} color="#2E7D32" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Method: </Text>
                                    {careInfo.careGuide.watering.method}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.watering.signs && (
                                <View style={{marginTop: 10}}>
                                  <Text style={[styles.infoLabel, {marginBottom: 4}]}>Signs to watch for:</Text>
                                  {careInfo.careGuide.watering.signs.overwatered && (
                                    <View style={styles.infoRow}>
                                      <MaterialIcons name="error-outline" size={16} color="#D32F2F" style={{marginRight: 8}} />
                                      <Text style={styles.infoText}>
                                        <Text style={[styles.infoLabel, {color: '#D32F2F'}]}>Overwatered: </Text>
                                        {careInfo.careGuide.watering.signs.overwatered}
                                      </Text>
                                    </View>
                                  )}
                                  {careInfo.careGuide.watering.signs.underwatered && (
                                    <View style={[styles.infoRow, {marginTop: 4}]}>
                                      <MaterialIcons name="error-outline" size={16} color="#1976D2" style={{marginRight: 8}} />
                                      <Text style={styles.infoText}>
                                        <Text style={[styles.infoLabel, {color: '#1976D2'}]}>Underwatered: </Text>
                                        {careInfo.careGuide.watering.signs.underwatered}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Light */}
                      {careInfo.careGuide?.light && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>
                            <MaterialIcons name="wb-sunny" size={18} color="#FFA000" /> Light
                          </Text>
                          {typeof careInfo.careGuide.light === 'string' ? (
                            <Text style={styles.infoText}>{careInfo.careGuide.light}</Text>
                          ) : (
                            <View>
                              {careInfo.careGuide.light.requirements && (
                                <View style={styles.infoRow}>
                                  <MaterialIcons name="lightbulb-outline" size={18} color="#FFA000" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Requirements: </Text>
                                    {careInfo.careGuide.light.requirements}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.light.tolerance && (
                                <View style={[styles.infoRow, {marginTop: 8}]}>
                                  <MaterialIcons name="brightness-medium" size={18} color="#FFA000" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Tolerance: </Text>
                                    {careInfo.careGuide.light.tolerance}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.light.idealLocation && (
                                <View style={[styles.infoRow, {marginTop: 8}]}>
                                  <MaterialIcons name="location-on" size={18} color="#FFA000" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Ideal Location: </Text>
                                    {careInfo.careGuide.light.idealLocation}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Environment - Temperature & Humidity */}
                      {careInfo.careGuide?.environment && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>
                            <MaterialIcons name="thermostat" size={18} color="#D32F2F" /> Environment
                          </Text>
                          {careInfo.careGuide.environment.temperature?.ideal && (
                            <View style={styles.infoRow}>
                              <MaterialIcons name="device-thermostat" size={18} color="#D32F2F" style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                <Text style={styles.infoLabel}>Ideal Temperature: </Text>
                                {careInfo.careGuide.environment.temperature.ideal}
                              </Text>
                            </View>
                          )}
                          {(careInfo.careGuide.environment.temperature?.minTemp || careInfo.careGuide.environment.temperature?.maxTemp) && (
                            <View style={[styles.infoRow, {marginTop: 8}]}>
                              <MaterialIcons name="straighten" size={18} color="#D32F2F" style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                <Text style={styles.infoLabel}>Temperature Range: </Text>
                                {careInfo.careGuide.environment.temperature.minTemp || 'N/A'} - {careInfo.careGuide.environment.temperature.maxTemp || 'N/A'}°C
                              </Text>
                            </View>
                          )}
                          {careInfo.careGuide.environment.humidity && (
                            <View style={[styles.infoRow, {marginTop: 8}]}>
                              <MaterialIcons name="opacity" size={18} color="#1976D2" style={styles.infoIcon} />
                              <Text style={styles.infoText}>
                                <Text style={styles.infoLabel}>Humidity: </Text>
                                {careInfo.careGuide.environment.humidity}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Soil & Fertilizer */}
                      {careInfo.careGuide?.soil && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>
                            <MaterialIcons name="grass" size={18} color="#5D4037" /> Soil & Potting
                          </Text>
                          {typeof careInfo.careGuide.soil === 'string' ? (
                            <Text style={styles.infoText}>{careInfo.careGuide.soil}</Text>
                          ) : (
                            <View>
                              {careInfo.careGuide.soil.type && (
                                <View style={styles.infoRow}>
                                  <MaterialIcons name="layers" size={18} color="#5D4037" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Type: </Text>
                                    {careInfo.careGuide.soil.type}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.soil.ph && (
                                <View style={[styles.infoRow, {marginTop: 8}]}>
                                  <MaterialIcons name="science" size={18} color="#5D4037" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>pH Level: </Text>
                                    {careInfo.careGuide.soil.ph}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.soil.drainage && (
                                <View style={[styles.infoRow, {marginTop: 8}]}>
                                  <MaterialIcons name="opacity" size={18} color="#5D4037" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Drainage: </Text>
                                    {careInfo.careGuide.soil.drainage}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Fertilizer */}
                      {careInfo.careGuide?.feeding && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>
                            <MaterialIcons name="eco" size={18} color="#689F38" /> Feeding & Nutrition
                          </Text>
                          {typeof careInfo.careGuide.feeding === 'string' ? (
                            <Text style={styles.infoText}>{careInfo.careGuide.feeding}</Text>
                          ) : (
                            <View>
                              {careInfo.careGuide.feeding.fertilizer && (
                                <View style={styles.infoRow}>
                                  <MaterialIcons name="eco" size={18} color="#689F38" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Fertilizer: </Text>
                                    {careInfo.careGuide.feeding.fertilizer}
                                  </Text>
                                </View>
                              )}
                              {careInfo.careGuide.feeding.schedule && (
                                <View style={[styles.infoRow, {marginTop: 8}]}>
                                  <MaterialIcons name="event" size={18} color="#689F38" style={styles.infoIcon} />
                                  <Text style={styles.infoText}>
                                    <Text style={styles.infoLabel}>Schedule: </Text>
                                    {careInfo.careGuide.feeding.schedule}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Common Issues */}
                      {careInfo.commonIssues && (
                        <View style={styles.infoSection}>
                          <Text style={styles.sectionTitle}>
                            <MaterialIcons name="warning" size={18} color="#F57C00" /> Common Issues
                          </Text>
                          {Array.isArray(careInfo.commonIssues) ? (
                            careInfo.commonIssues.map((issue, index) => (
                              <View key={index} style={[styles.infoSection, {marginBottom: 16, backgroundColor: '#FFF8F0'}]}>
                                {issue.problem && (
                                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                                    <MaterialIcons name="warning" size={18} color="#F57C00" style={{marginRight: 8}} />
                                    <Text style={[styles.infoLabel, {color: '#F57C00', fontSize: 14, textTransform: 'none'}]}>
                                      {issue.problem}
                                    </Text>
                                  </View>
                                )}
                                {issue.symptoms && (
                                  <View style={{marginBottom: 8}}>
                                    <Text style={[styles.infoLabel, {color: '#5D4037', marginBottom: 4}]}>Symptoms:</Text>
                                    <Text style={styles.infoText}>{issue.symptoms}</Text>
                                  </View>
                                )}
                                {issue.solution && (
                                  <View style={{marginBottom: 8}}>
                                    <Text style={[styles.infoLabel, {color: '#2E7D32', marginBottom: 4}]}>Solution:</Text>
                                    <Text style={styles.infoText}>{issue.solution}</Text>
                                  </View>
                                )}
                                {issue.prevention && (
                                  <View>
                                    <Text style={[styles.infoLabel, {color: '#1976D2', marginBottom: 4}]}>Prevention:</Text>
                                    <Text style={styles.infoText}>{issue.prevention}</Text>
                                  </View>
                                )}
                              </View>
                            ))
                          ) : typeof careInfo.commonIssues === 'string' ? (
                            <Text style={styles.infoText}>{careInfo.commonIssues}</Text>
                          ) : (
                            <Text style={styles.infoText}>No common issues information available.</Text>
                          )}
                        </View>
                      )}
                    </ScrollView>
                  ) : (
                    <View style={[styles.centered, {padding: 40}]}>
                      <ActivityIndicator size="large" color="#2E7D32" />
                      <Text style={{marginTop: 20, color: '#666', textAlign: 'center'}}>
                        Loading care information...
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Confidence Explanation Modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={isConfidenceModalVisible}
              onRequestClose={() => setIsConfidenceModalVisible(false)}
            >
              <View style={styles.confidenceModalContainer}>
                <View style={styles.confidenceModalContent}>
                  <Text style={styles.confidenceModalTitle}>About Confidence Score</Text>
                  <Text style={styles.confidenceModalText}>
                    The confidence score indicates how certain our system is about the plant identification.
                    
                    {'\n\n'}A higher percentage means we're more confident in the match.
                    
                    {'\n\n'}To improve accuracy:
                    • Take a clear, well-lit photo
                    • Focus on leaves or flowers
                    • Avoid multiple plants in one photo
                    • Take photos from different angles
                  </Text>
                  <Pressable
                    onPress={() => setIsConfidenceModalVisible(false)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={styles.confidenceModalClose}>Got it</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Base container and layout
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Scroll view and content
  detailsScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  detailsContainer: {
    width: '100%',
    padding: 16,
  },
  
  // Section styles
  sectionContainer: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionContent: {
    padding: 16,
  },
  
  // Info section styles
  infoSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  
  // Info row styles
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    lineHeight: 22,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  
  // Care item styles
  careItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  careIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  careTextContainer: {
    flex: 1,
  },
  careTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  careText: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
  },
  
  // Care tip styles
  careTipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginTop: 9,
    marginRight: 12,
  },
  careTipText: {
    flex: 1,
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
  },
  
  // Special care elements
  wateringInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  seasonLabel: {
    fontWeight: '500',
    color: '#1976D2',
    marginRight: 8,
    minWidth: 70,
  },
  tempContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tempBadge: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tempText: {
    fontSize: 13,
    color: '#424242',
  },
  toleratedLight: {
    flexDirection: 'row',
    marginTop: 4,
    backgroundColor: '#FFFDE7',
    padding: 8,
    borderRadius: 6,
  },
  toleratedLabel: {
    fontSize: 13,
    color: '#F57F17',
    fontWeight: '500',
    marginRight: 4,
  },
  toleratedText: {
    fontSize: 13,
    color: '#5D4037',
    flex: 1,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  header1: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
  },
  header2: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  header3: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  
  // Text styles
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#424242',
  },
  
  // List styles
  listContainer: {
    marginBottom: 12,
    marginLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    marginRight: 8,
    color: '#333',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  
  // Code block styles
  codeBlock: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
  },
  
  // Source badge
  sourceBadge: {
    marginLeft: 'auto',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  
  // Error and button styles
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Image styles
  imageContainer: {
    width: '100%',
    height: width * 0.8,
    backgroundColor: '#f5f5f5',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  
  // Plant info styles
  infoContainer: {
    padding: 16,
  },
  nameContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  plantName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 2,
  },
  scientificName: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  confidenceContainer: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: 16,
  },
  nameContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  plantName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 2,
  },
  scientificName: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  confidenceContainer: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 8,
  },
  confidenceModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confidenceModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  confidenceModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2E7D32',
  },
  confidenceModalText: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  confidenceModalClose: {
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 10,
  },
  confidenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  infoIcon: {
    marginTop: 1, // Small adjustment for visual alignment
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  careItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  careIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  careTextContainer: {
    flex: 1,
  },
  detailsText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  careText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sourceText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  careTip: {
    flex: 1,
  },
  smallText: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
});

export default PlantDetailsScreen;
