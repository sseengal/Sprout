import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

export const toastConfig = {
  info: (props) => {
    return (
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{props.text1}</Text>
          {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
        </View>
        {props.props?.onUndo && (
          <TouchableOpacity 
            style={styles.undoButton}
            onPress={props.props.onUndo}
            activeOpacity={0.6}
          >
            <Text style={styles.undoText}>UNDO</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
  success: BaseToast,
  error: ErrorToast,
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  message: {
    fontSize: 12,
    color: '#DDDDDD',
    marginTop: 2,
  },
  undoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  undoText: {
    color: '#4CAF50',
    fontWeight: '700',
    fontSize: 16,
  },
});
