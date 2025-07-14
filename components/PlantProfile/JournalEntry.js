import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  console.log('[DEBUG] JournalEntry - Rendering entry:', JSON.stringify(entry));
  
  const { name: iconName, color: iconColor } = getIconForType(entry.type);
  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Check if this entry was created from a reminder
  const isReminderEntry = entry.fromReminder === true;
  console.log(`[DEBUG] JournalEntry - Is reminder entry: ${isReminderEntry}, reminderId: ${entry.reminderId || 'none'}`);
  console.log(`[DEBUG] JournalEntry - Entry type: ${entry.type}, date: ${formattedDate}`);
  

  return (
    <View style={[styles.entryContainer, isReminderEntry && styles.reminderEntryContainer]}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}
          <View style={styles.dateContainer}>
            {isReminderEntry && (
              <MaterialCommunityIcons 
                name="bell-check-outline" 
                size={14} 
                color="#2E7D32" 
                style={styles.reminderIcon} 
              />
            )}
            <Text style={[styles.entryDate, !entry.title && styles.entryDateNoTitle]}>{formattedDate}</Text>
          </View>
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
  reminderEntryContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIcon: {
    marginRight: 4,
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
