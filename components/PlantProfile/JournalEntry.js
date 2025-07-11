import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView } from 'react-native';

const getIconForType = (type) => {
  switch (type) {
    case 'watering':
      return { name: 'water', color: '#2196F3' };
    case 'fertilizing':
      return { name: 'nutrition', color: '#FF9800' };
    default:
      return { name: 'note-text', color: '#4CAF50' };
  }
};

export const JournalEntry = ({ entry }) => {
  const { name: iconName, color: iconColor } = getIconForType(entry.type);
  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <View style={styles.entryContainer}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}
          <Text style={[styles.entryDate, !entry.title && styles.entryDateNoTitle]}>{formattedDate}</Text>
        </View>
        {entry.description ? <Text style={styles.entryDescription}>{entry.description}</Text> : null}
        {entry.images && entry.images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.imagesContainer}
            contentContainerStyle={styles.imagesContent}
          >
            {entry.images.map((image, index) => (
              <Image 
                key={`${entry.id}-${index}`} 
                source={{ uri: image.uri }} 
                style={styles.image} 
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  entryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  entryDate: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 8,
  },
  entryDateNoTitle: {
    marginLeft: 0,
  },
  entryDescription: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
    marginBottom: 8,
  },
  imagesContainer: {
    marginTop: 8,
  },
  imagesContent: {
    paddingRight: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
});

export default JournalEntry;
