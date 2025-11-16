import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

// --- New Component: AddReminderScreen ---
const REPEAT_OPTIONS = ['Daily', 'Weekly', 'Once'] as const;
type RepeatType = typeof REPEAT_OPTIONS[number];

const AddReminderScreen = ({ onGoBack }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:30'); // Simple time string
  const [repeatType, setRepeatType] = useState<RepeatType>('Daily');
  const [selectedDate, setSelectedDate] = useState('2025-10-14'); // For 'Once'
  const [selectedDays, setSelectedDays] = useState(['Mon']); // For 'Weekly'

  const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSave = () => {
    console.log('New Reminder Saved:', { title, time, repeatType, selectedDate, selectedDays });
    // In a real app, this would save to a database
    onGoBack();
  };

  const getRepeatButtonStyles = (option: RepeatType) => ({
    button: [
      styles.repeatButton,
      option === repeatType && styles.repeatButtonActive,
    ],
    text: [
      styles.repeatButtonText,
      option === repeatType ? { color: COLORS.primaryBlue } : { color: COLORS.black },
    ],
  });

  const getDayButtonStyles = (day: string) => ({
    button: [
      styles.dayButton,
      selectedDays.includes(day) && styles.dayButtonActive,
    ],
    text: [
      styles.dayButtonText,
      selectedDays.includes(day) ? { color: COLORS.primaryBlue } : { color: COLORS.gray },
    ],
  });

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack}>
          <Ionicons name="chevron-back" size={30} color={COLORS.primaryBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitleSmall}>New Reminder</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={styles.addReminderContent}>
        {/* Title Input */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Doctor's Appointment"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Repeat Option */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Repeats</Text>
          <View style={styles.repeatOptionsContainer}>
            {REPEAT_OPTIONS.map((option) => {
              const styles = getRepeatButtonStyles(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.button}
                  onPress={() => setRepeatType(option)}
                >
                  <Text style={styles.text}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Conditional Fields */}
        {repeatType === 'Once' && (
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Date</Text>
            {/* Using a simple text input for date since a native date picker is complex */}
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              value={selectedDate}
              onChangeText={setSelectedDate}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        )}

        {repeatType === 'Weekly' && (
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Day of the week</Text>
            <View style={styles.daySelectorContainer}>
              {DAYS_OF_WEEK.map((day) => {
                const styles = getDayButtonStyles(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={styles.button}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={styles.text}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Time Input */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Time</Text>
          {/* Using a simple text input for time since a native time picker is complex */}
          <TextInput
            style={styles.textInput}
            placeholder="HH:MM"
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </ScrollView>
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.white} />
          <Text style={styles.saveButtonText}>Save Reminder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// --- Screen Components ---

const ElderlyDashboard = () => (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome Back</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={30} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        {/* SOS Alert Card */}
        <Card style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning-outline" size={24} color={COLORS.red} />
            <Text style={styles.alertTitle}>Emergency Alert!</Text>
          </View>
          <Text style={styles.alertSubtitle}>
            Tap here to notify your caregiver and emergency contacts.
          </Text>
          <TouchableOpacity style={styles.sosButton}>
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </Card>

        {/* Next Task Card */}
        <Card>
          <Text style={styles.cardTitle}>Next Task</Text>
          <TaskItem
            icon="pill"
            title="Morning Medication"
            time="8:00 AM"
            status="Pending"
            statusColor={COLORS.pending}
          />
        </Card>

        {/* Recent Activities Card */}
        <Card>
          <Text style={styles.cardTitle}>Recent Activities</Text>
          <Text style={styles.cardSubtitle}>Last check-in: 1 hour ago</Text>
          <View style={styles.divider} />
          <Text style={styles.cardSubtitle}>Temperature recorded: 98.6°F</Text>
        </Card>

        {/* Simple navigation to Assistant */}
        <Card style={styles.assistantCard}>
          <Text style={styles.cardTitle}>Need Help?</Text>
          <Text style={styles.cardSubtitle}>Talk to your AI Assistant</Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={30}
            color={COLORS.primaryBlue}
            style={{ position: 'absolute', right: 20, top: 35 }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
);

const CaregiverDashboard = () => (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Caregiver View</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={30} color={COLORS.black} />
          </TouchableOpacity>
        </View>
        
        {/* Summary Card */}
        <Card>
            <Text style={styles.cardTitle}>Patient Status</Text>
            <Text style={styles.cardSubtitle}>Elderly Patient (John Doe)</Text>
            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Last Check-in:</Text>
                <Text style={styles.statusValue}>15 minutes ago</Text>
            </View>
            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Next Task:</Text>
                <Text style={styles.statusValue}>Lunch (1:00 PM)</Text>
            </View>
        </Card>

        {/* Today's Tasks Card */}
        <Card>
            <Text style={styles.cardTitle}>Today's Tasks</Text>
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
        </Card>

        {/* Alerts Card */}
        <Card>
            <Text style={styles.cardTitle}>Active Alerts</Text>
            <View style={styles.alertItem}>
                <Ionicons name="warning" size={20} color={COLORS.red} />
                <Text style={styles.alertItemText}>Motion not detected in 6 hours</Text>
            </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
);

const RemindersScreen = () => {
  const [selectedDate, setSelectedDate] = useState('2025-10-14');
  // State to manage the view: 'list' or 'add'
  const [mode, setMode] = useState<'list' | 'add'>('list');

  if (mode === 'add') {
    return <AddReminderScreen onGoBack={() => setMode('list')} />;
  }

  return (
    <View style={styles.screenContainer}> 
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity onPress={() => setMode('add')}>
          <Ionicons name="add-circle-outline" size={30} color={COLORS.primaryBlue} />
        </TouchableOpacity>
      </View>

      {/* Calendar (Fixed Height) */}
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
      
      {/* Scrollable Task List - Now with flex: 1 style */}
      <ScrollView contentContainerStyle={styles.taskListContent} style={styles.taskListScroll}>
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
        <View style={styles.divider} />
        <TaskItem
          icon="walk"
          title="Walk around the block"
          time="4:00 PM"
          status="Pending"
          statusColor={COLORS.pending}
        />
        <View style={styles.divider} />
        <TaskItem
          icon="notebook"
          title="Call Caregiver"
          time="9:00 AM"
          status="Completed"
          statusColor={COLORS.green}
        />
        <View style={styles.divider} />
        <TaskItem
          icon="face-mask"
          title="Apply Sunscreen"
          time="9:30 AM"
          status="Pending"
          statusColor={COLORS.pending}
        />
        <View style={styles.divider} />
        <TaskItem
          icon="water"
          title="Drink Water"
          time="12:00 PM"
          status="Completed"
          statusColor={COLORS.green}
        />
        <View style={styles.divider} />
        <TaskItem
          icon="headphones"
          title="Listen to Podcast"
          time="3:00 PM"
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
            <Text style={styles.headerTitle}>Alerts</Text>
            <TouchableOpacity>
                <Ionicons name="options-outline" size={30} color={COLORS.black} />
            </TouchableOpacity>
        </View>
        <ScrollView style={styles.alertList}>
            <View style={styles.alertCardItem}>
                <View style={styles.alertIconContainer}>
                    <Ionicons name="warning" size={24} color={COLORS.red} />
                </View>
                <View style={styles.alertContent}>
                    <Text style={styles.alertTitleText}>Fall Detected</Text>
                    <Text style={styles.alertTime}>5 minutes ago</Text>
                </View>
                <TouchableOpacity style={styles.resolveButton}>
                    <Text style={styles.resolveButtonText}>Resolved</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.alertCardItem}>
                <View style={styles.alertIconContainer}>
                    <Ionicons name="body" size={24} color={COLORS.pending} />
                </View>
                <View style={styles.alertContent}>
                    <Text style={styles.alertTitleText}>Low Activity</Text>
                    <Text style={styles.alertTime}>2 hours ago</Text>
                </View>
                <TouchableOpacity style={styles.resolveButton}>
                    <Text style={styles.resolveButtonText}>Check In</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </View>
);

const CaregiverAlerts = () => (
    <View style={styles.screenContainer}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Alerts</Text>
            <TouchableOpacity>
                <Ionicons name="options-outline" size={30} color={COLORS.black} />
            </TouchableOpacity>
        </View>
        <ScrollView style={styles.alertList}>
            <View style={styles.alertCardItem}>
                <View style={styles.alertIconContainer}>
                    <Ionicons name="warning" size={24} color={COLORS.red} />
                </View>
                <View style={styles.alertContent}>
                    <Text style={styles.alertTitleText}>SOS - John Doe</Text>
                    <Text style={styles.alertTime}>3 minutes ago</Text>
                </View>
                <TouchableOpacity style={styles.callButton}>
                    <Ionicons name="call" size={20} color={COLORS.white} />
                    <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.alertCardItem}>
                <View style={styles.alertIconContainer}>
                    <Ionicons name="medkit" size={24} color={COLORS.pending} />
                </View>
                <View style={styles.alertContent}>
                    <Text style={styles.alertTitleText}>Medication Skipped</Text>
                    <Text style={styles.alertTime}>1 hour ago</Text>
                </View>
                <TouchableOpacity style={styles.resolveButton}>
                    <Text style={styles.resolveButtonText}>Check In</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    </View>
);

const AssistantScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: "Hi! I'm your AI care assistant. How can I help you today?",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Assistant',
          avatar: 'https://placeimg.com/140/140/any',
        },
      },
    ]);
  }, []);

  const onSend = useCallback(async (newMessages = []) => {
    const userMessage = newMessages[0];
    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, newMessages),
    );

    setLoading(true);

    try {
      // Simulate API call to get AI response
      const response = await getAiChatResponse(userMessage.text);

      const aiMessage = {
        _id: Math.round(Math.random() * 1000000),
        text: response,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Assistant',
          avatar: 'https://placeimg.com/140/140/any',
        },
      };

      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [aiMessage]),
      );
    } catch (error) {
      console.error('AI Chat Error:', error);
      const errorMessage = {
        _id: Math.round(Math.random() * 1000000),
        text: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Assistant',
          avatar: 'https://placeimg.com/140/140/any',
        },
      };
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, [errorMessage]),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const renderInputToolbar = (props) => (
    <View style={styles.chatInputContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity style={styles.micButton}>
          <Ionicons name="mic-outline" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        <TextInput
          style={styles.chatTextInput}
          placeholder="Ask your assistant..."
          onChangeText={props.onTextChanged}
          value={props.text}
          onSubmitEditing={props.onSend}
          multiline
        />
        <TouchableOpacity style={styles.sendButtonContainer} onPress={() => props.onSend({ text: props.text.trim(), user: props.user })}>
          <Ionicons
            name="send"
            size={24}
            color={props.text && props.text.trim() ? COLORS.primaryBlue : COLORS.gray}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={30} color={COLORS.black} />
        </TouchableOpacity>
      </View>
      <GiftedChat
        messages={messages}
        onSend={(messages) => onSend(messages)}
        user={{ _id: 1 }}
        renderInputToolbar={renderInputToolbar}
        isTyping={loading}
        // Custom message rendering for a modern look
        renderAvatar={null}
        renderBubble={(props) => (
          <View style={[
            styles.chatBubble,
            props.currentMessage.user._id === 1 ? styles.chatBubbleRight : styles.chatBubbleLeft,
            { marginBottom: 10 }
          ]}>
            <Text style={[
              styles.chatText,
              props.currentMessage.user._id === 1 ? styles.chatTextRight : styles.chatTextLeft
            ]}>
              {props.currentMessage.text}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

// --- Tab Navigator Setup ---
const Tab = createBottomTabNavigator();

const AppTabs = ({ userType }) => {
  const getScreenOptions = (route) => ({
    headerShown: false,
    tabBarActiveTintColor: COLORS.primaryBlue,
    tabBarInactiveTintColor: COLORS.gray,
    tabBarStyle: styles.tabBar,
    tabBarLabelStyle: styles.tabBarLabel,
    tabBarIcon: ({ color, size }) => {
      const { name } = route;
      let iconName;

      if (name === 'Dashboard') {
        iconName = 'home-outline';
      } else if (name === 'Reminders') {
        iconName = 'calendar-outline';
      } else if (name === 'Alerts') {
        iconName = 'warning-outline';
      } else if (name === 'Assistant') {
        iconName = 'chatbubbles-outline';
      }

      return <Ionicons name={iconName} size={size} color={color} />;
    },
  });

  return (
    <Tab.Navigator screenOptions={({ route }) => getScreenOptions(route)}>
      <Tab.Screen
        name="Dashboard"
        component={userType === 'elderly' ? ElderlyDashboard : CaregiverDashboard}
      />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen
        name="Alerts"
        component={userType === 'elderly' ? ElderlyAlerts : CaregiverAlerts}
      />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
    </Tab.Navigator>
  );
};


// --- Main App Component ---
export default function TabsScreen() {
    // For demo purposes, we can toggle between user types
    const [userType, setUserType] = useState<'elderly' | 'caregiver'>('elderly');

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppTabs userType={userType} />

            {/* Demo Toggle for User Type */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        userType === 'elderly' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setUserType('elderly')}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            userType === 'elderly' && { color: COLORS.white },
                        ]}
                    >
                        Elderly
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        userType === 'caregiver' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setUserType('caregiver')}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            userType === 'caregiver' && { color: COLORS.white },
                        ]}
                    >
                        Caregiver
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}


// --- Styles (Updated with new styles for AddReminderScreen and Scrolling) ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    screenContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    scrollContent: {
        paddingBottom: 40,
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
    // Added for AddReminderScreen
    headerTitleSmall: {
        fontSize: 22,
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
    // Dashboard Specific Styles
    alertCard: {
        backgroundColor: COLORS.alertBg,
        borderColor: COLORS.red,
        borderWidth: 1,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.red,
        marginLeft: 10,
    },
    sosButton: {
        backgroundColor: COLORS.sosRed,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    sosButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    assistantCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    statusLabel: {
        fontSize: 16,
        color: COLORS.gray,
    },
    statusValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.black,
    },
    // Shared Task Item
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 0, // Adjusted for Card padding
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
        marginHorizontal: 0,
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
    // New Styles for Reminders Scrolling 🛠️ FIX APPLIED HERE
    taskListScroll: {
        flex: 1, // Crucial: Ensures the ScrollView takes remaining vertical space
        paddingHorizontal: 20, // Move horizontal padding here to align tasks with header
    },
    taskListContent: {
        paddingBottom: 20, 
    },
    // New Styles for AddReminderScreen
    addReminderContent: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 25,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.gray,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: COLORS.lightGray,
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    repeatOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        borderRadius: 10,
        overflow: 'hidden',
    },
    repeatButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.divider,
        marginHorizontal: 2,
    },
    repeatButtonActive: {
        backgroundColor: COLORS.lightBlue,
        borderColor: COLORS.primaryBlue,
    },
    repeatButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    daySelectorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    dayButton: {
        width: '13%', // Approx 7 buttons wide
        aspectRatio: 1,
        marginVertical: 4,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: COLORS.divider,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonActive: {
        backgroundColor: COLORS.lightBlue,
        borderColor: COLORS.primaryBlue,
    },
    dayButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    saveButtonContainer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    saveButton: {
        backgroundColor: COLORS.primaryBlue,
        borderRadius: 30,
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primaryBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    // Alert Styles
    alertList: {
        paddingHorizontal: 20,
    },
    alertCardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    alertIconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContent: {
        flex: 1,
        marginLeft: 10,
    },
    alertTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.black,
    },
    alertTime: {
        fontSize: 14,
        color: COLORS.gray,
    },
    resolveButton: {
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    resolveButtonText: {
        color: COLORS.primaryBlue,
        fontWeight: '600',
    },
    callButton: {
        backgroundColor: COLORS.green,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    callButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        marginLeft: 5,
    },
    // AI Chat Styles
    chatBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 15,
    },
    chatBubbleLeft: {
        backgroundColor: COLORS.lightGray,
        borderBottomLeftRadius: 5,
        alignSelf: 'flex-start',
        marginLeft: 10,
    },
    chatBubbleRight: {
        backgroundColor: COLORS.primaryBlue,
        borderBottomRightRadius: 5,
        alignSelf: 'flex-end',
        marginRight: 10,
    },
    chatText: {
        fontSize: 16,
    },
    chatTextLeft: {
        color: COLORS.black,
    },
    chatTextRight: {
        color: COLORS.white,
    },
    // Chat Input Toolbar (Custom implementation)
    chatInputContainer: {
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: COLORS.white,
    },
    chatTextInput: {
      flex: 1,
      backgroundColor: COLORS.lightGray,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      fontSize: 16,
    },
    sendButtonContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 10,
      marginRight: 5,
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
        position: 'absolute',
        bottom: 5,
        alignSelf: 'center',
        backgroundColor: COLORS.lightGray,
        borderRadius: 20,
        padding: 4,
    },
    toggleButton: {
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 16,
    },
    toggleButtonActive: {
        backgroundColor: COLORS.primaryBlue,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.black,
    },
});