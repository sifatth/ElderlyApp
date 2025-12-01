import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Alert, Text, View } from 'react-native';
import { auth, db } from '../(tabs)/firebase.js';
export default function DeepLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!code) return;

    const connectCaregiver = async () => {
      if (!auth.currentUser) {
        Alert.alert("Login Required", "Please login as Caregiver first");
        router.replace('/'); 
        return;
      }

      try {
        //check this code elderly ot not
        const elderlySnap = await getDoc(doc(db, 'users', code));
        if (!elderlySnap.exists() || elderlySnap.data().role !== 'elderly') {
          Alert.alert("Invalid Code");
          return;
        }

        const caregiverId = auth.currentUser.uid;

       //linking
        await updateDoc(doc(db, 'users', caregiverId), { linkedElderlyId: code });
        await updateDoc(doc(db, 'users', code), { linkedCaregiverId: caregiverId });

        Alert.alert("Success!", "You are now connected!", [
          { text: "OK", onPress: () => router.replace('/(tabs)') }
        ]);
      } catch (err) {
        Alert.alert("Error", "Something went wrong");
      }
    };

    connectCaregiver();
  }, [code]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Connecting with code: {code}</Text>
    </View>
  );
}