import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatReminderDate, getCareTypeIcon, getCareTypeColor, getReminderStatus } from '../../utils/reminderUtils';

/**
 * Individual reminder item component
 */
const ReminderItem = ({ 
  reminder, 
  onToggle, 
  onEdit, 
  onDelete,
  onComplete
}) => {
  const { care_type, next_due, enabled, plant_name, notes, reminder_time } = reminder;
  
  // Get icon and color based on care type
  const iconName = getCareTypeIcon(care_type);
  const iconColor = getCareTypeColor(care_type);
  
  // Get status based on due date
  const status = getReminderStatus(next_due);
  
  // Format the due date
  const formattedDate = formatReminderDate(next_due);
  
  return (
    <View style={[
      styles.container,
      !enabled && styles.disabled,
      status === 'overdue' && styles.overdue,
      status === 'due-soon' && styles.dueSoon
    ]}>
      <TouchableOpacity 
        style={styles.mainContent}
        onPress={() => onEdit && onEdit(reminder)}
      >
        <View style={styles.contentContainer}>
          <View style={styles.careTypeRow}>
            <MaterialIcons name={iconName} size={18} color={iconColor} style={styles.inlineIcon} />
            <Text style={styles.careType}>
              {care_type.charAt(0).toUpperCase() + care_type.slice(1)}
            </Text>
          </View>
          <Text style={styles.plantName} numberOfLines={1}>
            {plant_name}
          </Text>
          <Text style={styles.dueDate}>
            {status === 'overdue' ? 'Overdue' : 'Due'}: {formattedDate}
            {reminder_time && ` at ${new Date(reminder_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
          </Text>
          {notes ? <Text style={styles.notes} numberOfLines={1}>{notes}</Text> : null}
        </View>
      </TouchableOpacity>
      
      <View style={styles.actionsContainer}>
        <Switch
          value={enabled}
          onValueChange={() => onToggle && onToggle(reminder.id)}
          trackColor={{ false: '#d1d1d1', true: '#a5d6a7' }}
          thumbColor={enabled ? '#2E7D32' : '#f4f3f4'}
        />
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => onDelete && onDelete(reminder.id)}
        >
          <MaterialIcons name="delete-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  overdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  dueSoon: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  careTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    marginRight: 6,
  },
  careType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  plantName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dueDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 6,
    marginLeft: 8,
  },
});

export default ReminderItem;
