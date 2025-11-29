import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from './firebase.js';

// --- Firebase & AI ---
import { getAiChatResponse } from './firebase.js';

// Firebase
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';



// Canvas variables
declare const __app_id: string;
declare const __firebase_config: string;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';



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
  onPress,
}: {
  icon: any;
  title: string;
  time: string;
  status?: string;
  statusColor?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={styles.taskItem} onPress={onPress}>
    <View style={styles.taskIconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.primaryBlue} />
    </View>
    <View style={styles.taskTextContainer}>
      <Text style={styles.taskTitle}>{title}</Text>
      <Text style={styles.taskTime}>{time}</Text>
    </View>
    {status && <Text style={[styles.taskStatus, { color: statusColor }]}>{status}</Text>}
  </TouchableOpacity>
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
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name,
          email,
          role,
          linkedCaregiverId: null,
          linkedElderlyId: null,
          createdAt: new Date().toISOString(),
        });
      }
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
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
const ElderlyDashboard = ({ userName }: { userName: string }) => (
  <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 20 }}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Hello, {userName}</Text>
      <TouchableOpacity>
        <Ionicons name="mic-outline" size={30} color={COLORS.primaryBlue} />
      </TouchableOpacity>
    </View>

    <Card>
      <Text style={styles.cardTitle}>Goals for Today</Text>
      <View style={styles.goalItem}>
        <Ionicons name="medkit-outline" size={24} color={COLORS.primaryBlue} />
        <View style={styles.goalText}>
          <Text style={styles.goalTitle}>Medications Taken</Text>
          <Text style={styles.goalSubtitle}>3 of 4 completed</Text>
        </View>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '75%' }]} />
      </View>

      <View style={styles.goalItem}>
        <Ionicons name="walk-outline" size={24} color={COLORS.primaryBlue} />
        <View style={styles.goalText}>
          <Text style={styles.goalTitle}>Morning Walk</Text>
          <Text style={styles.goalSubtitle}>15 of 30 minutes</Text>
        </View>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '50%' }]} />
      </View>
    </Card>

    <Card style={styles.nextReminderCard}>
      <Text style={[styles.cardTitle, { color: COLORS.white, marginBottom: 15 }]}>Next Reminder</Text>
      <View style={styles.reminderItem}>
        <Ionicons name="time-outline" size={24} color={COLORS.white} />
        <View style={styles.reminderText}>
          <Text style={styles.reminderTitle}>Lunch with Diana</Text>
          <Text style={styles.reminderTime}>1:00 PM</Text>
        </View>
      </View>
    </Card>
  </ScrollView>
);


const CaregiverDashboard = ({ userProfile, elderlyProfile }: { 
  userProfile: UserProfile, 
  elderlyProfile: UserProfile | null 
}) => {
  const router = useRouter();

  const isLinked = !!userProfile.linkedElderlyId;
  const elderlyName = elderlyProfile ? elderlyProfile.name : "No Elderly Linked";

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
        <TouchableOpacity
          style={{ alignSelf: 'center', margin: 15, padding: 10 }}
          onPress={() => router.push('/link-elderly')}
        >
          <Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 15 }}>
            Change Linked Elderly
          </Text>
        </TouchableOpacity>
      )}

      <Card>
      <Text style={styles.cardTitle}>Today's Status</Text>
      <Text style={styles.cardSubtitle}>Last updated: 9:00 AM</Text>
      <View style={styles.statusContainer}>
        <View style={styles.statusBox}>
          <Text style={styles.statusValue}>3/4</Text>
          <Text style={styles.statusLabel}>Medications</Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusBox}>
          <Text style={styles.statusValue}>1/2</Text>
          <Text style={styles.statusLabel}>Activities</Text>
        </View>
        <View style={styles.allWellBadge}>
          <Text style={styles.allWellText}>All Well</Text>
        </View>
      </View>
    </Card>
    <Card>
      <Text style={styles.cardTitle}>Today's Tasks</Text>
      <TaskItem icon="pill" title="Heart Medication" time="10:00 AM (Daily)" status="Completed" statusColor={COLORS.green} />
      <View style={styles.divider} />
      <TaskItem icon="food-apple-outline" title="Lunch with Diana" time="1:00 PM" status="Pending" statusColor={COLORS.pending} />
      <View style={styles.divider} />
      <TaskItem icon="pill" title="Evening Medication" time="8:00 PM" status="Pending" statusColor={COLORS.pending} />
    </Card>
  </ScrollView>
);
};
const RemindersScreen = () => {
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarExpanded, setCalendarExpanded] = useState(false);

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
        <TaskItem icon="pill" title="Heart Medication" time="10:00 AM" status="Completed" statusColor={COLORS.green} />
        <View style={styles.divider} />
        <TaskItem icon="food-apple-outline" title="Lunch with Diana" time="1:00 PM" status="Pending" statusColor={COLORS.pending} />
        <View style={styles.divider} />
        <TaskItem icon="pill" title="Evening Medication" time="8:00 PM" status="Pending" statusColor={COLORS.pending} />
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

  const AI_USER = { _id: 2, name: 'AI Assistant', avatar: 'https://placehold.co/40x40/007AFF/FFFFFF?text=AI' };

  useEffect(() => {
    setMessages([{
      _id: 1,
      text: "Hello! I'm your AI Assistant. Ask me for summaries, trends, or insights.",
      createdAt: new Date(),
      user: AI_USER,
    }]);
  }, []);

  const onSend = useCallback((newMessages: IMessage[] = []) => {
    setMessages(prev => GiftedChat.append(prev, newMessages));
    const userMessageText = newMessages[0].text;
    setIsTyping(true);

    getAiChatResponse({ message: userMessageText })
      .then(result => {
        const botReplyText = (result.data as { reply: string }).reply;
        const botMessage = {
          _id: new Date().getTime(),
          text: botReplyText,
          createdAt: new Date(),
          user: AI_USER,
        };
        setMessages(prev => GiftedChat.append(prev, [botMessage]));
      })
      .catch(() => {
        const errorMessage = {
          _id: new Date().getTime(),
          text: 'Sorry, I couldn\'t connect. Please try again.',
          createdAt: new Date(),
          user: AI_USER,
        };
        setMessages(prev => GiftedChat.append(prev, [errorMessage]));
      })
      .finally(() => setIsTyping(false));
  }, []);

  return (
    <View style={styles.screenContainer}>
      <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
      </View>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: 1 }}
        isTyping={isTyping}
        placeholder="Ask me about Eleanor's care..."
      />
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
      <Tab.Screen name="Dashboard">
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
      <Tab.Screen name="Alerts">
       {() => userProfile.role === 'elderly' ? <ElderlyAlerts /> : <CaregiverAlerts />}
      </Tab.Screen>
      <Tab.Screen name="Assistant" component={AssistantScreen} />
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
  taskStatus: { fontSize: 14, fontWeight: '600' },
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
});