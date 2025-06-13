import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConfidenceBadge({ probability }) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={styles.confidenceBadge} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.confidenceText}>{probability}% Match</Text>
        <Ionicons name="information-circle-outline" size={18} color="#2E7D32" style={styles.infoIcon} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confidence Score</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.infoItem}>
                <Ionicons name="help-circle-outline" size={20} color="#2E7D32" style={styles.bulletIcon} />
                <Text style={styles.infoText}>
                  This score indicates how confident our system is in identifying this plant. 
                  Higher percentages mean higher confidence.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" style={styles.bulletIcon} />
                <Text style={styles.infoText}>
                  <Text style={styles.boldText}>90-100%:</Text> Very high confidence in the identification.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D32" style={styles.bulletIcon} />
                <Text style={styles.infoText}>
                  <Text style={styles.boldText}>70-89%:</Text> High confidence, but consider verifying with additional photos.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="alert-circle-outline" size={20} color="#FFA000" style={styles.bulletIcon} />
                <Text style={styles.infoText}>
                  <Text style={styles.boldText}>50-69%:</Text> Moderate confidence. Try taking a clearer photo.
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="warning-outline" size={20} color="#D32F2F" style={styles.bulletIcon} />
                <Text style={styles.infoText}>
                  <Text style={styles.boldText}>Below 50%:</Text> Low confidence. The identification may be inaccurate.
                </Text>
              </View>
              
              <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>Tips for Better Results:</Text>
                <View style={styles.tipItem}>
                  <Ionicons name="camera" size={16} color="#2E7D32" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Take clear, well-lit photos of leaves, flowers, and bark</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="sunny" size={16} color="#2E7D32" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Include multiple angles of the plant</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="leaf" size={16} color="#2E7D32" style={styles.tipIcon} />
                  <Text style={styles.tipText}>Focus on distinctive features like flowers or fruits</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  confidenceText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  infoIcon: {
    marginLeft: 6,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: '90%',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '600',
    color: '#1B5E20',
  },
  tipBox: {
    backgroundColor: '#F5F9F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#81C784',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  tipIcon: {
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
  },
});
