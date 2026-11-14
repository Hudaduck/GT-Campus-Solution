import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useBrand } from '../../shared/config/brandConfig';
import { UserProfile, UserRole } from '../../shared/contracts';
import { Repository, DEMO_STUDENT_USER, INITIAL_CURRENT_USER } from '../../shared/data/repository';

export interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  isStudent: boolean;
  isAlum: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  switchRole: (newRole: UserRole) => void;
  toggleRole: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  verifyStudentEmail: (email: string) => { success: boolean; error?: string };
  verifyAlumniEmail: (email: string) => { success: boolean; error?: string };
  verifyAlumniLinkedIn: (url: string) => { success: boolean; error?: string };
  verifyAlumniPeerVouch: (voucherName?: string) => { success: boolean; error?: string };
  completeOnboarding: (data: Partial<UserProfile>) => { success: boolean; error?: string };
  showLinkedInImport: boolean;
  setShowLinkedInImport: (show: boolean) => void;
  importLinkedInProfile: (profile: UserProfile) => void;
  resetAuthData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { brand } = useBrand();

  const [user, setUser] = useState<UserProfile>(() => {
    return Repository.getCurrentUser();
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState<boolean>(false);

  // Sync state on init and when another document (e.g. the Phone App device frame) changes the profile
  useEffect(() => {
    setUser(Repository.getCurrentUser());
    const handleStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'thirdplace_current_user') {
        setUser(Repository.getCurrentUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated: UserProfile = { ...prev, ...updates };
      Repository.setCurrentUser(updated);
      Repository.saveProfile(updated);
      return updated;
    });
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    let targetProfile: UserProfile;

    if (newRole === 'student') {
      targetProfile = { ...DEMO_STUDENT_USER };
    } else {
      targetProfile = { ...INITIAL_CURRENT_USER };
    }

    Repository.setCurrentUser(targetProfile);
    Repository.saveProfile(targetProfile);
    setUser(targetProfile);
  }, []);

  const toggleRole = useCallback(() => {
    const nextRole: UserRole = user.role === 'student' ? 'alumni' : 'student';
    switchRole(nextRole);
  }, [user.role, switchRole]);

  // Dual Verification: Instant Student @gatech.edu domain check
  const verifyStudentEmail = useCallback((email: string): { success: boolean; error?: string } => {
    const trimmed = (email || '').trim().toLowerCase();
    const expectedDomain = brand.studentEmailDomain.toLowerCase();

    if (!trimmed) {
      return { success: false, error: 'Email address cannot be empty.' };
    }

    if (!trimmed.endsWith(expectedDomain)) {
      return {
        success: false,
        error: `Invalid email. Must end with ${brand.studentEmailDomain} to verify student status.`,
      };
    }

    const updates: Partial<UserProfile> = {
      email: trimmed,
      role: 'student',
      verified: true,
      verificationMethod: 'gatech_sso',
    };

    updateProfile(updates);
    return { success: true };
  }, [brand.studentEmailDomain, updateProfile]);

  // Alumni Verification Method 1: Alumni Domain check (@alumni.gatech.edu or student domain)
  const verifyAlumniEmail = useCallback((email: string): { success: boolean; error?: string } => {
    const trimmed = (email || '').trim().toLowerCase();
    const expectedAlumDomain = brand.alumniEmailDomain.toLowerCase();
    const expectedStudentDomain = brand.studentEmailDomain.toLowerCase();

    if (!trimmed) {
      return { success: false, error: 'Email address cannot be empty.' };
    }

    if (!trimmed.endsWith(expectedAlumDomain) && !trimmed.endsWith(expectedStudentDomain)) {
      return {
        success: false,
        error: `Must end with ${brand.alumniEmailDomain} or ${brand.studentEmailDomain} to verify alumni credentials.`,
      };
    }

    const updates: Partial<UserProfile> = {
      email: trimmed,
      role: 'alumni',
      verified: true,
      verificationMethod: 'domain',
    };

    updateProfile(updates);
    return { success: true };
  }, [brand.alumniEmailDomain, brand.studentEmailDomain, updateProfile]);

  // Alumni Verification Method 2: LinkedIn Profile URL verification
  const verifyAlumniLinkedIn = useCallback((url: string): { success: boolean; error?: string } => {
    const trimmed = (url || '').trim();

    if (!trimmed) {
      return { success: false, error: 'LinkedIn URL cannot be empty.' };
    }

    // Accepts https://linkedin.com/in/... or http:// or www.linkedin.com/in/...
    const isLinkedIn = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?.*$/i.test(trimmed) ||
      trimmed.includes('linkedin.com/in/');

    if (!isLinkedIn) {
      return {
        success: false,
        error: 'Please provide a valid LinkedIn URL (e.g., https://linkedin.com/in/your-profile).',
      };
    }

    const formattedUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    const updates: Partial<UserProfile> = {
      linkedinUrl: formattedUrl,
      role: 'alumni',
      verified: true,
      verificationMethod: 'linkedin',
    };

    updateProfile(updates);
    return { success: true };
  }, [updateProfile]);

  // Alumni Verification Method 3: 1-Tap Peer Vouching
  const verifyAlumniPeerVouch = useCallback((voucherName: string = 'Buzz Ambassador Network'): { success: boolean; error?: string } => {
    const currentVouches = user.vouchesCount || 0;
    const currentVouchers = user.vouchedBy || [];

    const updates: Partial<UserProfile> = {
      role: 'alumni',
      verified: true,
      verificationMethod: 'peer_vouch',
      vouchesCount: currentVouches + 1,
      vouchedBy: [...currentVouchers, voucherName],
    };

    updateProfile(updates);
    return { success: true };
  }, [user.vouchesCount, user.vouchedBy, updateProfile]);

  // Complete onboarding validation & persistence
  const completeOnboarding = useCallback((data: Partial<UserProfile>): { success: boolean; error?: string } => {
    if (data.hobbies && (data.hobbies.length < 3 || data.hobbies.length > 5)) {
      return { success: false, error: 'Please choose between 3 and 5 hobbies.' };
    }

    if (!data.major || data.major.trim().length === 0) {
      return { success: false, error: 'Please specify your major or field of study.' };
    }

    if (!data.gradYear || data.gradYear < 1950 || data.gradYear > 2035) {
      return { success: false, error: 'Please enter a valid graduation year.' };
    }

    const updatedProfile: Partial<UserProfile> = {
      ...data,
      name: data.name || user.name,
      role: data.role || user.role,
      verified: data.verified !== undefined ? data.verified : true,
    };

    updateProfile(updatedProfile);
    setShowOnboarding(false);
    return { success: true };
  }, [user.name, user.role, updateProfile]);

  // LinkedIn importer: launch the generated profile into the live ecosystem
  const importLinkedInProfile = useCallback((profile: UserProfile) => {
    Repository.registerImportedProfile(profile);
    setUser(profile);
  }, []);

  const resetAuthData = useCallback(() => {
    Repository.resetAllData();
    setUser(Repository.getCurrentUser());
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    role: user.role,
    isStudent: user.role === 'student',
    isAlum: user.role === 'alumni',
    isAuthenticated: true,
    isVerified: !!user.verified,
    showOnboarding,
    setShowOnboarding,
    switchRole,
    toggleRole,
    updateProfile,
    verifyStudentEmail,
    verifyAlumniEmail,
    verifyAlumniLinkedIn,
    verifyAlumniPeerVouch,
    completeOnboarding,
    showLinkedInImport,
    setShowLinkedInImport,
    importLinkedInProfile,
    resetAuthData,
  }), [
    user,
    showOnboarding,
    switchRole,
    toggleRole,
    updateProfile,
    verifyStudentEmail,
    verifyAlumniEmail,
    verifyAlumniLinkedIn,
    verifyAlumniPeerVouch,
    completeOnboarding,
    showLinkedInImport,
    importLinkedInProfile,
    resetAuthData,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
