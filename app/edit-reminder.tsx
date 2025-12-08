import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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

const EditReminderScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [title, setTitle] = useState('');
  const [repeatOption, setRepeatOption] = useState('Daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminderId, setReminderId] = useState('');
  const [createdBy, setCreatedBy] = useState('');

  useEffect(() => {
    if (params.id) {
      loadReminderData();
    }
  }, [params.id]);

  const loadReminderData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', params.id as string);
      const reminderSnap = await getDoc(reminderRef);

      if (reminderSnap.exists()) {
        const data = reminderSnap.data();
        setReminderId(reminderSnap.id);
        setTitle(data.title || '');
        setRepeatOption(data.repeatOption || 'Daily');
        setSelectedDays(data.selectedDays || []);
        setCreatedBy(data.createdBy || currentUser.uid);
        
        if (data.date) {
          const reminderDate = new Date(data.date);
          if (data.time) {
            const [hours, minutes] = data.time.split(':');
            reminderDate.setHours(parseInt(hours), parseInt(minutes));
          }
          setDate(reminderDate);
        }
      }
    } catch (error) {
      console.error('Error loading reminder:', error);
    }
  };

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'dismissed' || !selectedDate) {
      setShowDatePicker(false);
      return;
    }
    
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

      const reminderData = {
        title: title.trim(),
        repeatOption,
        selectedDays: repeatOption === 'Weekly' ? selectedDays : [],
        date: date.toISOString(),
        time: date.toTimeString().split(' ')[0],
      };

      // Update current user's reminder
      const reminderRef = doc(db, 'users', currentUser.uid, 'reminders', reminderId);
      await updateDoc(reminderRef, reminderData);

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
            if (data.createdBy === createdBy && data.title === params.title) {
              await updateDoc(doc(db, 'users', linkedUserId, 'reminders', docSnap.id), reminderData);
            }
          });
        }
      }

      console.log('Reminder updated successfully');
      Alert.alert('Success', 'Reminder updated!', [
        { text: 'OK', onPress: () => {
          // Navigate back and the useFocusEffect will refresh the reminders
          router.dismiss();
        }}
      ]);
    } catch (error: any) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', `Failed to update reminder: ${error.message}`);
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
        <Text style={styles.headerTitle}>Edit Reminder</Text>
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
        <TouchableOpacity 
          style={[styles.saveButton, saving && { opacity: 0.6 }]} 
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark" size={24} color={COLORS.white} />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Update Reminder'}
          </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 10,
    marginTop: 15,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.black,
  },
  repeatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  repeatButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
  },
  repeatButtonActive: {
    backgroundColor: COLORS.primaryBlue,
  },
  repeatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  repeatButtonTextActive: {
    color: COLORS.white,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: COLORS.primaryBlue,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  dayButtonTextActive: {
    color: COLORS.white,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 15,
  },
  timeText: {
    fontSize: 16,
    color: COLORS.black,
  },
  saveButtonContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditReminderScreen;
