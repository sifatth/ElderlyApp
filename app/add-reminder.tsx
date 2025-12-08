import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from './(tabs)/firebase';

const COLORS = {
  primaryBlue: '#007AFF',
  white: '#FFFFFF',
  lightGray: '#F2F2F7',
  gray: '#8E8E93',
  black: '#000000',
  red: '#FF3B30',
  divider: '#E5E5EA',
};

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddReminderScreen = () => {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [repeatOption, setRepeatOption] = useState('Daily'); // Daily, Weekly, Once
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed' || !selectedDate) {
      setShowDatePicker(false);
      return;
    }
    
    // Preserve the time component from current date
    const newDate = new Date(selectedDate);
    newDate.setHours(date.getHours());
    newDate.setMinutes(date.getMinutes());
    newDate.setSeconds(date.getSeconds());
    setDate(newDate);
  };

  const onTimeChange = (event: any, selectedTime: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (event.type === 'dismissed' || !selectedTime) {
      setShowTimePicker(false);
      return;
    }
    
    // Preserve the date component from current date
    const newDate = new Date(date);
    newDate.setHours(selectedTime.getHours());
    newDate.setMinutes(selectedTime.getMinutes());
    newDate.setSeconds(selectedTime.getSeconds());
    setDate(newDate);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a reminder title');
      return;
    }

    if (repeatOption === 'Weekly' && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Fetch current user's profile to check for linked partner
      const userProfileRef = doc(db, 'users', currentUser.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      
      const reminderData = {
        title: title.trim(),
        repeatOption,
        selectedDays: repeatOption === 'Weekly' ? selectedDays : [],
        date: date.toISOString(),
        time: date.toTimeString().split(' ')[0],
        status: 'Pending',
        completedDates: [], // For tracking completed dates for Daily/Weekly reminders
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      // Save to current user's reminders
      const remindersRef = collection(db, 'users', currentUser.uid, 'reminders');
      await addDoc(remindersRef, reminderData);

      // If user has a linked partner, save to their reminders too
      if (userProfileSnap.exists()) {
        const userProfile = userProfileSnap.data();
        const linkedUserId = userProfile.linkedElderlyId || userProfile.linkedCaregiverId;
        
        if (linkedUserId) {
          const linkedRemindersRef = collection(db, 'users', linkedUserId, 'reminders');
          await addDoc(linkedRemindersRef, reminderData);
          console.log('Reminder saved to both users');
        }
      }

      console.log('Reminder saved successfully');
      Alert.alert('Success', 'Reminder saved!', [
        { text: 'OK', onPress: () => router.dismiss() }
      ]);
    } catch (error: any) {
      console.error('Error saving reminder:', error);
      Alert.alert('Error', `Failed to save reminder: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
    <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Reminder</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Doctor's Appointment"
          placeholderTextColor={COLORS.gray}
        />

        <Text style={styles.label}>Repeats</Text>
        <View style={styles.repeatContainer}>
          {['Daily', 'Weekly', 'Once'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.repeatButton,
                repeatOption === option && styles.repeatButtonActive,
              ]}
              onPress={() => setRepeatOption(option)}
            >
              <Text
                style={[
                  styles.repeatButtonText,
                  repeatOption === option && styles.repeatButtonTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {repeatOption === 'Weekly' && (
          <>
            <Text style={styles.label}>Day of the week</Text>
            <View style={styles.weekContainer}>
              {WEEK_DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day) && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      selectedDays.includes(day) && styles.dayButtonTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {repeatOption === 'Once' && (
          <>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.timeText}>{date.toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={24} color={COLORS.gray} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Time</Text>
        <TouchableOpacity
          style={styles.timeInput}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.timeText}>
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Ionicons name="time-outline" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}
      </ScrollView>

      <View style={styles.saveButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="checkmark" size={24} color={COLORS.white} />
          <Text style={styles.saveButtonText}>Save Reminder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 10,
    marginTop: 25,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  repeatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 5,
  },
  repeatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  repeatButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  repeatButtonText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '600',
  },
  repeatButtonTextActive: {
    color: COLORS.primaryBlue,
  },
  weekContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayButton: {
    width: '22%',
    paddingVertical: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
    marginRight: '3%',
  },
  dayButtonActive: {
    backgroundColor: COLORS.primaryBlue,
  },
  dayButtonText: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: COLORS.white,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  timeText: {
    fontSize: 16,
    color: COLORS.black,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 15,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default AddReminderScreen;