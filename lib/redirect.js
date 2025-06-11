import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

export const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

export const useOAuth = () => {
  const openAuthSession = async (url, redirectUrl) => {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        redirectUrl,
        {
          showInRecents: true,
        }
      );

      if (result.type === 'success') {
        Linking.openURL(result.url);
      }
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  return { openAuthSession };
};
