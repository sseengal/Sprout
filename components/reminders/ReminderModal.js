import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { calculateNextDueDate, getFrequencyLabel } from '../../utils/reminderUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';

/**
 * Modal for adding or editing reminders
 */
const ReminderModal = ({ 
  visible, 
  onClose, 
  onSave, 
  reminder = null,
  plantName = '',
  plantId = null
}) => {
  // Default values for a new reminder
  const defaultValues = {
    care_type: 'watering',
    frequency_days: 7,
    enabled: true,
    plant_name: plantName,
    plant_id: plantId, // Ensure plant_id is always included
    notes: '',
    reminder_time: new Date().setHours(9, 0, 0, 0) // Default to 9:00 AM
  };
  
  // State for form fields
  const [formValues, setFormValues] = useState(reminder || defaultValues);
  
  // State for date and time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(
    new Date(formValues.reminder_time || new Date().setHours(9, 0, 0, 0))
  );
  
  // Reset form when modal opens/closes or reminder changes
  useEffect(() => {
    if (visible) {
      const initialValues = reminder || { ...defaultValues, plant_name: plantName };
      setFormValues(initialValues);
      
      // Initialize date and time
      const dueDate = initialValues.next_due ? new Date(initialValues.next_due) : new Date();
      setSelectedDate(dueDate);
      
      const reminderTime = initialValues.reminder_time 
        ? new Date(initialValues.reminder_time) 
        : new Date().setHours(9, 0, 0, 0);
      setSelectedTime(new Date(reminderTime));
    }
  }, [visible, reminder, plantName]);
  
  // Handle care type selection
  const handleCareTypeSelect = (careType) => {
    setFormValues(prev => ({ ...prev, care_type: careType }));
  };
  
  // Handle frequency selection
  const handleFrequencySelect = (days) => {
    setFormValues(prev => ({ ...prev, frequency_days: days }));
  };
  
  // Handle notes change
  const handleNotesChange = (text) => {
    setFormValues(prev => ({ ...prev, notes: text }));
  };
  
  // These handlers are now handled directly in the DateTimePickerModal components
  
  // Removed state for validation error

  // Handle save button
  const handleSave = () => {
    // Combine selected date and time
    const combinedDateTime = new Date(selectedDate);
    combinedDateTime.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0
    );
    
    // Validate that the date is not in the past
    const now = new Date();
    if (combinedDateTime <= now) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Date',
        text2: 'Reminder date and time must be in the future',
        position: 'bottom',
        visibilityTime: 3000
      });
      return;
    }
    
    onSave({
      ...formValues,
      next_due: combinedDateTime.toISOString(),
      reminder_time: selectedTime.toISOString()
    });
    
    onClose();
  };
  
  // Track keyboard visibility
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {reminder ? 'Edit Reminder' : 'New Reminder'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                ref={scrollViewRef}
                style={styles.formContainer}
                keyboardShouldPersistTaps="handled"
>
                <Text style={styles.sectionTitle}>Plant</Text>
                <View style={styles.plantNameContainer}>
                  <Text style={styles.plantName}>{formValues.plant_name}</Text>
                </View>
                
                <Text style={styles.sectionTitle}>Care Type</Text>
                <View style={styles.optionsContainer}>
                  <Pressable
                    style={[
                      styles.optionButton,
                      formValues.care_type === 'watering' && styles.optionSelected
                    ]}
                    onPress={() => handleCareTypeSelect('watering')}
                  >
                    <MaterialIcons 
                      name="water-drop" 
                      size={24} 
                      color={formValues.care_type === 'watering' ? '#fff' : '#2196F3'} 
                    />
                    <Text 
                      style={[
                        styles.optionText,
                        formValues.care_type === 'watering' && styles.optionTextSelected
                      ]}
                    >
                      Watering
                    </Text>
                  </Pressable>
                    
                  <Pressable
                    style={[
                      styles.optionButton,
                      formValues.care_type === 'fertilizing' && styles.optionSelected,
                      styles.optionFertilizing
                    ]}
                    onPress={() => handleCareTypeSelect('fertilizing')}
                  >
                    <MaterialIcons 
                      name="compost" 
                      size={24} 
                      color={formValues.care_type === 'fertilizing' ? '#fff' : '#8BC34A'} 
                    />
                    <Text 
                      style={[
                        styles.optionText,
                        formValues.care_type === 'fertilizing' && styles.optionTextSelected
                      ]}
                    >
                      Fertilizing
                    </Text>
                  </Pressable>
                </View>
                
                <Text style={styles.sectionTitle}>Frequency</Text>
                <View style={styles.frequencyContainer}>
                  {[1, 7, 14, 30].map((days) => (
                    <Pressable
                      key={days}
                      style={[
                        styles.frequencyButton,
                        formValues.frequency_days === days && styles.frequencySelected
                      ]}
                      onPress={() => handleFrequencySelect(days)}
                    >
                      <Text 
                        style={[
                          styles.frequencyText,
                          formValues.frequency_days === days && styles.frequencyTextSelected
                        ]}
                      >
                        {getFrequencyLabel(days)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                
                {/* Date and Time Selection */}
                <Text style={styles.sectionTitle}>Reminder Date & Time</Text>
                {/* Removed inline error message */}
                <View style={styles.dateTimeContainer}>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.dateButton]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <MaterialIcons name="calendar-today" size={20} color="#2E7D32" />
                    <Text style={styles.datePickerText}>
                      {selectedDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.timeButton]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <MaterialIcons name="access-time" size={20} color="#2E7D32" />
                    <Text style={styles.datePickerText}>
                      {selectedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Date Picker - Platform specific implementation */}
                {showDatePicker && Platform.OS === 'ios' && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.iosPickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) setSelectedDate(date);
                      }}
                      minimumDate={new Date()}
                      style={styles.iosPicker}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>
                )}
                
                {showDatePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                    minimumDate={new Date()}
                  />
                )}
                
                {/* Time Picker - Platform specific implementation */}
                {showTimePicker && Platform.OS === 'ios' && (
                  <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.iosPickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={styles.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      onChange={(event, time) => {
                        if (time) setSelectedTime(time);
                      }}
                      style={styles.iosPicker}
                      textColor="#000000"
                      themeVariant="light"
                    />
                  </View>
                )}
                
                {showTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={(event, time) => {
                      setShowTimePicker(false);
                      if (time) setSelectedTime(time);
                    }}
                  />
                )}
                
                {/* Notes Field */}
                <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes about this reminder..."
                  multiline
                  numberOfLines={3}
                  value={formValues.notes}
                  onChangeText={handleNotesChange}
                />
              </ScrollView>
              
              <TouchableOpacity 
                style={[styles.saveButton, keyboardVisible && styles.keyboardVisibleButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save Reminder</Text>
              </TouchableOpacity>
              
              {/* iOS-specific pickers have been replaced with a consistent cross-platform approach */}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
    marginTop: 16,
  },
  plantNameContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  plantName: {
    fontSize: 16,
    color: '#333',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  optionFertilizing: {
    marginRight: 0,
    marginLeft: 8,
  },
  optionSelected: {
    backgroundColor: '#2E7D32',
  },
  optionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frequencyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  frequencySelected: {
    backgroundColor: '#2E7D32',
  },
  frequencyText: {
    fontSize: 14,
    color: '#333',
  },
  frequencyTextSelected: {
    color: '#fff',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  dateButton: {
    flex: 1,
    marginRight: 8,
  },
  timeButton: {
    flex: 1,
    marginLeft: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginTop: 5,
  },
  pickerDoneText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 80,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardVisibleButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
  },
  iosPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#F8F8F8',
  },
  iosPickerCancel: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  iosPickerDone: {
    color: '#2E7D32',
    fontSize: 17,
    fontWeight: '600',
  },
  iosPicker: {
    height: 216,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
});

export default ReminderModal;
