import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NewMessageScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Message</Text>
      <Text style={styles.subtitle}>Create a new message</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
