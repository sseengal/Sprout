import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

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

function renderValue(val, level = 0, isCommonIssue = false) {
  if (Array.isArray(val)) {
    return (
      <View style={{ marginLeft: level > 0 ? 32 : 24 }}>
        {val.map((item, idx) => {
          // If it's a common issue item, render it with special styling
          if (item && typeof item === 'object' && (item.problem || item.symptoms || item.solution)) {
            return <View key={`${level}-${idx}`}>{renderValue(item, level, true)}</View>;
          }
          return (
            <Text key={`${level}-${idx}`} style={[styles.bulletText, { marginLeft: 8 }]}>
              • {typeof item === 'object' ? JSON.stringify(item) : item}
            </Text>
          );
        })}
      </View>
    );
  } else if (val && typeof val === 'object') {
    // Special handling for common issue objects
    if (isCommonIssue || val.problem || val.symptoms || val.solution || val.prevention) {
      return (
        <View style={[styles.commonIssueContainer, { marginLeft: level > 0 ? 16 : 0, marginTop: 8 }]}>
          <View style={styles.commonIssueContent}>
            {val.problem && (
              <View style={[styles.infoRow, { marginBottom: 8 }]}>
                <Ionicons name="warning" size={18} color="#E65100" style={{ marginRight: 8 }} />
                <Text style={[styles.commonIssueTitle]}>{val.problem}</Text>
              </View>
            )}
            
            {val.symptoms && (
              <View style={styles.issueSection}>
                <Text style={styles.issueSectionTitle}>Symptoms</Text>
                <View style={styles.issueSectionContent}>
                  {Array.isArray(val.symptoms) ? (
                    val.symptoms.map((symptom, idx) => (
                      <View key={idx} style={styles.issueItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.issueText}>{symptom}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.issueItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.issueText}>{val.symptoms}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            
            {val.solution && (
              <View style={styles.issueSection}>
                <Text style={styles.issueSectionTitle}>Solution</Text>
                <View style={styles.issueSectionContent}>
                  {Array.isArray(val.solution) ? (
                    val.solution.map((step, idx) => (
                      <View key={idx} style={styles.issueItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.issueText}>{step}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.issueItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.issueText}>{val.solution}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            
            {val.prevention && (
              <View style={styles.issueSection}>
                <Text style={styles.issueSectionTitle}>Prevention</Text>
                <View style={styles.issueSectionContent}>
                  {Array.isArray(val.prevention) ? (
                    val.prevention.map((tip, idx) => (
                      <View key={idx} style={styles.issueItem}>
                        <View style={styles.bullet} />
                        <Text style={styles.issueText}>{tip}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.issueItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.issueText}>{val.prevention}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Handle generic objects
    return (
      <View style={{ marginLeft: level > 0 ? 32 : 24 }}>
        {Object.entries(val).map(([k, v], idx) => (
          <View key={`${level}-${k}-${idx}`} style={{ marginTop: 4 }}>
            <View style={styles.infoRow}>
              <Ionicons name="leaf" size={16} color="#666" />
              <Text style={[styles.infoText, { fontWeight: '600' }]}>
                {k.charAt(0).toUpperCase() + k.slice(1)}:
              </Text>
            </View>
            {typeof v === 'string' || typeof v === 'number' ? (
              <Text key={`${level}-${k}-value`} style={[styles.infoText, { marginLeft: 32 }]}>{v}</Text>
            ) : (
              <View key={`${level}-${k}-nested`}>
                {renderValue(v, level + 1)}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  } else if (val === null || val === undefined) {
    return null;
  }
  return <Text style={[styles.infoText, { marginLeft: level > 0 ? 32 : 24 }]}>{String(val)}</Text>;
}

const ExpandableSection = ({ title, icon, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <View style={styles.expandableSection}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.sectionHeader}
      >
        <View style={styles.headerContent}>
          <Ionicons name={icon} size={18} color="#2E7D32" style={styles.sectionIcon} />
          <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

export default function CareInstructionsSection({ careTips, careDetails }) {
  if (careDetails) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Care Instructions</Text>
        {Object.entries(careDetails).map(([key, val]) =>
          val ? (
            <ExpandableSection
              key={key}
              title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              icon={CARE_ICONS[key] || 'leaf'}
            >
              {renderValue(val)}
            </ExpandableSection>
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
      {Array.isArray(careTips) ? (
        careTips.map((tip, idx) => (
          <Text key={idx} style={styles.bulletText}>• {tip}</Text>
        ))
      ) : (
        <Text style={styles.infoText}>{careTips}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  expandableSection: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  sectionContent: {
    overflow: 'hidden',
  },
  sectionContentInner: {
    padding: 12,
    paddingTop: 0,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2E7D32',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  expandableSection: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  sectionContent: {
    padding: 12,
    paddingTop: 0,
  },
  expandableSection: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  sectionContent: {
    padding: 12,
    paddingTop: 0,
  },
  expandableSection: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  sectionContent: {
    padding: 12,
    paddingTop: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  infoText: {
    flex: 1,
    color: '#424242',
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 0, // Remove left margin
    paddingLeft: 4, // Add small padding for text alignment
  },
  bulletText: {
    color: '#424242',
    fontSize: 15,
    lineHeight: 22,
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
  // Common Issues Styles
  commonIssueContainer: {
    backgroundColor: '#FFF9F5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 12,
    marginVertical: 8,
    marginLeft: 0, // Align with parent container
    marginRight: 0,
  },
  commonIssueContent: {
    flex: 1,
  },
  commonIssueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    flex: 1,
  },
  issueSection: {
    marginTop: 12,
  },
  issueSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  issueSectionContent: {
    marginLeft: 0, // Remove left margin to align with parent
    paddingLeft: 12, // Use padding instead of margin for content alignment
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginTop: 9,
    marginRight: 8,
    marginLeft: 12, // Align bullet with content
  },
  issueText: {
    flex: 1,
    color: '#424242',
    fontSize: 14,
    lineHeight: 20,
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
