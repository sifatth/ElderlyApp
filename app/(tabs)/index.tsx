import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
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
import { Bubble, GiftedChat, IMessage } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, getAiChatResponse } from './firebase.js';

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

// Canvas variables
declare const __app_id: string;
declare const __firebase_config: string;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

type UserRole = 'elderly' | 'caregiver';
type UserProfile = {
  name: string;
  email: string;
  role: UserRole;
  linkedCaregiverId: string | null;
  linkedElderlyId: string | null;
  createdAt: string;
};

// Colors & Constants
const { width } = Dimensions.get('window');
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
      <TouchableOpacity onPress={onStatusPress}>
        <Text style={[styles.taskStatus, { color: statusColor }]}>{status}</Text>
      </TouchableOpacity>
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
  const [role, setRole] = useState<UserRole>('elderly');
  const [loading, setLoading] = useState(false);

const handleAuth = async () => {
  if (!email || !password || (!isLogin && !name)) {
    Alert.alert('Error', 'Please fill all fields');
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
      console.log("New user UID:", user.uid);

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role,
        uidPrefix12: user.uid.slice(0, 12).toUpperCase(),   
        linkedCaregiverId: null,
        linkedElderlyId: null,
        createdAt: new Date().toISOString(),
      });
    }
    onSuccess();
  } catch (e: any) {
    Alert.alert('Error', e.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <Ionicons name="heart-outline" size={100} color={COLORS.primaryBlue} />
          <Text style={styles.authTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

          {!isLogin && (
            <TextInput style={styles.input} placeholder="Your Name" value={name} onChangeText={setName} />
          )}
          <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.authButtonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

//  screens 
const ElderlyDashboard = ({ userName, targetUserId }: { userName: string; targetUserId?: string }) => {
  const currentUser = auth.currentUser;
  const effectiveUserId = targetUserId || currentUser?.uid;
  const shareCode = effectiveUserId?.slice(0, 12).toUpperCase() || "LOADING...";

  const [todayReminders, setTodayReminders] = useState<any[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Check if a reminder is for today
  const isReminderForToday = (reminder: any): boolean => {
    const today = new Date();
    const todayStr = today.toDateString();
    const dayName = WEEK_DAYS[today.getDay()];

    if (reminder.repeatOption === 'Daily') return true;
    if (reminder.repeatOption === 'Weekly' && reminder.selectedDays?.includes(dayName)) return true;
    if (reminder.repeatOption === 'Once') {
      const reminderDate = new Date(reminder.date);
      return reminderDate.toDateString() === todayStr;
    }
    return false;
  };

  // Check if reminder is completed today
  const isCompletedToday = (reminder: any): boolean => {
    const todayStr = new Date().toDateString();
    const completedDates = reminder.completedDates || [];
    return completedDates.includes(todayStr) || reminder.status === 'Completed';
  };

  // Load today's reminders + completion count
  useEffect(() => {
    if (!effectiveUserId) return;

    const remindersRef = collection(db, 'users', effectiveUserId, 'reminders');
    const q = query(remindersRef, orderBy('time', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      const todayStr = today.toDateString();

      const todayList: any[] = [];
      let completed = 0;

      snapshot.docs.forEach(doc => {
        const r = { id: doc.id, ...doc.data() };

        if (isReminderForToday(r)) {
          todayList.push(r);
          if (isCompletedToday(r)) {
            completed++;
          }
        }
      });

      setTodayReminders(todayList);
      setCompletedCount(completed);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveUserId]);

  const handleShare = async () => {
    await Share.share({
      message: `Hi! Please take care of me on Elderly Care app.\nMy code: ${shareCode}`,
      url: `https://elderlycare.app/link/${effectiveUserId}`,
      title: "Connect with Me",
    });
  };

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hello, {userName}</Text>
        <TouchableOpacity>
          <Ionicons name="mic-outline" size={30} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      </View>

      {/* Share Code Card */}
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
          <Text style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: 5, color: COLORS.primaryBlue }}>
            {shareCode}
          </Text>
          <TouchableOpacity onPress={handleShare} style={{
            backgroundColor: COLORS.primaryBlue,
            width: 50, height: 50, borderRadius: 25,
            justifyContent: 'center', alignItems: 'center'
          }}>
            <Ionicons name="share-social" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Goals for Today */}
      <Card style={{ marginTop: 20 }}>
        <Text style={styles.cardTitle}>Goals for Today</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primaryBlue} />
        ) : todayReminders.length === 0 ? (
          <Text style={{ color: COLORS.gray, textAlign: 'center', marginTop: 20, fontSize: 16 }}>
            No reminders for today
          </Text>
        ) : (
          <>
            <View style={styles.goalItem}>
              <Ionicons name="checkmark-circle-outline" size={28} color={COLORS.primaryBlue} />
              <View style={styles.goalText}>
                <Text style={styles.goalTitle}>Tasks Completed</Text>
                <Text style={styles.goalSubtitle}>
                  {completedCount} of {todayReminders.length} completed
                </Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar,
                {
                  width: `${(completedCount / todayReminders.length) * 100}%`,
                  backgroundColor: completedCount === todayReminders.length ? COLORS.green : COLORS.primaryBlue
                }
              ]} />
            </View>

            {/* List today's reminders */}
            <View style={{ marginTop: 15 }}>
              {todayReminders.map((reminder, index) => (
                <View key={reminder.id} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                  <Ionicons
                    name={isCompletedToday(reminder) ? "checkmark-circle" : "radio-button-off"}
                    size={22}
                    color={isCompletedToday(reminder) ? COLORS.green : COLORS.gray}
                  />
                  <Text style={{
                    marginLeft: 10,
                    fontSize: 15,
                    color: isCompletedToday(reminder) ? COLORS.gray : COLORS.black,
                    textDecorationLine: isCompletedToday(reminder) ? 'line-through' : 'none'
                  }}>
                    {reminder.title} • {reminder.time}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* Next Reminder */}
      <Card style={[styles.nextReminderCard, { marginTop: 20 }]}>
        <Text style={[styles.cardTitle, { color: COLORS.white, marginBottom: 15 }]}>
          Next Reminder
        </Text>
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : todayReminders.length === 0 || completedCount === todayReminders.length ? (
          <Text style={{ color: COLORS.lightBlue, fontSize: 16 }}>
            All tasks completed today!
          </Text>
        ) : (
          <View style={styles.reminderItem}>
            <Ionicons name="time-outline" size={24} color={COLORS.white} />
            <View style={styles.reminderText}>
              <Text style={styles.reminderTitle}>
                {todayReminders.find(r => !isCompletedToday(r))?.title || "No pending"}
              </Text>
              <Text style={styles.reminderTime}>
                {todayReminders.find(r => !isCompletedToday(r))?.time || "--:--"}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

const CaregiverDashboard = ({ userProfile, elderlyProfile }: { 
  userProfile: UserProfile, 
  elderlyProfile: UserProfile | null 
}) => {
  const router = useRouter();

  const isLinked = !!userProfile.linkedElderlyId;
  const elderlyName = elderlyProfile ? elderlyProfile.name : "No Elderly Linked";

  // If linked but profile hasn't loaded
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
      </View>

      {elderlyName === "No Elderly Linked" || elderlyName.includes("Link") ? (
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
      ) : (
        <>
          <TouchableOpacity
            style={{ alignSelf: 'center', margin: 15, padding: 10 }}
            onPress={() => router.push('/link-elderly')}
          >
            <Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 15 }}>
              Change Linked Elderly
            </Text>
          </TouchableOpacity>

          {/* Render Elderly's Dynamic Dashboard */}
          <ElderlyDashboard userName={elderlyName} targetUserId={userProfile.linkedElderlyId} />
        </>
      )}
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
          [...loadedReminders, ...linkedReminders].forEach(reminder => {
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
    'Are you sure you want to delete this reminder?\nThis will remove it for both you and your linked partner.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const myReminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminder.id);
            await deleteDoc(myReminderRef);

            // Find linked user
            const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (profileSnap.exists()) {
              const linkedId = profileSnap.data().linkedElderlyId || profileSnap.data().linkedCaregiverId;
              if (linkedId) {
                // Find the same reminder in linked user's collection
                const linkedRemindersRef = collection(db, 'users', linkedId, 'reminders');
                const q = query(linkedRemindersRef);
                const snapshot = await getDocs(q);

                const deletePromises = snapshot.docs
                  .filter(doc => {
                    const data = doc.data();
                    // Match by original reminder's Firestore ID or by content
                    return data.originalReminderId === reminder.id || 
                           (data.title === reminder.title && 
                            data.time === reminder.time && 
                            data.date === reminder.date);
                  })
                  .map(doc => deleteDoc(doc.ref));

                await Promise.all(deletePromises);
              }
            }

            Alert.alert('Success', 'Reminder deleted successfully!');
            
            // Re-fetch fresh data
            loadReminders();

          } catch (error: any) {
            console.error("Delete failed:", error);
            Alert.alert('Error', 'Failed to delete reminder: ' + error.message);
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
    onPress={() => navigation.navigate('add-reminder')}
  >
    <Ionicons name="add-circle" size={32} color={COLORS.primaryBlue} />
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

const ElderlyAlerts = () => (
  <View style={styles.screenContainer}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Alert</Text>
    </View>
    <View style={styles.sosContainer}>
      <TouchableOpacity style={styles.sosButton} activeOpacity={0.7}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const CaregiverAlerts = () => (
  <View style={styles.screenContainer}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Alerts Log</Text>
    </View>
    <View style={styles.alertLogContainer}>
      <View style={styles.alertCard}>
        <Ionicons name="warning" size={24} color={COLORS.red} />
        <View style={styles.alertTextContainer}>
          <Text style={styles.alertTitle}>SOS Button Pressed</Text>
          <Text style={styles.alertTime}>October 10, 8:20 PM</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={16} color={COLORS.gray} />
            <Text style={styles.alertLocation}>Location: 123 Maple St.</Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

const AssistantScreen = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<{id: string, title: string, lastMessage: string, timestamp: Date}[]>([]);

  const AI_USER = { _id: 2, name: 'AI Assistant', avatar: 'https://placehold.co/40x40/007AFF/FFFFFF?text=AI' };

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setMessages([{
          _id: '1',
          text: "Hello! I can help you with medicine identification, reminders, or general questions.",
          createdAt: new Date(),
          user: AI_USER,
        }]);
        setIsLoading(false);
        return;
      }

      const chatsRef = collection(db, 'users', currentUser.uid, 'chatSessions');
      const q = query(chatsRef, orderBy('lastUpdated', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Start new chat if none exist
        await createNewChat();
      } else {
        const sessions = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'New Chat',
          lastMessage: doc.data().lastMessage || '',
          timestamp: doc.data().lastUpdated?.toDate() || new Date(),
        }));
        setChatSessions(sessions);
        
        // Don't auto-load any chat - show welcome message
        setMessages([{
          _id: '1',
          text: "Hello! I can help you with medicine identification, reminders, or general questions.",
          createdAt: new Date(),
          user: AI_USER,
        }]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setMessages([{
        _id: '1',
        text: "Hello! I can help you with medicine identification, reminders, or general questions.",
        createdAt: new Date(),
        user: AI_USER,
      }]);
      setIsLoading(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const messagesRef = collection(db, 'users', currentUser.uid, 'chatSessions', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessages([{
          _id: '1',
          text: "Hello! I can help you with medicine identification, reminders, or general questions.",
          createdAt: new Date(),
          user: AI_USER,
        }]);
        return;
      }

      const loadedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          text: data.text || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
          user: data.user || { _id: 1 },
          image: data.image || undefined,
        };
      });

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewChat = async (): Promise<string> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No user logged in');
        Alert.alert('Error', 'You must be logged in to create a chat');
        return '';
      }

      console.log('Creating new chat document for user:', currentUser.uid);
      const chatsRef = collection(db, 'users', currentUser.uid, 'chatSessions');
      const newChatRef = await addDoc(chatsRef, {
        title: 'New Chat',
        lastMessage: '',
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      const newChatId = newChatRef.id;
      console.log('✅ New chat document created with ID:', newChatId);
      
      // Immediately set current chat ID
      setCurrentChatId(newChatId);
      
      // Set welcome message
      const welcomeMsg = [{
        _id: '1',
        text: "Hello! I can help you with medicine identification, reminders, or general questions.",
        createdAt: new Date(),
        user: AI_USER,
      }];
      setMessages(welcomeMsg);
      console.log('✅ Welcome message set');
      
      // Add new session to the list
      const newSession = {
        id: newChatId,
        title: 'New Chat',
        lastMessage: '',
        timestamp: new Date(),
      };
      setChatSessions(prev => {
        const updated = [newSession, ...prev];
        console.log('✅ Chat sessions updated. Total:', updated.length);
        return updated;
      });
      
      return newChatId;
    } catch (error: any) {
      console.error('❌ Error creating new chat:', error);
      console.error('Error details:', error.message, error.code);
      Alert.alert('Error', `Failed to create new chat: ${error.message}`);
      return '';
    }
  };

  const saveMessageToFirestore = async (message: IMessage, chatId?: string) => {
    try {
      const currentUser = auth.currentUser;
      const activeChatId = chatId || currentChatId;
      
      if (!currentUser || !activeChatId) {
        console.log('Cannot save message: no user or chat ID', { user: !!currentUser, chatId: activeChatId });
        return;
      }

      console.log('Saving message to chat:', activeChatId);
      const messagesRef = collection(db, 'users', currentUser.uid, 'chatSessions', activeChatId, 'messages');
      await addDoc(messagesRef, {
        text: message.text,
        createdAt: serverTimestamp(),
        user: message.user,
        image: message.image || null,
      });

      // Update chat session with last message and title
      const chatRef = doc(db, 'users', currentUser.uid, 'chatSessions', activeChatId);
      const updateData: any = {
        lastMessage: message.text.substring(0, 50),
        lastUpdated: serverTimestamp(),
      };
      
      // Auto-generate title from first user message
      if (messages.length <= 1 && message.user._id === 1) {
        updateData.title = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
      }
      
      await setDoc(chatRef, updateData, { merge: true });
      console.log('Message saved successfully');
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleNewChat = async () => {
    console.log('handleNewChat called');
    setShowSidebar(false);
    setInputText('');
    setSelectedImage(null);
    
    const newChatId = await createNewChat();
    console.log('handleNewChat completed with ID:', newChatId);
  };

  const handlePickImage = async () => {
    Alert.alert("Upload Photo", "Choose an option", [
      { text: "Camera", onPress: () => pickImage(true) },
      { text: "Gallery", onPress: () => pickImage(false) },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        base64: true, // Crucial for sending to AI
      });
    } else {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Store the local URI for preview and base64 for sending
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleMicPress = async () => {
    if (isRecording) {
      // Stop recording and process audio
      setIsRecording(false);
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setRecording(null);
          
          if (uri) {
            // Ensure we have a chat session
            let chatId = currentChatId;
            if (!chatId) {
              console.log('No current chat ID, creating new chat...');
              chatId = await createNewChat();
              if (!chatId) {
                Alert.alert('Error', 'Could not create chat. Please try again.');
                return;
              }
            }
            
            // Read audio file as base64
            const base64Audio = await FileSystem.readAsStringAsync(uri, { 
              encoding: FileSystem.EncodingType.Base64 
            });
            
            // Create user message with audio indicator
            const userMsg: IMessage = {
              _id: new Date().getTime().toString(),
              text: '🎤 Voice message',
              createdAt: new Date(),
              user: { _id: 1 },
            };
            
            setMessages(prev => GiftedChat.append(prev, [userMsg]));
            await saveMessageToFirestore(userMsg, chatId);
            setIsTyping(true);
            
            // Send audio to AI
            try {
              const result = await getAiChatResponse({ 
                message: '', 
                audio: base64Audio 
              });
              
              const botReplyText = (result.data as { reply: string }).reply;
              
              const botMessage: IMessage = {
                _id: (new Date().getTime() + 1).toString(),
                text: botReplyText,
                createdAt: new Date(),
                user: AI_USER,
              };
              setMessages(prev => GiftedChat.append(prev, [botMessage]));
              await saveMessageToFirestore(botMessage, chatId);
            } catch (error) {
              console.error('Error processing audio:', error);
              const errorMessage: IMessage = {
                _id: (new Date().getTime() + 1).toString(),
                text: 'Sorry, I had trouble processing your voice message. Please try again.',
                createdAt: new Date(),
                user: AI_USER,
              };
              setMessages(prev => GiftedChat.append(prev, [errorMessage]));
              await saveMessageToFirestore(errorMessage, chatId);
            } finally {
              setIsTyping(false);
            }
          }
        } catch (err) {
          console.error('Failed to stop recording', err);
          Alert.alert("Error", "Failed to process the recording.");
        }
      }
    } else {
      // Start recording
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording', err);
        Alert.alert("Error", "Failed to start recording. Please check microphone permissions.");
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    // Ensure we have a chat session
    let chatId = currentChatId;
    if (!chatId) {
      console.log('No current chat ID, creating new chat...');
      chatId = await createNewChat();
      if (!chatId) {
        Alert.alert('Error', 'Could not create chat. Please try again.');
        return;
      }
      // Update state with new chat ID
      setCurrentChatId(chatId);
    }

    console.log('Sending message to chat:', chatId);

    // 1. Construct User Message
    const userMsg: IMessage = {
      _id: new Date().getTime().toString(),
      text: inputText,
      createdAt: new Date(),
      user: { _id: 1 },
      image: selectedImage || undefined,
    };

    setMessages(prev => GiftedChat.append(prev, [userMsg]));
    setInputText('');
    const imageToSend = selectedImage; // Snapshot current image
    setSelectedImage(null); // Clear preview
    setIsTyping(true);

    // Save user message to Firestore with explicit chatId
    await saveMessageToFirestore(userMsg, chatId);

    try {
      // 2. Prepare Base64 if image exists
      let base64Image = null;
      if (imageToSend) {
        // If image picker didn't give base64 (sometimes it doesn't on some platforms), read it
        base64Image = await FileSystem.readAsStringAsync(imageToSend, { encoding: FileSystem.EncodingType.Base64 });
      }

      // 3. Call Backend
      const result = await getAiChatResponse({ 
        message: userMsg.text, 
        image: base64Image 
      });

      const botReplyText = (result.data as { reply: string }).reply;
      
      const botMessage: IMessage = {
        _id: (new Date().getTime() + 1).toString(),
        text: botReplyText,
        createdAt: new Date(),
        user: AI_USER,
      };
      setMessages(prev => GiftedChat.append(prev, [botMessage]));
      
      // Save AI message to Firestore with explicit chatId
      await saveMessageToFirestore(botMessage, chatId);

    } catch (error) {
      const errorMessage: IMessage = {
        _id: (new Date().getTime() + 1).toString(),
        text: 'Sorry, I had trouble connecting to the AI. Please try again.',
        createdAt: new Date(),
        user: AI_USER,
      };
      setMessages(prev => GiftedChat.append(prev, [errorMessage]));
      await saveMessageToFirestore(errorMessage, chatId);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Sidebar for chat history */}
      {showSidebar && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Chats</Text>
            <TouchableOpacity onPress={() => setShowSidebar(false)}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.newChatBtnText}>New Chat</Text>
          </TouchableOpacity>
          <ScrollView style={styles.chatList}>
            {chatSessions.map(session => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.chatSessionItem,
                  currentChatId === session.id && styles.chatSessionItemActive
                ]}
                onPress={async () => {
                  setCurrentChatId(session.id);
                  await loadChatMessages(session.id);
                  setShowSidebar(false);
                }}
              >
                <Text style={styles.chatSessionTitle} numberOfLines={1}>
                  {session.title}
                </Text>
                <Text style={styles.chatSessionPreview} numberOfLines={1}>
                  {session.lastMessage}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main chat area */}
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
          <TouchableOpacity onPress={() => setShowSidebar(true)}>
            <Ionicons name="menu" size={28} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <TouchableOpacity onPress={handleNewChat}>
            <Ionicons name="create-outline" size={26} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primaryBlue} />
            <Text style={{ marginTop: 10, color: COLORS.gray }}>Loading chat...</Text>
          </View>
        ) : (
          <GiftedChat
            messages={messages}
            user={{ _id: 1 }}
            isTyping={isTyping}
            renderInputToolbar={() => null} 
            minInputToolbarHeight={0}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderBubble={props => (
              <Bubble {...props} 
                wrapperStyle={{ 
                  right: { backgroundColor: COLORS.primaryBlue }, 
                  left: { backgroundColor: COLORS.lightGray } 
                }} 
                textStyle={{
                  right: { color: COLORS.white },
                  left: { color: COLORS.black },
                }}
              />
            )}
          />
        )}

        {/* Custom Input Bar */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={styles.customInputContainer}
        >
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageBtn}>
                <Ionicons name="close-circle" size={24} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.circleBtn} onPress={handlePickImage}>
              <Ionicons name="add" size={24} color={COLORS.gray} />
            </TouchableOpacity>

            <TextInput
              style={styles.pillInput}
              placeholder="Message AI Assistant..."
              placeholderTextColor={COLORS.gray}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            {inputText.length > 0 || selectedImage ? (
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: COLORS.primaryBlue }]} onPress={handleSend}>
                <Ionicons name="arrow-up" size={20} color={COLORS.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.circleBtn, isRecording && { backgroundColor: COLORS.red }]} 
                onPress={handleMicPress}
              >
                <Ionicons name={isRecording ? "stop" : "mic"} size={20} color={isRecording ? COLORS.white : COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const Tab = createBottomTabNavigator();

const AppTabs = ({ userProfile }: { userProfile: UserProfile }) => {
  const [elderlyProfile, setElderlyProfile] = useState<UserProfile | null>(null);

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
            ? <ElderlyDashboard userName={userProfile.name} />
            : <CaregiverDashboard userProfile={userProfile}       
                elderlyProfile={elderlyProfile}
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
        name="Alerts"
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      >
       {() => userProfile.role === 'elderly' ? <ElderlyAlerts /> : <CaregiverAlerts />}
      </Tab.Screen>
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
    </Tab.Navigator>
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
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>
          Logged in as: {userProfile.name} ({userProfile.role.toUpperCase()})
        </Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={{ color: COLORS.red, fontWeight: 'bold' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
    width: '100%', 
    maxWidth: 340,
    marginVertical: 15 
  },
  roleLabel: { fontSize: 16, 
    marginBottom: 10, 
    color: COLORS.gray },
  roleBtn: { padding: 14, 
    borderRadius: 12,
     backgroundColor: '#f0f0f0', 
     width: '45%', 
     alignItems: 'center' },
  roleActive: { backgroundColor: COLORS.primaryBlue },
  roleText: { fontSize: 16 },
  roleTextActive: { color: '#fff', 
    fontWeight: 'bold' },
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
    paddingVertical: 15 },
  headerTitle: { fontSize: 28, 
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
  taskItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 },
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
  sosButton: { width: width * 0.6, 
    height: width * 0.6, 
    borderRadius: width * 0.3, 
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
  tabBar: { height: 90, 
    paddingTop: 10,
     paddingBottom: 30, 
     borderTopWidth: 1, 
     borderTopColor: COLORS.divider, 
     backgroundColor: COLORS.white },
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
});