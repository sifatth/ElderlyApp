import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from './(tabs)/firebase.js';

export default function LinkElderlyScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLink = async () => {
    const inputCode = code.trim().toUpperCase();
    if (inputCode.length !== 12) {
      return Alert.alert('Too Short', 'Please enter at least 8–12 characters of the UID');
    }

    setLoading(true);

    try {
      
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'elderly'),
        where('uidPrefix12', '==', inputCode)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert('Not Found', 'No elderly user found with this UID prefix');
        setLoading(false);
        return;
      }

      const elderlyDoc = snapshot.docs[0];
      const elderlyId = elderlyDoc.id;
      const elderlyName = elderlyDoc.data()?.name || 'Elderly User';

      const caregiverId = auth.currentUser!.uid;

      // linking
      await Promise.all([
        updateDoc(doc(db, 'users', caregiverId), { linkedElderlyId: elderlyId }),
        updateDoc(doc(db, 'users', elderlyId), { linkedCaregiverId: caregiverId })
      ]);

      Alert.alert('success!', `${elderlyName}-connected!`, [
        { text: 'ok', onPress: () => router.replace('/(tabs)') }
      ]);

    } catch (error: any) {
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
          value={code}
          onChangeText={setCode}
          placeholder="AB3D5F7G9H1J"
          autoCapitalize="characters"
          maxLength={12}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
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
