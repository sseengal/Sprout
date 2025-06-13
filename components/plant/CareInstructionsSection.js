import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARE_ICONS = {
  watering: 'water',
  light: 'sunny',
  temperature: 'thermometer',
  humidity: 'cloud',
  soil: 'flower',
  feeding: 'nutrition',
  maintenance: 'build',
  seasonalCare: 'calendar',
  commonIssues: 'bug',
  propagation: 'leaf',
};

function renderValue(val, bullet = false) {
  if (Array.isArray(val)) {
    return val.length === 0 ? null : (
      <View style={{ marginLeft: 10 }}>
        {val.map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 }}>
            <Text style={styles.bulletText}>{'•'}</Text>
            <Text style={{ flex: 1 }}>{typeof item === 'object' ? renderValue(item, false) : item}</Text>
          </View>
        ))}
      </View>
    );
  } else if (typeof val === 'object' && val !== null) {
    return (
      <View style={{ marginLeft: 10 }}>
        {Object.entries(val).map(([k, v], idx) => (
          <View key={idx} style={{ marginBottom: 2 }}>
            <Text style={{ fontWeight: '600', fontSize: 15 }}>{k.charAt(0).toUpperCase() + k.slice(1)}:</Text>
            <Text style={{ marginLeft: 8 }}>{renderValue(v, false)}</Text>
          </View>
        ))}
      </View>
    );
  } else if (typeof val === 'string' || typeof val === 'number') {
    return bullet ? <Text style={styles.bulletText}>• {val}</Text> : <Text style={styles.infoText}>{val}</Text>;
  } else {
    return null;
  }
}

export default function CareInstructionsSection({ careTips, careDetails }) {
  if (careDetails) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Care Instructions</Text>
        {Object.entries(careDetails).map(([key, val]) =>
          val ? (
            <View style={styles.infoRow} key={key}>
              <Ionicons
                name={CARE_ICONS[key] || 'leaf'}
                size={16}
                color="#388E3C"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.infoKey}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</Text>
              <View style={{ flex: 1, marginLeft: 8 }}>{renderValue(val, Array.isArray(val))}</View>
            </View>
          ) : null
        )}
      </View>
    );
  }

  if (!careTips || (Array.isArray(careTips) && careTips.length === 0)) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Care Instructions</Text>
      {Array.isArray(careTips)
        ? careTips.map((tip, idx) => (
            <Text key={idx} style={styles.bulletText}>• {tip}</Text>
          ))
        : <Text style={styles.sectionContent}>{careTips}</Text>
      }
        <View style={styles.careItem}>
          <Ionicons name="sunny" size={20} color="#FFC107" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Sunlight</Text>
            <Text style={styles.careDescription}>{careTips.sunlight}</Text>
          </View>
        </View>
      )}
      {careTips.temperature && (
        <View style={styles.careItem}>
          <Ionicons name="thermometer" size={20} color="#F44336" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Temperature</Text>
            <Text style={styles.careDescription}>{careTips.temperature}</Text>
          </View>
        </View>
      )}
      {careTips.fertilizer && (
        <View style={styles.careItem}>
          <Ionicons name="nutrition" size={20} color="#8BC34A" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Fertilizer</Text>
            <Text style={styles.careDescription}>{careTips.fertilizer}</Text>
          </View>
        </View>
      )}
      {careTips.customTips && Array.isArray(careTips.customTips) && careTips.customTips.length > 0 && (
        <View style={styles.careItem}>
          <Ionicons name="list" size={20} color="#607D8B" />
          <View style={styles.careTextContainer}>
            <Text style={styles.careTitle}>Additional Tips</Text>
            {careTips.customTips.map((tip, idx) => (
              <Text key={idx} style={styles.careDescription}>• {tip}</Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1B5E20',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  careItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  careTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  careTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#2E7D32',
  },
  careDescription: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    marginBottom: 4,
  },
});
