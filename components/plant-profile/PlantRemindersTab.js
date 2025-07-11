import React from 'react';
import { StyleSheet, Text, View, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function PlantRemindersTab({ plant, reminders }) {
  // Format the date to a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Render a single reminder item
  const renderReminderItem = ({ item }) => (
    <View style={styles.reminderItem}>
      <View style={styles.reminderIconContainer}>
        <MaterialIcons 
          name={item.type === 'water' ? 'opacity' : 'eco'} 
          size={24} 
          color="#2E7D32" 
        />
      </View>
      <View style={styles.reminderContent}>
        <Text style={styles.reminderTitle}>{item.title}</Text>
        <Text style={styles.reminderDescription}>{item.description}</Text>
        <Text style={styles.reminderDate}>
          Next due: {formatDate(item.next_due)}
        </Text>
      </View>
      <View style={[
        styles.reminderStatus, 
        { backgroundColor: item.enabled ? '#4CAF50' : '#9E9E9E' }
      ]}>
        <Text style={styles.reminderStatusText}>
          {item.enabled ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {reminders && reminders.length > 0 ? (
        <FlatList
          data={reminders}
          renderItem={renderReminderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="notifications-none" size={64} color="#e0e0e0" />
          <Text style={styles.emptyStateTitle}>No Reminders</Text>
          <Text style={styles.emptyStateText}>
            You don't have any care reminders set up for this plant yet.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  reminderItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 12,
    color: '#888',
  },
  reminderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  reminderStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 32,
  },
});
