import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const signIn = (username, password) => {
    // Mock authentication - accepts any username/password
    if (username && password) {
      setUser({ username });
      return { success: true };
    }
    return { success: false, error: 'Please enter username and password' };
  };

  const signUp = (username, password) => {
    // Mock sign up
    if (username && password) {
      setUser({ username });
      return { success: true };
    }
    return { success: false, error: 'Please fill all fields' };
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};