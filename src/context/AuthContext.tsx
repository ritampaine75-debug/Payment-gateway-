import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  isFirebaseLive,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from '../firebase';
import { MerchantProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: MerchantProfile | null;
  loading: boolean;
  isFirebaseConnected: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string, upi?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsDemoMerchant: (role?: string) => void;
  updateMerchantProfile: (updated: Partial<MerchantProfile>) => void;
  logout: () => Promise<void>;
}

const DEFAULT_DEMO_MERCHANT: MerchantProfile = {
  uid: 'MERCHANT_APEX_84920',
  email: 'merchant@apexpay.io',
  businessName: 'Apex Cloud & Digital Store',
  upiId: 'apexcloud@okhdfcbank',
  secretKey: 'sec_k982_apex_prod_90284910284910284910294812',
  defaultAmount: 499,
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_MERCHANT_PROFILE = 'dyn_upi_merchant_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    // Check saved local profile first
    const saved = localStorage.getItem(STORAGE_KEY_MERCHANT_PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.businessName });
      } catch (e) {
        // use default
      }
    } else {
      // Default to demo merchant for instantaneous out-of-the-box readiness
      setProfile(DEFAULT_DEMO_MERCHANT);
      setUser({
        uid: DEFAULT_DEMO_MERCHANT.uid,
        email: DEFAULT_DEMO_MERCHANT.email,
        displayName: DEFAULT_DEMO_MERCHANT.businessName
      });
    }

    if (isFirebaseLive && auth) {
      const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          const currentProfile: MerchantProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'user@example.com',
            businessName: firebaseUser.displayName || 'My UPI Merchant',
            upiId: profile?.upiId || 'merchant@okhdfcbank',
            secretKey: profile?.secretKey || 'sec_k982_' + firebaseUser.uid.substring(0, 10),
            defaultAmount: profile?.defaultAmount || 250,
            createdAt: Date.now()
          };
          setProfile(currentProfile);
          localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(currentProfile));
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      if (isFirebaseLive && auth) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        // Offline / mock login
        const newUid = 'UID_' + btoa(email).substring(0, 12).toUpperCase();
        const demoProf: MerchantProfile = {
          uid: newUid,
          email,
          businessName: email.split('@')[0].toUpperCase() + ' Merchant',
          upiId: `${email.split('@')[0]}@okhdfcbank`,
          secretKey: 'sec_key_' + Math.random().toString(36).substring(2, 12),
          defaultAmount: 199,
          createdAt: Date.now()
        };
        setUser({ uid: demoProf.uid, email: demoProf.email, displayName: demoProf.businessName });
        setProfile(demoProf);
        localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(demoProf));
      }
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string, upi?: string) => {
    setLoading(true);
    try {
      if (isFirebaseLive && auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const newProf: MerchantProfile = {
          uid: cred.user.uid,
          email: cred.user.email || email,
          businessName: name || 'UPI Merchant Store',
          upiId: upi || `${email.split('@')[0]}@okhdfcbank`,
          secretKey: 'sec_key_' + Math.random().toString(36).substring(2, 12),
          defaultAmount: 299,
          createdAt: Date.now()
        };
        setProfile(newProf);
        localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(newProf));
      } else {
        const newUid = 'UID_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const newProf: MerchantProfile = {
          uid: newUid,
          email,
          businessName: name || email.split('@')[0].toUpperCase() + ' Store',
          upiId: upi || `${email.split('@')[0]}@okhdfcbank`,
          secretKey: 'sec_key_' + Math.random().toString(36).substring(2, 12),
          defaultAmount: 299,
          createdAt: Date.now()
        };
        setUser({ uid: newProf.uid, email: newProf.email, displayName: newProf.businessName });
        setProfile(newProf);
        localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(newProf));
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      if (isFirebaseLive && auth) {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        // Local simulation of Google Sign-in
        const googleUser: MerchantProfile = {
          uid: 'MERCHANT_GOOGLE_74829',
          email: 'founder@mybrand.com',
          businessName: 'Google Verified Merchant Inc.',
          upiId: 'founder.upi@okaxis',
          secretKey: 'sec_google_k982_x90284910284910284910',
          defaultAmount: 500,
          createdAt: Date.now()
        };
        setUser({ uid: googleUser.uid, email: googleUser.email, displayName: googleUser.businessName });
        setProfile(googleUser);
        localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(googleUser));
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAsDemoMerchant = (role?: string) => {
    const demo = { ...DEFAULT_DEMO_MERCHANT };
    if (role === 'gaming') {
      demo.businessName = 'PixelForge Game Arena';
      demo.upiId = 'pixelforge@ybl';
      demo.defaultAmount = 149;
    } else if (role === 'freelance') {
      demo.businessName = 'Kavya Designs & Consulting';
      demo.upiId = 'kavyadesigns@okhdfcbank';
      demo.defaultAmount = 2500;
    }
    setProfile(demo);
    setUser({ uid: demo.uid, email: demo.email, displayName: demo.businessName });
    localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(demo));
  };

  const updateMerchantProfile = (updated: Partial<MerchantProfile>) => {
    if (!profile) return;
    const newProfile = { ...profile, ...updated };
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY_MERCHANT_PROFILE, JSON.stringify(newProfile));
  };

  const logout = async () => {
    if (isFirebaseLive && auth) {
      await signOut(auth);
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY_MERCHANT_PROFILE);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isFirebaseConnected: isFirebaseLive,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInAsDemoMerchant,
        updateMerchantProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
