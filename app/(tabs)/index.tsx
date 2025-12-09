import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssistantScreen from './assistant';
import { auth, db } from './firebase.js';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

type UserRole = 'elderly' | 'caregiver';
type UserProfile = {
  name: string;
  email: string;
  role: UserRole;
  gender?: string;
  dateOfBirth?: string;
  linkedCaregiverId: string | null;
  linkedElderlyId: string | null;
  createdAt: string;
};

// Colors & Constants
const COLORS = {
  primaryBlue: '#007AFF',
  darkBlue: '#004AAD',
  lightBlue: '#E6F2FF',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8E8E93',
  lightGray: '#F2F2F7',
  divider: '#E5E5EA',
  red: '#FF3B30',
  green: '#34C759',
  pending: '#FF9500',
  sosRed: '#D93636',
  alertBg: 'rgba(255, 59, 48, 0.1)',
  inputBg: '#F2F2F2',
};
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Reusable Components
const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const TaskItem = ({
  icon,
  title,
  time,
  status,
  statusColor,
  onStatusPress,
  onEdit,
  onDelete,
}: {
  icon: any;
  title: string;
  time: string;
  status?: string;
  statusColor?: string;
  onStatusPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => (
  <View style={styles.taskItem}>
    <View style={styles.taskIconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.primaryBlue} />
    </View>
    <View style={styles.taskTextContainer}>
      <Text style={styles.taskTitle}>{title}</Text>
      <Text style={styles.taskTime}>{time}</Text>
    </View>
    {status && (
      onStatusPress ? (
        <TouchableOpacity onPress={onStatusPress}>
          <Text style={[styles.taskStatus, { color: statusColor }]}>{status}</Text>
        </TouchableOpacity>
      ) : (
        <View pointerEvents="none">
          <Text style={[styles.taskStatus, { color: statusColor }]}>{status}</Text>
        </View>
      )
    )}
    <View style={styles.taskActions}>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
          <Ionicons name="create-outline" size={22} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      )}
      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
          <Ionicons name="trash-outline" size={22} color={COLORS.red} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// Login / Sign Up Screen
const AuthScreen = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [role, setRole] = useState<UserRole>('elderly');
  const [loading, setLoading] = useState(false);

const handleAuth = async () => {
  if (!email || !password || (!isLogin && !name)) {
    Alert.alert('Error', 'Please fill all fields');
    return;
  }
  
  if (!isLogin && !dateOfBirth) {
    Alert.alert('Error', 'Please select your date of birth');
    return;
  }
  
  setLoading(true);
  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      // SIGN UP
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role,
        gender,
        dateOfBirth,
        uidPrefix12: user.uid.slice(0, 12).toUpperCase(),   
        linkedCaregiverId: null,
        linkedElderlyId: null,
        createdAt: new Date().toISOString(),
      });
    }
    onSuccess();
  } catch (e: any) {
    // Check for specific Firebase auth errors
    if (e.code === 'auth/invalid-credential' || 
        e.code === 'auth/wrong-password' || 
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/invalid-email') {
      Alert.alert('Error', 'Wrong email or password');
    } else if (e.code === 'auth/too-many-requests') {
      Alert.alert('Error', 'Too many failed attempts. Please try again later.');
    } else if (e.code === 'auth/email-already-in-use') {
      Alert.alert('Error', 'This email is already registered');
    } else if (e.code === 'auth/weak-password') {
      Alert.alert('Error', 'Password should be at least 6 characters');
    } else {
      Alert.alert('Error', e.message);
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <Text style={styles.authTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

          {!isLogin && (
            <TextInput style={styles.input} placeholder="Your Name" value={name} onChangeText={setName} />
          )}
          
          {!isLogin && (
            <View style={styles.genderContainer}>
              <Text style={styles.fieldLabel}>Gender:</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
                <TouchableOpacity 
                  style={[styles.genderBtn, gender === 'Male' && styles.genderActive]} 
                  onPress={() => setGender('Male')}
                >
                  <Ionicons name="male" size={20} color={gender === 'Male' ? COLORS.white : COLORS.gray} />
                  <Text style={gender === 'Male' ? styles.genderTextActive : styles.genderText}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.genderBtn, gender === 'Female' && styles.genderActive]} 
                  onPress={() => setGender('Female')}
                >
                  <Ionicons name="female" size={20} color={gender === 'Female' ? COLORS.white : COLORS.gray} />
                  <Text style={gender === 'Female' ? styles.genderTextActive : styles.genderText}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {!isLogin && (
            <View style={styles.dobContainer}>
              <Text style={styles.fieldLabel}>Date of Birth:</Text>
              <TouchableOpacity 
                style={styles.dobButton} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dobText}>
                  {dateOfBirth || 'Select Date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate && event.type !== 'dismissed') {
                      setDateOfBirth(selectedDate.toLocaleDateString('en-US'));
                    }
                  }}
                />
              )}
            </View>
          )}
          
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            keyboardType="email-address" 
            autoCapitalize="none" 
            value={email} 
            onChangeText={setEmail} />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
            value={password} 
            onChangeText={setPassword} 
          />

          {!isLogin && (
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>I am signing up as:</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                <TouchableOpacity style={[styles.roleBtn, role === 'elderly' && styles.roleActive]} onPress={() => setRole('elderly')}>
                  <Text style={role === 'elderly' ? styles.roleTextActive : styles.roleText}>Elderly</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.roleBtn, role === 'caregiver' && styles.roleActive]} onPress={() => setRole('caregiver')}>
                  <Text style={role === 'caregiver' ? styles.roleTextActive : styles.roleText}>Caregiver</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.authButtonText]}>{isLogin ? 'Log In' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, textAlign: 'center', color: COLORS.black }}>
              {isLogin ? (
                <>
                  Don't have an account? <Text style={{ color: COLORS.primaryBlue, fontWeight: '600' }}>Sign Up</Text>
                </>
              ) : (
                <>
                  Already have an account? <Text style={{ color: COLORS.primaryBlue, fontWeight: '600' }}>Log In</Text>
                </>
              )}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

//  screens 
const ElderlyDashboard = ({ userName, onAlertPress }: { userName: string, onAlertPress: () => void }) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadReminders = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const remindersRef = collection(db, 'users', currentUser.uid, 'reminders');
      const q = query(remindersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const loadedReminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReminders(loadedReminders);
      setLoading(false);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const getTodaysReminders = () => {
    const today = new Date();
    const dateString = today.toDateString();
    
    return reminders.filter(reminder => {
      if (reminder.repeatOption === 'Daily') {
        return true;
      } else if (reminder.repeatOption === 'Weekly') {
        const dayName = WEEK_DAYS[today.getDay()];
        return reminder.selectedDays?.includes(dayName);
      } else if (reminder.repeatOption === 'Once') {
        const reminderDate = new Date(reminder.date);
        return reminderDate.toDateString() === today.toDateString();
      }
      return false;
    }).map(reminder => {
      if (reminder.repeatOption === 'Daily' || reminder.repeatOption === 'Weekly') {
        const completedDates = reminder.completedDates || [];
        const status = completedDates.includes(dateString) ? 'Completed' : 'Pending';
        return { ...reminder, status, currentDateString: dateString };
      }
      return { ...reminder, currentDateString: dateString };
    }).sort((a, b) => {
      // Sort by time in ascending order
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const getNextTask = () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todaysReminders = getTodaysReminders();
    const pendingReminders = todaysReminders.filter(r => r.status !== 'Completed');
    
    // Find the next reminder that hasn't happened yet
    const nextReminder = pendingReminders.find(r => {
      const reminderTime = r.time || '00:00';
      return reminderTime >= currentTime;
    });
    
    // If all reminders have passed, return the first pending one
    return nextReminder || pendingReminders[0] || null;
  };

  const handleToggleStatus = async (reminder: any) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const dateString = reminder.currentDateString || new Date().toDateString();
      
      if (reminder.repeatOption === 'Daily' || reminder.repeatOption === 'Weekly') {
        const completedDates = reminder.completedDates || [];
        const isCompleted = completedDates.includes(dateString);
        
        let updatedCompletedDates;
        if (isCompleted) {
          updatedCompletedDates = completedDates.filter((d: string) => d !== dateString);
        } else {
          updatedCompletedDates = [...completedDates, dateString];
        }

        const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminder.id);
        await updateDoc(reminderRef, { completedDates: updatedCompletedDates });

        // Update in linked user's collection
        const userProfileRef = doc(db, 'users', currentUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data();
          const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
          
          if (linkedUserId) {
            const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
            const linkedSnapshot = await getDocs(linkedRemindersRef);
            
            linkedSnapshot.docs.forEach(async (docSnap) => {
              const data = docSnap.data();
              if (data.createdBy === reminder.createdBy && data.title === reminder.title && data.date === reminder.date) {
                await updateDoc(doc(db, 'users', linkedUserId, 'reminders', docSnap.id), { completedDates: updatedCompletedDates });
              }
            });
          }
        }
      } else {
        const newStatus = reminder.status === 'Pending' ? 'Completed' : 'Pending';
        
        const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminder.id);
        await updateDoc(reminderRef, { status: newStatus });

        const userProfileRef = doc(db, 'users', currentUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data();
          const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
          
          if (linkedUserId) {
            const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
            const linkedSnapshot = await getDocs(linkedRemindersRef);
            
            linkedSnapshot.docs.forEach(async (docSnap) => {
              const data = docSnap.data();
              if (data.createdBy === reminder.createdBy && data.title === reminder.title && data.date === reminder.date) {
                await updateDoc(doc(db, 'users', linkedUserId, 'reminders', docSnap.id), { status: newStatus });
              }
            });
          }
        }
      }

      await loadReminders();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', `Failed to update reminder: ${error.message}`);
    }
  };

  const todaysReminders = getTodaysReminders();
  const completedCount = todaysReminders.filter(r => r.status === 'Completed').length;
  const totalCount = todaysReminders.length;
  const nextTask = getNextTask();

  const handleEmergencyAlert = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get user profile to find linked caregiver
      const userProfileRef = doc(db, 'users', currentUser.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data();
        const linkedCaregiverId = userProfile.linkedCaregiverId;
        
        if (linkedCaregiverId) {
          // Create alert in caregiver's alerts collection
          const alertsRef = collection(db, 'users', linkedCaregiverId, 'alerts');
          await addDoc(alertsRef, {
            message: `${userName} needs help!`,
            timestamp: new Date().toISOString(),
            elderlyId: currentUser.uid,
            elderlyName: userName,
            read: false,
            createdAt: new Date(),
          });

          Alert.alert('Emergency Alert Sent', 'Your caregiver has been notified!');
        } else {
          Alert.alert('No Caregiver Linked', 'Please link a caregiver first.');
        }
      }
    } catch (error: any) {
      console.error('Error sending emergency alert:', error);
      Alert.alert('Error', `Failed to send alert: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hello, {userName}</Text>
        <TouchableOpacity onPress={onAlertPress}>
          <Ionicons name="notifications-outline" size={28} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      </View>

      {/* Emergency Alert Button */}
      <TouchableOpacity
        style={styles.emergencyAlertButton}
        onPress={handleEmergencyAlert}
        activeOpacity={0.8}
      >
        <View style={styles.emergencyAlertIconContainer}>
          <Ionicons name="warning" size={40} color={COLORS.white} />
        </View>
        <View style={styles.emergencyAlertTextContainer}>
          <Text style={styles.emergencyAlertTitle}>Emergency Alert</Text>
          <Text style={styles.emergencyAlertSubtitle}>Tap to send alert to your caregiver</Text>
        </View>
      </TouchableOpacity>

      <Card style={{ marginTop: 20 }}>
        <Text style={styles.cardTitle}>Today's Reminders</Text>
        <Text style={styles.cardSubtitle}>Last updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
        <View style={styles.statusContainer}>
          <View style={styles.statusBox}>
            <Text style={styles.statusValue}>{completedCount}/{totalCount}</Text>
            <Text style={styles.statusLabel}>Completed</Text>
          </View>
          <View style={styles.allWellBadge}>
            <Text style={styles.allWellText}>{completedCount === totalCount && totalCount > 0 ? 'All Done' : 'In Progress'}</Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: 20 }} key={refreshKey}>
        <Text style={styles.cardTitle}>Next Task</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primaryBlue} style={{ padding: 20 }} />
        ) : !nextTask ? (
          <Text style={{ color: COLORS.gray, textAlign: 'center', padding: 20 }}>No pending reminders</Text>
        ) : (
          <TaskItem 
            icon={nextTask.title.toLowerCase().includes('medic') ? 'pill' : 'calendar-outline'} 
            title={nextTask.title} 
            time={nextTask.time || '10:00 AM'} 
            status={nextTask.status || 'Pending'} 
            statusColor={nextTask.status === 'Completed' ? COLORS.green : COLORS.pending}
            onStatusPress={() => handleToggleStatus(nextTask)}
          />
        )}
      </Card>
    </ScrollView>
  );
};


const CaregiverDashboard = ({ userProfile, elderlyProfile, onAlertPress }: { 
  userProfile: UserProfile, 
  elderlyProfile: UserProfile | null,
  onAlertPress: () => void 
}) => {
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const isLinked = !!userProfile.linkedElderlyId;
  const elderlyName = elderlyProfile ? elderlyProfile.name : "No Elderly Linked";

  const loadReminders = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !userProfile.linkedElderlyId) {
        setLoading(false);
        return;
      }

      const remindersRef = collection(db, 'users', userProfile.linkedElderlyId, 'reminders');
      const q = query(remindersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const loadedReminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setReminders(loadedReminders);
      setLoading(false);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [userProfile.linkedElderlyId])
  );

  const getTodaysReminders = () => {
    const today = new Date();
    const dateString = today.toDateString();
    
    return reminders.filter(reminder => {
      if (reminder.repeatOption === 'Daily') {
        return true;
      } else if (reminder.repeatOption === 'Weekly') {
        const dayName = WEEK_DAYS[today.getDay()];
        return reminder.selectedDays?.includes(dayName);
      } else if (reminder.repeatOption === 'Once') {
        const reminderDate = new Date(reminder.date);
        return reminderDate.toDateString() === today.toDateString();
      }
      return false;
    }).map(reminder => {
      if (reminder.repeatOption === 'Daily' || reminder.repeatOption === 'Weekly') {
        const completedDates = reminder.completedDates || [];
        const status = completedDates.includes(dateString) ? 'Completed' : 'Pending';
        return { ...reminder, status, currentDateString: dateString };
      }
      return { ...reminder, currentDateString: dateString };
    }).sort((a, b) => {
      // Sort by time in ascending order
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  };

  const getCompletedTasks = () => {
    const todaysReminders = getTodaysReminders();
    return todaysReminders.filter(r => r.status === 'Completed');
  };

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setAlertsLoading(false);
        return;
      }

      const alertsRef = collection(db, 'users', currentUser.uid, 'alerts');
      const q = query(alertsRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);

      const loadedAlerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAlerts(loadedAlerts);
      setAlertsLoading(false);
    } catch (error) {
      console.error('Error loading alerts:', error);
      setAlertsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [])
  );

  const markAlertAsRead = async (alertId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const alertRef = doc(db, 'users', currentUser.uid, 'alerts', alertId);
      await updateDoc(alertRef, { read: true });
      loadAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const todaysReminders = getTodaysReminders();
  const completedCount = todaysReminders.filter(r => r.status === 'Completed').length;
  const totalCount = todaysReminders.length;
  const completedTasks = getCompletedTasks();
  const unreadAlerts = alerts.filter(a => !a.read);

  // If linked but profile hasn't loaded (i.e., we are in the "Connecting..." state)
  if (isLinked && !elderlyProfile) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Loading Elderly Dashboard...</Text>
        </View>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} style={{ marginTop: 50 }} />
      </View>
    );
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{elderlyName}'s Dashboard</Text>
        <TouchableOpacity onPress={onAlertPress}>
          <Ionicons name="notifications-outline" size={26} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      </View>

      {elderlyName === "No Elderly Linked" || elderlyName.includes("Link") && (
        <TouchableOpacity
          style={{
            backgroundColor: COLORS.lightBlue,
            margin: 20,
            padding: 20,
            borderRadius: 15,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 5,
          }}
          onPress={() => router.push('/link-elderly')}
        >
          <Ionicons name="link-outline" size={40} color={COLORS.primaryBlue} />
          <Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 18, marginTop: 10 }}>
            Link to an Elderly User
          </Text>
          <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 5 }}>
            Tap here to connect with someone you care for
          </Text>
        </TouchableOpacity>
      )}

      <Card>
      <Text style={styles.cardTitle}>Today's Status</Text>
      <Text style={styles.cardSubtitle}>Last updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
      <View style={styles.statusContainer}>
        <View style={styles.statusBox}>
          <Text style={styles.statusValue}>{completedCount}/{totalCount}</Text>
          <Text style={styles.statusLabel}>Reminders</Text>
        </View>
        <View style={styles.allWellBadge}>
          <Text style={styles.allWellText}>{completedCount === totalCount && totalCount > 0 ? 'All Done' : 'In Progress'}</Text>
        </View>
      </View>
    </Card>
    <Card key={refreshKey}>
      <Text style={styles.cardTitle}>Completed Tasks</Text>
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primaryBlue} style={{ padding: 20 }} />
      ) : completedTasks.length === 0 ? (
        <Text style={{ color: COLORS.gray, textAlign: 'center', padding: 20 }}>No completed tasks yet</Text>
      ) : (
        completedTasks.map((reminder, index) => (
          <View key={reminder.id}>
            <TaskItem 
              icon={reminder.title.toLowerCase().includes('medic') ? 'pill' : 'calendar-outline'} 
              title={reminder.title} 
              time={reminder.time || '10:00 AM'} 
              status={reminder.status || 'Pending'} 
              statusColor={reminder.status === 'Completed' ? COLORS.green : COLORS.pending}
            />
            {index < completedTasks.length - 1 && <View style={styles.divider} />}
          </View>
        ))
      )}
    </Card>

    <Card style={{ marginTop: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={styles.cardTitle}>Emergency Alerts</Text>
        {unreadAlerts.length > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{unreadAlerts.length} New</Text>
          </View>
        )}
      </View>
      {alertsLoading ? (
        <ActivityIndicator size="small" color={COLORS.primaryBlue} style={{ padding: 20 }} />
      ) : alerts.length === 0 ? (
        <Text style={{ color: COLORS.gray, textAlign: 'center', padding: 20 }}>No alerts</Text>
      ) : (
        alerts.map((alert, index) => (
          <View key={alert.id}>
            <TouchableOpacity
              style={styles.alertItem}
              onPress={() => !alert.read && markAlertAsRead(alert.id)}
            >
              <View style={styles.alertIconContainer}>
                <Ionicons name="warning" size={24} color={COLORS.sosRed} />
              </View>
              <View style={styles.alertItemTextContainer}>
                <Text style={styles.alertItemTitle}>{alert.message}</Text>
                <Text style={styles.alertItemTime}>
                  {new Date(alert.timestamp).toLocaleDateString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </Text>
              </View>
              {!alert.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
            {index < alerts.length - 1 && <View style={styles.divider} />}
          </View>
        ))
      )}
    </Card>
  </ScrollView>
);
};
const RemindersScreen = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarExpanded, setCalendarExpanded] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load reminders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Load current user's reminders
      const remindersRef = collection(db, 'users', currentUser.uid, 'reminders');
      const q = query(remindersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      let loadedReminders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Check if user has a linked partner
      const userProfileRef = doc(db, 'users', currentUser.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data();
        const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
        
        if (linkedUserId) {
          // Load linked partner's reminders
          const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
          const linkedQ = query(linkedRemindersRef, orderBy('createdAt', 'desc'));
          const linkedSnapshot = await getDocs(linkedQ);
          
          const linkedReminders = linkedSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          
          // Combine reminders and remove duplicates based on createdBy and title
          const reminderMap = new Map();
          [...loadedReminders, ...linkedReminders].forEach((reminder: any) => {
            const key = `${reminder.createdBy}_${reminder.title}_${reminder.date}`;
            if (!reminderMap.has(key)) {
              reminderMap.set(key, reminder);
            }
          });
          
          loadedReminders = Array.from(reminderMap.values())
            .sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || 0;
              const bTime = b.createdAt?.toMillis?.() || 0;
              return bTime - aTime;
            });
        }
      }

      setReminders(loadedReminders);
      setLoading(false);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setLoading(false);
    }
  };

  const getRemindersForDate = (date: Date) => {
    const dateString = date.toDateString();
    
    return reminders.filter(reminder => {
      if (reminder.repeatOption === 'Daily') {
        return true;
      } else if (reminder.repeatOption === 'Weekly') {
        const dayName = WEEK_DAYS[date.getDay()];
        return reminder.selectedDays?.includes(dayName);
      } else if (reminder.repeatOption === 'Once') {
        const reminderDate = new Date(reminder.date);
        return reminderDate.toDateString() === date.toDateString();
      }
      return false;
    }).map(reminder => {
      // For Daily and Weekly reminders, check if this specific date is completed
      if (reminder.repeatOption === 'Daily' || reminder.repeatOption === 'Weekly') {
        const completedDates = reminder.completedDates || [];
        const status = completedDates.includes(dateString) ? 'Completed' : 'Pending';
        return { ...reminder, status, currentDateString: dateString };
      }
      // For Once reminders, use the global status
      return { ...reminder, currentDateString: dateString };
    });
  };

  const handleToggleStatus = async (reminder: any) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const dateString = reminder.currentDateString || selectedDate.toDateString();
      
      // For Daily and Weekly reminders, use date-specific completion tracking
      if (reminder.repeatOption === 'Daily' || reminder.repeatOption === 'Weekly') {
        const completedDates = reminder.completedDates || [];
        const isCompleted = completedDates.includes(dateString);
        
        let updatedCompletedDates;
        if (isCompleted) {
          // Remove date from completed list
          updatedCompletedDates = completedDates.filter((d: string) => d !== dateString);
        } else {
          // Add date to completed list
          updatedCompletedDates = [...completedDates, dateString];
        }

        const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminder.id);
        await updateDoc(reminderRef, { completedDates: updatedCompletedDates });

        // Update in linked user's collection too
        const userProfileRef = doc(db, 'users', currentUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data();
          const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
          
          if (linkedUserId) {
            const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
            const linkedSnapshot = await getDocs(linkedRemindersRef);
            
            linkedSnapshot.docs.forEach(async (docSnap) => {
              const data = docSnap.data();
              if (data.createdBy === reminder.createdBy && data.title === reminder.title && data.date === reminder.date) {
                await updateDoc(doc(db, 'users', linkedUserId, 'reminders', docSnap.id), { completedDates: updatedCompletedDates });
              }
            });
          }
        }
      } else {
        // For Once reminders, toggle global status
        const newStatus = reminder.status === 'Pending' ? 'Completed' : 'Pending';
        
        const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminder.id);
        await updateDoc(reminderRef, { status: newStatus });

        const userProfileRef = doc(db, 'users', currentUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data();
          const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
          
          if (linkedUserId) {
            const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
            const linkedSnapshot = await getDocs(linkedRemindersRef);
            
            linkedSnapshot.docs.forEach(async (docSnap) => {
              const data = docSnap.data();
              if (data.createdBy === reminder.createdBy && data.title === reminder.title && data.date === reminder.date) {
                await updateDoc(doc(db, 'users', linkedUserId, 'reminders', docSnap.id), { status: newStatus });
              }
            });
          }
        }
      }

      loadReminders();
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', `Failed to update reminder: ${error.message}`);
    }
  };

  const handleEditReminder = (reminder: any) => {
    router.push({
      pathname: '/edit-reminder',
      params: {
        id: reminder.id,
        title: reminder.title,
        time: reminder.time,
        repeatOption: reminder.repeatOption
      }
    });
  };

  const handleDeleteReminder = async (reminder: any) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser) return;

              const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminder.id);
              await deleteDoc(reminderRef);

              // Delete from linked user's collection too
              const userProfileRef = doc(db, 'users', currentUser.uid);
              const userProfileSnap = await getDoc(userProfileRef);
              
              if (userProfileSnap.exists()) {
                const userProfile = userProfileSnap.data();
                const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
                
                if (linkedUserId) {
                  const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
                  const linkedSnapshot = await getDocs(linkedRemindersRef);
                  
                  linkedSnapshot.docs.forEach(async (docSnap) => {
                    const data = docSnap.data();
                    if (data.createdBy === reminder.createdBy && data.title === reminder.title && data.date === reminder.date) {
                      await deleteDoc(doc(db, 'users', linkedUserId, 'reminders', docSnap.id));
                    }
                  });
                }
              }

              Alert.alert('Success', 'Reminder deleted!');
              loadReminders();
            } catch (error: any) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', `Failed to delete reminder: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1);
    setCurrentDate(newDate);
  };

  const toggleCalendar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCalendarExpanded(!isCalendarExpanded);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthGrid = [];
    let week = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      week.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      week.push(
        <TouchableOpacity key={day} style={styles.calendarDay} onPress={() => setSelectedDate(date)}>
          <View style={[styles.dayTextContainer, isSelected && styles.selectedDay]}>
            <Text style={isSelected ? styles.selectedDayText : styles.calendarDayText}>{day}</Text>
          </View>
        </TouchableOpacity>
      );

      if (week.length === 7) {
        monthGrid.push(<View key={`week-${day}`} style={styles.calendarGrid}>{week}</View>);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) week.push(<View key={`empty-end-${week.length}`} style={styles.calendarDay} />);
      monthGrid.push(<View key="last-week" style={styles.calendarGrid}>{week}</View>);
    }

    if (!isCalendarExpanded) {
      const today = new Date();
      const dateToFind = (today.getFullYear() === year && today.getMonth() === month) ? today : selectedDate;
      const weekIndex = Math.floor((firstDayOfMonth + dateToFind.getDate() - 1) / 7);
      return monthGrid[weekIndex] || monthGrid[0];
    }
    return monthGrid;
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
  <Text style={styles.headerTitle}>Reminders</Text>
  <TouchableOpacity
    onPress={() => router.push('/add-reminder')}
  >
    <Ionicons name="add-circle-outline" size={28} color={COLORS.black} />
  </TouchableOpacity>
     </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primaryBlue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleCalendar}>
            <Text style={styles.calendarMonthYear}>
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.primaryBlue} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarWeekdays}>
          {WEEK_DAYS.map(day => (
            <Text key={day} style={styles.calendarWeekday}>{day}</Text>
          ))}
        </View>
        <View style={{ overflow: 'hidden' }}>{renderCalendar()}</View>
      </View>

      <Text style={styles.tasksHeader}>
        Tasks for {selectedDate.toLocaleString('default', { month: 'short', day: 'numeric' })}
      </Text>
      <ScrollView>
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primaryBlue} />
          </View>
        ) : getRemindersForDate(selectedDate).length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: COLORS.gray, fontSize: 16 }}>No reminders for this day</Text>
          </View>
        ) : (
          getRemindersForDate(selectedDate).map((reminder, index) => (
            <View key={reminder.id}>
              <TaskItem 
                icon={reminder.title.toLowerCase().includes('medic') ? 'pill' : 'calendar-outline'} 
                title={reminder.title} 
                time={reminder.time || '10:00 AM'} 
                status={reminder.status || 'Pending'} 
                statusColor={reminder.status === 'Completed' ? COLORS.green : COLORS.pending}
                onStatusPress={() => handleToggleStatus(reminder)}
                onEdit={() => handleEditReminder(reminder)}
                onDelete={() => handleDeleteReminder(reminder)}
              />
              {index < getRemindersForDate(selectedDate).length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const ProfileScreen = ({ userProfile }: { userProfile: UserProfile }) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [gender, setGender] = useState(userProfile.gender || 'Male');
  const [dateOfBirth, setDateOfBirth] = useState(userProfile.dateOfBirth || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      await setDoc(doc(db, 'users', currentUser.uid), {
        ...userProfile,
        name,
        gender,
        dateOfBirth,
      }, { merge: true });

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', `Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(auth),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="create-outline" size={26} color={COLORS.black} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Ionicons name="close" size={28} color={COLORS.red} />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: COLORS.primaryBlue,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 15,
        }}>
          <Text style={{ fontSize: 40, fontWeight: 'bold', color: COLORS.white }}>
            {userProfile.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {!isEditing && (
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.black }}>
            {userProfile.name}
          </Text>
        )}
        <Text style={{ fontSize: 16, color: COLORS.gray, marginTop: 5 }}>
          {userProfile.role === 'elderly' ? 'Elderly User' : 'Caregiver'}
        </Text>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 30 }}>
        <View style={styles.profileField}>
          <Text style={styles.profileLabel}>Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.profileInput}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
            />
          ) : (
            <Text style={styles.profileValue}>{userProfile.name}</Text>
          )}
        </View>

        <View style={styles.profileField}>
          <Text style={styles.profileLabel}>Email</Text>
          <Text style={styles.profileValue}>{userProfile.email}</Text>
        </View>

        <View style={styles.profileField}>
          <Text style={styles.profileLabel}>Gender</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.genderBtn, { flex: 1 }, gender === 'Male' && styles.genderActive]}
                onPress={() => setGender('Male')}
              >
                <Ionicons name="male" size={20} color={gender === 'Male' ? COLORS.white : COLORS.gray} />
                <Text style={gender === 'Male' ? styles.genderTextActive : styles.genderText}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, { flex: 1 }, gender === 'Female' && styles.genderActive]}
                onPress={() => setGender('Female')}
              >
                <Ionicons name="female" size={20} color={gender === 'Female' ? COLORS.white : COLORS.gray} />
                <Text style={gender === 'Female' ? styles.genderTextActive : styles.genderText}>Female</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.profileValue}>{userProfile.gender || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.profileField}>
          <Text style={styles.profileLabel}>Date of Birth</Text>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.dobButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dobText}>{dateOfBirth || 'Select Date'}</Text>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate && event.type !== 'dismissed') {
                      setDateOfBirth(selectedDate.toLocaleDateString('en-US'));
                    }
                  }}
                />
              )}
            </>
          ) : (
            <Text style={styles.profileValue}>{userProfile.dateOfBirth || 'Not set'}</Text>
          )}
        </View>
      </View>

      {/* Invite Caregiver for Elderly Users */}
      {userProfile.role === 'elderly' && auth.currentUser && (
        <Card style={{ marginHorizontal: 20, marginTop: 20, padding: 20 }}>
          <Text style={styles.cardTitle}>Invite Your Caregiver</Text>
          <Text style={{ color: COLORS.gray, marginVertical: 10, fontSize: 15 }}>
            Share this code with your caregiver:
          </Text>
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#f0f0f0',
            padding: 18,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text style={{
              fontSize: 26,
              fontWeight: 'bold',
              letterSpacing: 5,
              color: COLORS.primaryBlue
            }}>
              {auth.currentUser.uid.slice(0, 12).toUpperCase()}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                const shareCode = auth.currentUser?.uid.slice(0, 12).toUpperCase();
                await Share.share({
                  message: `Hi! Please take care of me on Elderly Care app.\nMy code: ${shareCode}`,
                  url: `https://elderlycare.app/link/${auth.currentUser?.uid}`,
                  title: "Connect with Me",
                });
              }}
              style={{
                backgroundColor: COLORS.primaryBlue,
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Ionicons name="share-social" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Link Elderly for Caregiver Users */}
      {userProfile.role === 'caregiver' && (
        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          {userProfile.linkedElderlyId ? (
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.lightBlue,
                padding: 15,
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={() => router.push('/link-elderly')}
            >
              <Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 15 }}>
                Change Linked Elderly
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: COLORS.lightBlue,
                padding: 20,
                borderRadius: 15,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 5,
              }}
              onPress={() => router.push('/link-elderly')}
            >
              <Ionicons name="link-outline" size={40} color={COLORS.primaryBlue} />
              <Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 18, marginTop: 10 }}>
                Link to an Elderly User
              </Text>
              <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 5 }}>
                Tap here to connect with someone you care for
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isEditing && (
        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.primaryBlue,
              padding: 15,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 15 }}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ marginHorizontal: 20, marginTop: 20 }}>
        <TouchableOpacity
          style={{
            backgroundColor: COLORS.red,
            padding: 15,
            borderRadius: 12,
            alignItems: 'center',
          }}
          onPress={handleSignOut}
        >
          <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 15 }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const Tab = createBottomTabNavigator();

const AppTabs = ({ userProfile }: { userProfile: UserProfile }) => {
  const [elderlyProfile, setElderlyProfile] = useState<UserProfile | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  useEffect(() => {
    if (userProfile.role === 'caregiver' && userProfile.linkedElderlyId) {
      const elderlyRef = doc(db, 'users', userProfile.linkedElderlyId);
      
      // onSnapshot: Linked Elderly 
      const unsubscribe = onSnapshot(elderlyRef, (docSnap) => {
        if (docSnap.exists()) {
          setElderlyProfile(docSnap.data() as UserProfile);
        } else {
          setElderlyProfile(null); 
        }
      }, (error) => {
        console.error("Error fetching elderly profile:", error);
        setElderlyProfile(null);
      });
      
      return () => unsubscribe(); 
    } else {
      setElderlyProfile(null); 
    }
  }, [userProfile.role, userProfile.linkedElderlyId]); 

  const displayName = userProfile.role === 'elderly'
    ? userProfile.name
    : (elderlyProfile?.name || "No Elderly Linked");

  return (
    <>
      <Modal
        visible={showAlertModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowAlertModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                Notifications
              </Text>
              <TouchableOpacity onPress={() => setShowAlertModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 16, color: COLORS.gray, textAlign: 'center' }}>
                No notifications yet
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primaryBlue,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
      <Tab.Screen 
        name="Dashboard"
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      >
        {() => 
          userProfile.role === 'elderly' 
            ? <ElderlyDashboard userName={userProfile.name} onAlertPress={() => setShowAlertModal(true)} />
            : <CaregiverDashboard 
                userProfile={userProfile}       
                elderlyProfile={elderlyProfile}
                onAlertPress={() => setShowAlertModal(true)}
              />
        }
      </Tab.Screen>

      <Tab.Screen name="Reminders"
  component={RemindersScreen}
  options={{
    tabBarLabel: 'Reminders',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
    headerRight: () => (
  <TouchableOpacity
    style={{ marginRight: 15 }}
    onPress={() => alert('Add reminder')} 
  >
    <Ionicons name="add-circle-outline" size={30} color={COLORS.primaryBlue} />
  </TouchableOpacity>
)
  }}
/>
      <Tab.Screen 
        name="Assistant" 
        component={AssistantScreen}
        options={{
          tabBarLabel: 'Assistant',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <ProfileScreen userProfile={userProfile} />}
      </Tab.Screen>
    </Tab.Navigator>
    </>
  );
};

// Main App
export default function TabsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const navigation = useNavigation();

  // Function to fetch the user profile (used in useEffect and onFocus)
  const fetchUserProfile = useCallback((currentUser: User) => {
    const profileRef = doc(db, 'users', currentUser.uid);
    
    // onSnapshot: Real-time listener
    const unsubscribe = onSnapshot(profileRef, (profileSnap) => {
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        setUserProfile(data);
        setLoading(false); // Set loading to false once profile is loaded
      } else {
        console.log("No profile found for user, attempting sign out.");
        setUserProfile(null);
        signOut(auth);
        setLoading(false);
      }
    }, (error) => {
      console.error("Profile real-time loading problem:", error);
      Alert.alert("Error", "Failed to load profile in real-time.");
      setLoading(false);
    });
    
    return unsubscribe; // Returns the unsubscribe function
  }, []);

 useEffect(() => {
    console.log("Auth state listener is open"); 
    let profileUnsubscribe: (() => void) | undefined; // to store the profile listener

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth changed:", currentUser?.email || "No user");

      // Clean up previous profile listener if any
      if (profileUnsubscribe) profileUnsubscribe();

      if (currentUser) {
        setUser(currentUser);
        // Start listening for profile changes in real-time
        profileUnsubscribe = fetchUserProfile(currentUser); 
        
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
        authUnsubscribe(); // Unsubscribe from auth
        if (profileUnsubscribe) profileUnsubscribe(); // Unsubscribe from profile
    };
  }, [fetchUserProfile]); // Add dependency

  
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={{ marginTop: 20, fontSize: 18 }}>Loading your app...</Text>
      </SafeAreaView>
    );
  }

  if (!user || !userProfile) {
    return <AuthScreen onSuccess={() => {}} />; 
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <AppTabs userProfile={userProfile} />
    </SafeAreaView>
  
  );
}

//  styles
const styles = StyleSheet.create({
 authContainer: { 
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center', 
    padding: 30 
  },

  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 30,
  },

  authFormWrapper: {
    width: '100%',
    maxWidth: 380,        
    alignItems: 'center', 
  },

  input: { 
    width: 320,           
    backgroundColor: '#f5f5f5', 
    padding: 16,
    borderRadius: 12, 
    marginBottom: 15, 
    fontSize: 16,
    alignSelf: 'center',  
  },

  
  authButton: { 
    backgroundColor: COLORS.primaryBlue, 
    padding: 16,
    borderRadius: 12, 
    width: 320,           
    alignItems: 'center', 
    marginTop: 10 
  },

  roleContainer: { 
    width: 320, 
    marginVertical: 15,
    alignSelf: 'center',
  },
  roleLabel: { fontSize: 16, 
    marginBottom: 10, 
    color: COLORS.black,
    fontWeight: '600' },
  roleBtn: { padding: 14, 
    borderRadius: 12,
     backgroundColor: '#f0f0f0', 
     width: '45%', 
     alignItems: 'center' },
  roleActive: { backgroundColor: COLORS.primaryBlue },
  roleText: { fontSize: 16 },
  roleTextActive: { color: '#fff', 
    fontWeight: 'bold' },
  authButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    color: COLORS.primaryBlue,
    fontSize: 15,
    textAlign: 'center',
  },
  genderContainer: {
    width: 320,
    marginVertical: 10,
    alignSelf: 'center',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  genderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    width: '45%',
    justifyContent: 'center',
  },
  genderActive: {
    backgroundColor: COLORS.primaryBlue,
  },
  genderText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  genderTextActive: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  dobContainer: {
    width: 320,
    marginVertical: 10,
    alignSelf: 'center',
  },
  dobButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    marginTop: 8,
  },
  dobText: {
    fontSize: 16,
    color: COLORS.black,
  },
  profileField: {
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  profileValue: {
    fontSize: 16,
    color: COLORS.black,
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  profileInput: {
    fontSize: 16,
    color: COLORS.black,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBlue,
  },
  toggleContainer: { flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    backgroundColor: COLORS.lightGray, 
    borderBottomWidth: 1, 
    borderColor: COLORS.divider },

  toggleLabel: { fontSize: 14, color: COLORS.gray },

  safeArea: { flex: 1, backgroundColor: COLORS.white },
  screenContainer: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 20 },
  headerTitle: { fontSize: 25, 
  fontWeight: 'bold',
   color: COLORS.black },
  card: { backgroundColor: COLORS.lightGray, 
    borderRadius: 15,
     padding: 20,
      marginHorizontal: 20, 
      marginTop: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 }, 
     shadowOpacity: 0.05, 
     shadowRadius: 4, 
     elevation: 2 },
  cardTitle: { fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15 },
  cardSubtitle: { fontSize: 14, color: COLORS.gray, marginBottom: 15 },
  goalItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  goalText: { marginLeft: 15, flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '600' },
  goalSubtitle: { fontSize: 14, color: COLORS.gray },
  progressBarContainer: { height: 8, 
    backgroundColor: COLORS.divider,
     borderRadius: 4,
      overflow: 'hidden',
       marginBottom: 15 },
  progressBar: { height: '100%', backgroundColor: COLORS.primaryBlue, borderRadius: 4 },
  nextReminderCard: { backgroundColor: COLORS.darkBlue },
  reminderItem: { flexDirection: 'row', alignItems: 'center' },
  reminderText: { marginLeft: 15 },
  reminderTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  reminderTime: { fontSize: 16, color: COLORS.lightBlue },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statusBox: { alignItems: 'center' },
  statusValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primaryBlue },
  statusLabel: { fontSize: 14, color: COLORS.gray },
  statusDivider: { width: 1, height: '60%', backgroundColor: COLORS.divider },
  allWellBadge: { position: 'absolute', 
    top: -35, 
    right: -10, 
    backgroundColor: COLORS.lightBlue, 
    borderColor: COLORS.green, 
    borderWidth: 1, 
    borderRadius: 15, 
    paddingVertical: 4, 
    paddingHorizontal: 10 },
  allWellText: { color: COLORS.green, fontWeight: '600' },
  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  taskIconContainer: { width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.lightBlue, 
    justifyContent: 'center', 
    alignItems: 'center' },
  taskTextContainer: { flex: 1, marginLeft: 15 },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  taskTime: { fontSize: 14, color: COLORS.gray },
  taskStatus: { fontSize: 14, fontWeight: '600', marginRight: 8 },
  taskActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, marginLeft: 4 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 5, marginHorizontal: 20 },
  calendarContainer: { marginHorizontal: 20, 
    borderRadius: 15,
     overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: COLORS.divider, 
    padding: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarMonthYear: { fontSize: 18, fontWeight: 'bold', color: COLORS.black },
  calendarWeekdays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 },
  calendarWeekday: { width: 40, textAlign: 'center', color: COLORS.gray, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  calendarDay: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  dayTextContainer: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  calendarDayText: { fontSize: 16, color: COLORS.black },
  selectedDay: { backgroundColor: COLORS.primaryBlue },
  selectedDayText: { fontSize: 16, color: COLORS.white, fontWeight: 'bold' },
  tasksHeader: { fontSize: 18, fontWeight: 'bold', margin: 20 },
  sosContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sosButton: { width: Dimensions.get('window').width * 0.6, 
    height: Dimensions.get('window').width * 0.6, 
    borderRadius: Dimensions.get('window').width * 0.3, 
    backgroundColor: COLORS.sosRed, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: COLORS.red, 
    shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.3, 
     shadowRadius: 10, 
     elevation: 8 },
  sosText: { fontSize: 60, fontWeight: 'bold', color: COLORS.white },
  alertLogContainer: { padding: 20 },
  alertCard: { backgroundColor: COLORS.alertBg,
     borderRadius: 15, padding: 20, 
     flexDirection: 'row', 
     alignItems: 'flex-start', 
     borderWidth: 1, borderColor: COLORS.red },
  alertTextContainer: { marginLeft: 15, flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.red },
  alertTime: { fontSize: 14, color: COLORS.black, marginVertical: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  alertLocation: { fontSize: 14, color: COLORS.gray, marginLeft: 5 },
  tabBar: { 
    height: 75, 
    paddingTop: 10,
    paddingBottom: 30, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.divider, 
    backgroundColor: COLORS.white,
    justifyContent: 'space-around',
  },
  tabBarLabel: { fontSize: 12, fontWeight: '600' },
  
    customInputContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
    fontSize: 16,
    maxHeight: 100, // Grows as user types
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -10,
    left: 70,
    backgroundColor: COLORS.white,
    borderRadius: 15,
  },

  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green, 
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    marginHorizontal: 10,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  // ChatGPT-style sidebar styles
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.divider,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBlue,
    padding: 12,
    margin: 15,
    borderRadius: 10,
  },
  newChatBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatList: {
    flex: 1,
  },
  chatSessionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  chatSessionItemActive: {
    backgroundColor: COLORS.lightBlue,
  },
  chatSessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  chatSessionPreview: {
    fontSize: 14,
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  emergencyAlertButton: {
    backgroundColor: COLORS.sosRed,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  emergencyAlertIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyAlertTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  emergencyAlertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  emergencyAlertSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  alertBadge: {
    backgroundColor: COLORS.sosRed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  alertBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(217, 54, 54, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertItemTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  alertItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  alertItemTime: {
    fontSize: 13,
    color: COLORS.gray,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.sosRed,
    marginLeft: 10,
  },
});