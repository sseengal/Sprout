import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext';
import { createLogger } from './authUtils';
import * as authApi from './authApi';

export const AuthProvider = ({ children }) => {
  const logger = useMemo(() => createLogger('AuthProvider'), []);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up auth state listener
  useEffect(() => {
    logger('AuthProvider mounted');
    return () => logger('AuthProvider unmounted');
  }, [logger]);

  useEffect(() => {
    logger('Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      logger('Cleaning up auth state listener');
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, [logger]);

  // Compose all auth API methods using the state and setters
  const api = useMemo(() => authApi.createAuthApi({
    user, session, loading, error,
    setUser, setSession, setLoading, setError,
    logger
  }), [user, session, loading, error, logger]);

  // Compose context value
  const value = {
    user,
    session,
    loading,
    error,
    ...api
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
