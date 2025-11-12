import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (username, password) => {
    // Using username as email for Supabase (you can modify this)
    const email = `${username}@studysphere.app`; // Create a fake email from username
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username, // Store username in user metadata
        }
      }
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const signIn = async (username, password) => {
    // Using username as email for Supabase
    const email = `${username}@studysphere.app`;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    loading,
    // Add username getter for display
    username: user?.user_metadata?.username || user?.email?.split('@')[0] || 'user'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}