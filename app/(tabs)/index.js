import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sprout</Text>
        <Text style={styles.subtitle}>Your Personal Plant Care Assistant</Text>
      </View>
      
      <View style={styles.content}>
        <Image 
          source={{ uri: 'https://cdn.pixabay.com/photo/2017/01/10/03/06/plant-1968070_1280.png' }} 
          style={styles.heroImage}
          resizeMode="contain"
        />
        
        <Text style={styles.welcomeText}>
          Identify plants and get care tips instantly with your camera
        </Text>
        
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/camera')}
        >
          <MaterialIcons name="camera-alt" size={24} color="white" />
          <Text style={styles.ctaButtonText}>Identify a Plant</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2E7D32',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  heroImage: {
    width: '100%',
    height: 250,
    marginBottom: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  welcomeText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
    lineHeight: 28,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
});
