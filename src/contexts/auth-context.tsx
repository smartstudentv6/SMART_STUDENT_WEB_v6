
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'student' | 'teacher';

export interface User {
  username: string;
  role: UserRole;
  displayName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

// Mock users database
const USERS: Record<string, { password: string; role: UserRole; displayName: string }> = {
  'admin': {
    password: '1234',
    role: 'admin',
    displayName: 'Administrador'
  },
  'felipe': {
    password: '1234',
    role: 'student',
    displayName: 'Felipe'
  },
  'jorge': {
    password: '1234',
    role: 'teacher',
    displayName: 'Jorge'
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for persisted auth state
    const storedAuth = localStorage.getItem('smart-student-auth');
    const storedUser = localStorage.getItem('smart-student-user');
    
    if (storedAuth === 'true' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(userData);
      } catch (error) {
        // If stored data is invalid, clear it
        localStorage.removeItem('smart-student-auth');
        localStorage.removeItem('smart-student-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, pass: string): Promise<boolean> => {
    const userKey = username.toLowerCase();
    const userData = USERS[userKey];
    
    if (userData && userData.password === pass) {
      const user: User = {
        username: userKey,
        role: userData.role,
        displayName: userData.displayName
      };
      
      setIsAuthenticated(true);
      setUser(user);
      localStorage.setItem('smart-student-auth', 'true');
      localStorage.setItem('smart-student-user', JSON.stringify(user));
      router.push('/dashboard');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('smart-student-auth');
    localStorage.removeItem('smart-student-user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    