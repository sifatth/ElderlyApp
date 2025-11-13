import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { GiftedChat } from 'react-native-gifted-chat';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAiChatResponse } from './firebase';

// --- Constants ---
const { width } = Dimensions.get('window');
const COLORS = {
  primaryBlue: '#007AFF',
  darkBlue: '#004AAD', // Darker blue for highlights
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

// --- Reusable Components ---
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const TaskItem = ({ icon, title, time, status, statusColor }) => (
  <View style={styles.taskItem}>
    <View style={styles.taskIconContainer}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={COLORS.primaryBlue}
      />
    </View>
    <View style={styles.taskTextContainer}>
      <Text style={styles.taskTitle}>{title}</Text>
      <Text style={styles.taskTime}>{time}</Text>
    </View>
    {status && (
      <Text style={[styles.taskStatus, { color: statusColor }]}>{status}</Text>
    )}
  </View>
);

// --- Screen Components ---

const ElderlyDashboard = () => (
  <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 20 }}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Hello, Eleanor</Text>
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
      <Text style={[styles.cardTitle, { color: COLORS.white, marginBottom: 15 }]}>
        Next Reminder
      </Text>
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

const CaregiverDashboard = () => (
  <ScrollView style={styles.screenContainer} contentContainerStyle={{ paddingBottom: 20 }}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Eleanor's Dashboard</Text>
    </View>

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
      <TaskItem
        icon="pill"
        title="Heart Medication"
        time="10:00 AM (Daily)"
        status="Completed"
        statusColor={COLORS.green}
      />
      <View style={styles.divider} />
      <TaskItem
        icon="food-apple-outline"
        title="Lunch with Diana"
        time="1:00 PM"
        status="Pending"
        statusColor={COLORS.pending}
      />
      <View style={styles.divider} />
      <TaskItem
        icon="pill"
        title="Evening Medication"
        time="8:00 PM"
        status="Pending"
        statusColor={COLORS.pending}
      />
    </Card>
  </ScrollView>
);

const RemindersScreen = () => {
  const [selectedDate, setSelectedDate] = useState('2025-10-14');

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={30} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      </View>

      <Calendar
        current={'2025-10-14'}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: COLORS.primaryBlue,
          },
        }}
        theme={{
          arrowColor: COLORS.primaryBlue,
          todayTextColor: COLORS.primaryBlue,
          textMonthFontWeight: 'bold',
          textMonthFontSize: 18,
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
      />

      <Text style={styles.tasksHeader}>Tasks for Oct 14</Text>
      <ScrollView>
        <TaskItem
          icon="pill"
          title="Heart Medication"
          time="10:00 AM"
          status="Completed"
          statusColor={COLORS.green}
        />
        <View style={styles.divider} />
        <TaskItem
          icon="food-apple-outline"
          title="Lunch with Diana"
          time="1:00 PM"
          status="Pending"
          statusColor={COLORS.pending}
        />
        <View style={styles.divider} />
        <TaskItem
          icon="pill"
          title="Evening Medication"
          time="8:00 PM"
          status="Pending"
          statusColor={COLORS.pending}
        />
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

// --- AI Assistant Screen (MODIFIED FOR LIVE FIREBASE) ---
const AssistantScreen = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false); // For "AI is typing..."

  // Define the AI user
  const AI_USER = {
    _id: 2,
    name: 'AI Assistant',
    avatar: 'https://placehold.co/40x40/007AFF/FFFFFF?text=AI',
  };

  // Set the initial greeting message
  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: "Hello! I'm your AI Assistant. Ask me for summaries, trends, or insights about Eleanor's day.",
        createdAt: new Date(),
        user: AI_USER,
      },
    ]);
  }, []);

  const onSend = useCallback((newMessages = []) => {
    // 1. Add the user's new message to the chat
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages)
    );

    const userMessageText = newMessages[0].text;

    // 2. Set "AI is typing..."
    setIsTyping(true);

    // 3. Call your deployed Firebase Function
    getAiChatResponse({ message: userMessageText })
      .then((result) => {
        const botReplyText = result.data.reply;

        // 4. Create the bot's reply message
        const botMessage = {
          _id: new Date().getTime(), // Unique ID
          text: botReplyText,
          createdAt: new Date(),
          user: AI_USER,
        };

        // 5. Add the bot's reply to the chat
        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, [botMessage])
        );
      })
      .catch((error) => {
        console.error("Error calling Firebase Function:", error);
        // Show an error message in the chat
        const errorMessage = {
          _id: new Date().getTime(),
          text: 'Sorry, I couldn\'t connect. Please try again.',
          createdAt: new Date(),
          user: AI_USER,
        };
        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, [errorMessage])
        );
      })
      .finally(() => {
        // 6. Remove "AI is typing..."
        setIsTyping(false);
      });
  }, []);

  return (
    <View style={styles.screenContainer}>
      <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
      </View>
      <GiftedChat
        messages={messages}
        onSend={(msgs) => onSend(msgs)}
        user={{ _id: 1 }} // This is the "user"
        isTyping={isTyping} // Pass the typing state here
      />
    </View>
  );
};

// --- Tab Navigator Setup ---
const Tab = createBottomTabNavigator();

const AppTabs = ({ userType }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primaryBlue,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Reminders') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'shield-sharp' : 'shield-outline';
            if (userType === 'Elderly') {
              iconName = focused ? 'alert-circle' : 'alert-circle-outline';
            }
          } else if (route.name === 'Assistant') {
            iconName = focused
              ? 'chatbubble-ellipses'
              : 'chatbubble-ellipses-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Dashboard">
        {(props) =>
          userType === 'Elderly' ? (
            <ElderlyDashboard {...props} />
          ) : (
            <CaregiverDashboard {...props} />
          )
        }
      </Tab.Screen>
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Alerts">
        {(props) =>
          userType === 'Elderly' ? (
            <ElderlyAlerts {...props} />
          ) : (
            <CaregiverAlerts {...props} />
          )
        }
      </Tab.Screen>
      <Tab.Screen name="Assistant" component={AssistantScreen} />
    </Tab.Navigator>
  );
};

// --- Main App Component ---
export default function TabsScreen() {
  const [userType, setUserType] = useState('Elderly');

  const toggleUserType = () => {
    setUserType((prev) => (prev === 'Elderly' ? 'Caregiver' : 'Elderly'));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Viewing as: </Text>
        <TouchableOpacity onPress={toggleUserType} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>{userType}</Text>
        </TouchableOpacity>
      </View>
      <AppTabs userType={userType} />
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  card: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 15,
  },
  // Dashboard - Elderly
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalText: {
    marginLeft: 15,
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 4,
  },
  nextReminderCard: {
    backgroundColor: COLORS.darkBlue,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    marginLeft: 15,
  },
  reminderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  reminderTime: {
    fontSize: 16,
    color: COLORS.lightBlue,
  },
  // Dashboard - Caregiver
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusBox: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryBlue,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statusDivider: {
    width: 1,
    height: '60%',
    backgroundColor: COLORS.divider,
  },
  allWellBadge: {
    position: 'absolute',
    top: -35,
    right: -10,
    backgroundColor: COLORS.lightBlue,
    borderColor: COLORS.green,
    borderWidth: 1,
    borderRadius: 15,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  allWellText: {
    color: COLORS.green,
    fontWeight: '600',
  },
  // Shared Task Item
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskTime: {
    fontSize: 14,
    color: COLORS.gray,
  },
  taskStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 5,
    marginHorizontal: 20,
  },
  // Reminders Screen
  calendar: {
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  tasksHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
  },
  // Alerts - Elderly
  sosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButton: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: COLORS.sosRed,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sosText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Alerts - Caregiver
  alertLogContainer: {
    padding: 20,
  },
  alertCard: {
    backgroundColor: COLORS.alertBg,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  alertTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.red,
  },
  alertTime: {
    fontSize: 14,
    color: COLORS.black,
    marginVertical: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  alertLocation: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 5,
  },
  // AI Assistant
  chatInputContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.white,
  },
  chatTextInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginLeft: 0,
    fontSize: 16,
  },
  sendButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 5,
  },
  chatActionsButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 10,
  },
  micButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  // Tab Bar
  tabBar: {
    height: 90,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Demo Toggle
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: COLORS.lightGray,
  },
  toggleLabel: {
    fontSize: 16,
    color: COLORS.gray,
  },
  toggleButton: {
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  toggleButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
