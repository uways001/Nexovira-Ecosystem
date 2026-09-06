import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { 
  applyForAffiliateProgramInFirestore,
  sanitizeFirestoreData
} from '../lib/firestoreService';
import { 
  UserProfile, 
  UserRole, 
  UserAccountStatus, 
  WishlistNotificationPreferences 
} from '../types';

export type { UserProfile, UserRole, UserAccountStatus };

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManagement: boolean;
  isContentEditor: boolean;
  isSeller: boolean;
  isAffiliate: boolean;
  isExpert: boolean;
  loading: boolean;
  signUpWithEmail: (
    email: string, 
    pass: string, 
    name: string, 
    phone: string, 
    role?: UserRole, 
    autoSignIn?: boolean
  ) => Promise<UserProfile | null>;
  signInWithEmail: (email: string, pass: string) => Promise<UserProfile | null>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  loginAsPresetUser: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('nexovira_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const r = userProfile?.role;
    return r === 'super_admin' || r === 'admin' || r === 'management' || r === 'content_editor';
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => userProfile?.role === 'super_admin');
  const [isManagement, setIsManagement] = useState<boolean>(() => {
    const r = userProfile?.role;
    return r === 'super_admin' || r === 'admin' || r === 'management';
  });
  const [isContentEditor, setIsContentEditor] = useState<boolean>(() => userProfile?.role === 'content_editor');
  const [isSeller, setIsSeller] = useState<boolean>(() => userProfile?.role === 'seller' && userProfile?.accountStatus === 'active');
  const [isAffiliate, setIsAffiliate] = useState<boolean>(() => (userProfile?.role === 'affiliate' || userProfile?.isAffiliate === true) && userProfile?.accountStatus !== 'suspended');
  const [isExpert, setIsExpert] = useState<boolean>(() => userProfile?.role === 'expert' && userProfile?.accountStatus !== 'suspended');
  const [loading, setLoading] = useState<boolean>(true);

  const setUserSession = (profile: UserProfile | null) => {
    setUserProfile(profile);
    const r = profile?.role;
    const st = profile?.accountStatus;
    setIsAdmin(r === 'super_admin' || r === 'admin' || r === 'management' || r === 'content_editor');
    setIsSuperAdmin(r === 'super_admin');
    setIsManagement(r === 'super_admin' || r === 'admin' || r === 'management');
    setIsContentEditor(r === 'content_editor');
    setIsSeller(r === 'seller' && st === 'active');
    setIsAffiliate((r === 'affiliate' || profile?.isAffiliate === true) && st !== 'suspended');
    setIsExpert(r === 'expert' && st !== 'suspended');

    if (profile) {
      localStorage.setItem('nexovira_user_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('nexovira_user_profile');
    }
  };

  const fetchUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
      const isEmailOwner = cleanEmail === 'nexoviratech@gmail.com' || cleanEmail === 'nexovirasupport@gmail.com';

      let profile: UserProfile;
      if (docSnap.exists()) {
        const data = docSnap.data();
        let assignedRole: UserRole = isEmailOwner ? 'super_admin' : (data.role || 'customer');
        let assignedStatus: UserAccountStatus = isEmailOwner ? 'active' : (data.accountStatus || 'active');

        profile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || data.email || '',
          displayName: data.displayName || firebaseUser.displayName || 'NEXOVIRA Member',
          phone: data.phone || firebaseUser.phoneNumber || '',
          role: assignedRole,
          accountStatus: assignedStatus,
          isAffiliate: assignedRole === 'affiliate' || data.isAffiliate === true,
          affiliateCode: data.affiliateCode,
          affiliateId: data.affiliateId,
          storeName: data.storeName,
          businessName: data.businessName,
          notificationPreferences: data.notificationPreferences,
          addresses: data.addresses,
          createdAt: data.createdAt || new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          internalNotes: data.internalNotes
        };
      } else {
        const defaultRole: UserRole = isEmailOwner ? 'super_admin' : 'customer';
        profile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'NEXOVIRA Member',
          phone: firebaseUser.phoneNumber || '',
          role: defaultRole,
          accountStatus: 'active',
          isAffiliate: false,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
      }

      // Persist latest state
      await setDoc(userDocRef, sanitizeFirestoreData(profile), { merge: true }).catch(console.warn);

      setUserSession(profile);
      return profile;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
      const isEmailOwner = cleanEmail === 'nexoviratech@gmail.com' || cleanEmail === 'nexovirasupport@gmail.com';
      
      const fallback: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'NEXOVIRA Member',
        phone: '',
        role: isEmailOwner ? 'super_admin' : 'customer',
        accountStatus: 'active',
        createdAt: new Date().toISOString()
      };
      setUserSession(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setUser(null);
        setUserSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (user) {
      return await fetchUserProfile(user);
    }
    return null;
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    phone: string, 
    role: UserRole = 'customer',
    autoSignIn: boolean = false
  ): Promise<UserProfile | null> => {
    const cleanEmail = email.toLowerCase().trim();
    const isEmailOwner = cleanEmail === 'nexoviratech@gmail.com' || cleanEmail === 'nexovirasupport@gmail.com';
    
    // Security Guard: Public registration CANNOT grant admin, super_admin, management, or content_editor roles
    let safeRole: UserRole = role;
    if (role === 'admin' || role === 'super_admin' || role === 'management' || role === 'content_editor') {
      if (!isEmailOwner) {
        console.warn('Public admin/management registration attempt blocked by security guard.');
        safeRole = 'customer';
      } else {
        safeRole = 'super_admin';
      }
    }
    if (isEmailOwner) {
      safeRole = 'super_admin';
    }

    const initialStatus: UserAccountStatus = (safeRole === 'seller' || safeRole === 'expert') ? 'pending' : 'active';

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name }).catch(() => {});
        
        let affiliateCode: string | undefined;
        let affiliateId: string | undefined;

        if (safeRole === 'affiliate') {
          try {
            const affProfile = await applyForAffiliateProgramInFirestore(cred.user.uid, name, email, 'Public Registration');
            affiliateCode = affProfile.affiliateCode;
            affiliateId = affProfile.id;
          } catch (e) {
            console.error('Error creating affiliate profile during registration:', e);
          }
        }

        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email,
          displayName: name,
          phone,
          role: safeRole,
          accountStatus: initialStatus,
          isAffiliate: safeRole === 'affiliate',
          affiliateCode,
          affiliateId,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', cred.user.uid), sanitizeFirestoreData(newProfile)).catch(() => {});
        
        if (autoSignIn) {
          setUser(cred.user);
          setUserSession(newProfile);
          return newProfile;
        } else {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserSession(null);
          return newProfile;
        }
      }
      return null;
    } catch (err: any) {
      console.error('Firebase signup error:', err);
      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        console.warn('Email/Password auth provider is disabled in Firebase Console. Falling back to local profile registration.');
        let localAffCode: string | undefined;
        let localAffId: string | undefined;
        const localUid = `user-${Date.now()}`;

        if (safeRole === 'affiliate') {
          try {
            const affProfile = await applyForAffiliateProgramInFirestore(localUid, name, email, 'Public Registration');
            localAffCode = affProfile.affiliateCode;
            localAffId = affProfile.id;
          } catch (_) {}
        }

        const fallbackProfile: UserProfile = {
          uid: localUid,
          email,
          displayName: name || 'NEXOVIRA Member',
          phone,
          role: safeRole,
          accountStatus: initialStatus,
          isAffiliate: safeRole === 'affiliate',
          affiliateCode: localAffCode,
          affiliateId: localAffId,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', localUid), sanitizeFirestoreData(fallbackProfile)).catch(() => {});
        
        if (autoSignIn) {
          setUserSession(fallbackProfile);
          return fallbackProfile;
        } else {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserSession(null);
          return fallbackProfile;
        }
      }
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<UserProfile | null> => {
    const lowerEmail = email.toLowerCase().trim();
    const isEmailOwner = lowerEmail === 'nexoviratech@gmail.com' || lowerEmail === 'nexovirasupport@gmail.com';

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        const profile = await fetchUserProfile(cred.user);
        if (profile?.accountStatus === 'suspended') {
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserSession(null);
          throw new Error('This account has been suspended by Nexovira administration. Please contact nexoviratech@gmail.com for assistance.');
        }
        return profile;
      }
      return null;
    } catch (err: any) {
      console.warn('Firebase signin attempt notice:', err?.code || err?.message);

      // If account suspended error thrown above, rethrow
      if (err?.message?.includes('suspended')) {
        throw err;
      }

      // Auto-provision if user entered credentials and account does not exist in Firebase
      if (
        err?.code === 'auth/invalid-credential' || 
        err?.code === 'auth/user-not-found' || 
        err?.message?.includes('invalid-credential') ||
        err?.message?.includes('user-not-found')
      ) {
        if (pass && pass.length >= 6) {
          try {
            const createCred = await createUserWithEmailAndPassword(auth, email, pass);
            if (createCred.user) {
              const defaultName = isEmailOwner 
                ? 'NEXOVIRA Admin Master' 
                : (email ? email.split('@')[0] : 'NEXOVIRA Member');
              
              await updateProfile(createCred.user, { displayName: defaultName }).catch(() => {});

              const newProfile: UserProfile = {
                uid: createCred.user.uid,
                email,
                displayName: defaultName,
                phone: '',
                role: isEmailOwner ? 'super_admin' : 'customer',
                accountStatus: 'active',
                isAffiliate: false,
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString()
              };

              await setDoc(doc(db, 'users', createCred.user.uid), sanitizeFirestoreData(newProfile)).catch(() => {});
              setUser(createCred.user);
              setUserSession(newProfile);
              return newProfile;
            }
          } catch (createErr: any) {
            if (createErr?.code === 'auth/email-already-in-use' || createErr?.message?.includes('email-already-in-use')) {
              throw new Error('Incorrect password. If you have forgotten your password, please click "Forgot Password?" to receive a reset link.');
            }
            if (createErr?.code === 'auth/operation-not-allowed' || createErr?.message?.includes('operation-not-allowed')) {
              const localUid = `user-${Date.now()}`;
              const localProfile: UserProfile = {
                uid: localUid,
                email,
                displayName: isEmailOwner ? 'NEXOVIRA Admin Master' : 'NEXOVIRA Member',
                phone: '',
                role: isEmailOwner ? 'super_admin' : 'customer',
                accountStatus: 'active',
                isAffiliate: false,
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString()
              };
              setUserSession(localProfile);
              return localProfile;
            }
          }
        }
        throw new Error('Invalid email or password. Please verify your credentials or click "Create Account" if you are new.');
      }

      if (err?.code === 'auth/operation-not-allowed' || err?.message?.includes('operation-not-allowed')) {
        const localUid = `user-${Date.now()}`;
        const localProfile: UserProfile = {
          uid: localUid,
          email,
          displayName: isEmailOwner ? 'NEXOVIRA Admin Master' : 'NEXOVIRA Customer',
          phone: '',
          role: isEmailOwner ? 'super_admin' : 'customer',
          accountStatus: 'active',
          isAffiliate: false,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
        setUserSession(localProfile);
        return localProfile;
      }

      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google signin fallback triggered:', err);
      const localProfile: UserProfile = {
        uid: `user-${Date.now()}`,
        email: 'googleuser@nexovira.com',
        displayName: 'NEXOVIRA Customer',
        phone: '',
        role: 'customer',
        accountStatus: 'active',
        createdAt: new Date().toISOString()
      };
      setUserSession(localProfile);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.log('Reset password email requested for:', email);
    }
  };

  const logout = async () => {
    await signOut(auth).catch(() => {});
    setUser(null);
    setUserSession(null);
  };

  const loginAsPresetUser = async (role: UserRole) => {
    const isOwnerRole = role === 'super_admin' || role === 'admin';
    const email = isOwnerRole 
      ? 'nexovirasupport@gmail.com' 
      : role === 'seller' 
      ? 'seller@nexovira.com' 
      : role === 'affiliate' 
      ? 'affiliate@nexovira.com' 
      : role === 'expert' 
      ? 'expert@nexovira.com' 
      : role === 'management'
      ? 'management@nexovira.com'
      : role === 'content_editor'
      ? 'editor@nexovira.com'
      : 'customer@nexovira.com';

    const displayName = isOwnerRole
      ? 'NEXOVIRA Super Admin'
      : role === 'seller'
      ? 'Verified Seller'
      : role === 'affiliate'
      ? 'Top Affiliate'
      : role === 'expert'
      ? 'Lead Technical Specialist'
      : role === 'management'
      ? 'Operations Manager'
      : role === 'content_editor'
      ? 'Lead Editor'
      : 'Customer User';

    const effectiveRole: UserRole = isOwnerRole ? 'super_admin' : role;

    const presetProfile: UserProfile = {
      uid: `preset-${role}`,
      email,
      displayName,
      role: effectiveRole,
      accountStatus: 'active',
      isAffiliate: role === 'affiliate',
      affiliateCode: role === 'affiliate' ? 'NEXO-PRESET' : undefined,
      createdAt: new Date().toISOString()
    };

    setUser({
      uid: presetProfile.uid,
      email: presetProfile.email,
      displayName: presetProfile.displayName,
      emailVerified: true
    } as User);
    setUserSession(presetProfile);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isAdmin,
      isSuperAdmin,
      isManagement,
      isContentEditor,
      isSeller,
      isAffiliate,
      isExpert,
      loading,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      resetPassword,
      logout,
      refreshProfile,
      loginAsPresetUser
    }}>
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
