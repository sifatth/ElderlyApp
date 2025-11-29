// app/link-elderly.tsx   ← Replace your current file with this
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from './(tabs)/firebase.js';

export default function LinkElderlyScreen() {
  const [uidPrefix, setUidPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLink = async () => {
    const prefix = uidPrefix.trim();
    if (prefix.length < 8) {
      return Alert.alert('Too Short', 'Please enter at least 8–12 characters of the UID');
    }

    setLoading(true);
    try {
      // Search all users whose UID *starts with* the typed prefix
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('__name__', '>=', prefix),
        where('__name__', '<=', prefix + '\uf8ff') // This trick searches by prefix
      );

      const snapshot = await getDocs(q);

      let elderlyCandidate = null;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.role === 'elderly' && docSnap.id.startsWith(prefix)) {
          elderlyCandidate = { id: docSnap.id, data };
          break; // Take the first matching elderly
        }
      }

      if (!elderlyCandidate) {
        Alert.alert('Not Found', 'No elderly user found with this UID prefix');
        setLoading(false);
        return;
      }

      const elderlyId = elderlyCandidate.id;
      const elderlyName = elderlyCandidate.data.name;

      const caregiverId = auth.currentUser!.uid;

      // Link both sides
      await updateDoc(doc(db, 'users', caregiverId), {
        linkedElderlyId: elderlyId,
      });

      await updateDoc(doc(db, 'users', elderlyId), {
        linkedCaregiverId: caregiverId,
      });

      Alert.alert('Success!', `Connected to ${elderlyName || 'Elderly User'}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Link to Elderly</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instructions}>
       
          Copy the <Text style={{ fontWeight: 'bold' }}>first 12 characters</Text> of the elderly user's UID
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. abc123def456"
          value={uidPrefix}
          onChangeText={setUidPrefix}
          autoCapitalize="none"
          autoCorrect={false}
          maxLengthLength={20}
          textContentType="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleLink}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 50,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  content: { padding: 20, flex: 1 },
  instructions: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 18,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: 'menlo',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});