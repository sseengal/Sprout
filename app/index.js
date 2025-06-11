import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the camera screen by default
  return <Redirect href="/camera" />;
}
