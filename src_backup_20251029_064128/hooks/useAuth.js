// Authentication hook
import { useState, useEffect } from 'react';
import { authHelpers } from '../lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const { session, error } = await authHelpers.getCurrentSession();

      if (error) {
        setError(error);
        setUser(null);
      } else {
        setUser(session?.user || null);
      }
    } catch (err) {
      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await authHelpers.signIn(email, password);

      if (error) {
        setError(error);
        return { success: false, error };
      }

      setUser(data.user);
      return { success: true, data };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await authHelpers.signOut();

      if (error) {
        setError(error);
        return { success: false, error };
      }

      setUser(null);
      return { success: true };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    checkUser
  };
};

export default useAuth;
