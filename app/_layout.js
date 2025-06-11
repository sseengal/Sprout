import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Always show the login screen first
  // No need for loading state or auth checks
  
  return (
    <AuthProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack 
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2E7D32',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="plant-details/index"
          options={{
            title: 'Plant Details',
            presentation: 'modal',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
