import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function PlantDataDebug({ data, title = "Debug Data" }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.text}>
          {JSON.stringify(data, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  scrollView: {
    maxHeight: 200,
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
});
