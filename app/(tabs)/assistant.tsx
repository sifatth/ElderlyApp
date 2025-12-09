import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
// NOTE: Use '/legacy' to avoid the deprecation warning
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform, // <-- Platform is imported here
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { auth, db, getAiChatResponse } from './firebase';

// --- START NEW UTILITY FUNCTION (Handles Web & Native File Reading) ---
const readLocalFileAsBase64 = async (uri: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    // 1. Fetch the file data from the URI (Blob/File API supported by browsers)
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch local file data: ${response.statusText}`);
      }
      const blob = await response.blob();

      // 2. Use FileReader to convert the Blob to a Base64 string
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // reader.result is a data URL (e.g., 'data:image/jpeg;base64,...')
          // We extract the Base64 string part after the comma
          const dataUrl = reader.result as string;
          if (!dataUrl) {
            reject(new Error('FileReader returned empty result.'));
            return;
          }
          const base64String = dataUrl.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = (error) => {
          reject(new Error(`FileReader failed: ${error}`));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Web File Read Error:', error);
      return null;
    }
  } else {
    // NATIVE (iOS/Android) implementation
    // Uses the fixed string literal 'base64'
    return FileSystem.readAsStringAsync(uri, { 
      encoding: 'base64' 
    });
  }
};
// --- END NEW UTILITY FUNCTION ---


const AI_USER = { _id: 2, name: 'AI Assistant', avatar: 'https://placehold.co/40x40/007AFF/FFFFFF?text=AI' };
const COLORS = {
  primaryBlue: '#007AFF',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8E8E93',
  lightGray: '#F2F2F7',
  divider: '#E5E5EA',
  red: '#FF3B30',
  inputBg: '#F2F2F2',
  lightBlue: '#E6F2FF',
};

export default function AssistantScreen() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<Array<{id: string, title: string, lastMessage: string, timestamp: Date}>>([]);

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    setIsLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const chatsRef = collection(db, 'users', currentUser.uid, 'chatSessions');
      const q = query(chatsRef, orderBy('lastUpdated', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await createNewChat();
      } else {
        const sessions = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || 'New Chat',
          lastMessage: doc.data().lastMessage || '',
          timestamp: doc.data().lastUpdated?.toDate() || new Date(),
        }));
        setChatSessions(sessions);
        setMessages([]);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      setMessages([]);
      setIsLoading(false);
    }
  };

  const createNewChat = async (): Promise<string> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return '';

      const chatsRef = collection(db, 'users', currentUser.uid, 'chatSessions');
      const newChatRef = await addDoc(chatsRef, {
        title: 'New Chat',
        lastMessage: '',
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      const newChatId = newChatRef.id;
      setCurrentChatId(newChatId);
      setMessages([]);
      
      const newSession = {
        id: newChatId,
        title: 'New Chat',
        lastMessage: '',
        timestamp: new Date(),
      };
      setChatSessions(prev => [newSession, ...prev]);
      return newChatId;
    } catch (error: any) {
      Alert.alert('Error', `Failed to create new chat: ${error.message}`);
      return '';
    }
  };

  const saveMessageToFirestore = async (message: IMessage, chatId?: string) => {
    try {
      const currentUser = auth.currentUser;
      const activeChatId = chatId || currentChatId;
      if (!currentUser || !activeChatId) return;

      const messagesRef = collection(db, 'users', currentUser.uid, 'chatSessions', activeChatId, 'messages');
      await addDoc(messagesRef, {
        text: message.text,
        createdAt: serverTimestamp(),
        user: message.user,
        image: message.image || null,
      });

      const chatRef = doc(db, 'users', currentUser.uid, 'chatSessions', activeChatId);
      const updateData: any = {
        lastMessage: message.text.substring(0, 50),
        lastUpdated: serverTimestamp(),
      };
      
      if (messages.length <= 1 && message.user._id === 1) {
        updateData.title = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
      }
      
      await setDoc(chatRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const messagesRef = collection(db, 'users', currentUser.uid, 'chatSessions', chatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

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

  const handleNewChat = async () => {
    setShowSidebar(false);
    setInputText('');
    setSelectedImage(null);
    await createNewChat();
  };

  const handlePickImage = async () => {
    // Only use the platform selector on native. Web must use gallery/library
    if (Platform.OS !== 'web') {
      Alert.alert("Upload Photo", "Choose an option", [
        { text: "Camera", onPress: () => pickImage(true) },
        { text: "Gallery", onPress: () => pickImage(false) },
        { text: "Cancel", style: "cancel" }
      ]);
    } else {
      await pickImage(false);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      // IMPORTANT: Low quality to avoid 10MB payload limit
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.3, 
        // We no longer rely on base64 from the picker on web, 
        // but it's fine to keep for native performance
        base64: true,
      };

      if (useCamera) {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Pick Image Error:", e);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleMicPress = async () => {
    // Microphone is not supported on web via expo-av
    if (Platform.OS === 'web') {
      Alert.alert("Feature Unavailable", "Voice recording is not supported when running the app on the web.");
      return;
    }
    
    if (isRecording) {
      setIsRecording(false);
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setRecording(null);
          
          if (uri) {
            let chatId = currentChatId;
            if (!chatId) chatId = await createNewChat();
            if (!chatId) return;
            
            // Use the new utility function
            const base64Audio = await readLocalFileAsBase64(uri);
            
            if (!base64Audio) {
              Alert.alert("Error", "Could not process audio file.");
              return;
            }
            
            const userMsg: IMessage = {
              _id: new Date().getTime().toString(),
              text: '🎤 Voice message',
              createdAt: new Date(),
              user: { _id: 1 },
            };
            
            setMessages(prev => GiftedChat.append(prev, [userMsg]));
            await saveMessageToFirestore(userMsg, chatId);
            setIsTyping(true);
            
            try {
              const result = await getAiChatResponse({ message: '', audio: base64Audio });
              const botReplyText = (result.data as { reply: string }).reply;
              
              const botMessage: IMessage = {
                _id: (new Date().getTime() + 1).toString(),
                text: botReplyText,
                createdAt: new Date(),
                user: AI_USER,
              };
              setMessages(prev => GiftedChat.append(prev, [botMessage]));
              await saveMessageToFirestore(botMessage, chatId);
            } catch (error: any) {
              console.error("Voice AI Error:", error);
              Alert.alert("Error", error.message || "Voice processing failed");
            } finally {
              setIsTyping(false);
            }
          }
        } catch (err) {
          Alert.alert("Error", "Failed to process the recording.");
        }
      }
    } else {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        setRecording(recording);
        setIsRecording(true);
      } catch (err) {
        Alert.alert("Error", "Check microphone permissions.");
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    let chatId = currentChatId;
    if (!chatId) chatId = await createNewChat();
    if (!chatId) return;

    const userMsg: IMessage = {
      _id: new Date().getTime().toString(),
      text: inputText,
      createdAt: new Date(),
      user: { _id: 1 },
      image: selectedImage || undefined,
    };

    setMessages(prev => GiftedChat.append(prev, [userMsg]));
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsTyping(true);

    await saveMessageToFirestore(userMsg, chatId);

    try {
      let base64Image = null;
      if (imageToSend) {
        // Use the new utility function
        base64Image = await readLocalFileAsBase64(imageToSend);
        
        if (!base64Image) {
           throw new Error("Could not read image data for upload.");
        }
        
        // DEBUG: Check size (Firebase limit is ~10MB)
        const sizeInBytes = base64Image.length * 0.75;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        console.log(`Image size: ${sizeInMB.toFixed(2)} MB`);
        
        if (sizeInMB > 9) {
          throw new Error("Image is too large (max 9MB). Please choose a smaller photo.");
        }
      }

      const result = await getAiChatResponse({ 
        message: userMsg.text, 
        image: base64Image 
      });

      if (!result.data || !(result.data as any).reply) {
         throw new Error("Empty response from AI or blocked by safety.");
      }

      const botReplyText = (result.data as { reply: string }).reply;
      
      const botMessage: IMessage = {
        _id: (new Date().getTime() + 1).toString(),
        text: botReplyText,
        createdAt: new Date(),
        user: AI_USER,
      };
      setMessages(prev => GiftedChat.append(prev, [botMessage]));
      await saveMessageToFirestore(botMessage, chatId);

    } catch (error: any) {
      console.error("AI API Error Full:", error);
      
      let friendlyError = error.message || "Connection failed.";
      
      if (error.code === 'functions/internal') {
        friendlyError = "The AI backend crashed. Please check your Firebase Console logs.";
      } else if (error.code === 'functions/deadline-exceeded') {
        friendlyError = "The AI took too long to respond. The image might be too large.";
      }

      Alert.alert("AI Error", friendlyError);
      
      const errorMessage: IMessage = {
        _id: (new Date().getTime() + 1).toString(),
        text: `Error: ${friendlyError}`,
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
    <KeyboardAvoidingView 
      style={styles.screenContainer}
      // Added vertical offset for web compatibility with fixed input bar
      behavior={Platform.OS === 'ios' || Platform.OS === 'web' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Sidebar */}
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
                style={[styles.chatSessionItem, currentChatId === session.id && styles.chatSessionItemActive]}
                onPress={async () => {
                  setCurrentChatId(session.id);
                  await loadChatMessages(session.id);
                  setShowSidebar(false);
                }}
              >
                <Text style={styles.chatSessionTitle} numberOfLines={1}>{session.title}</Text>
                <Text style={styles.chatSessionPreview} numberOfLines={1}>{session.lastMessage}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Chat Area */}
      <View style={{ flex: 1 }}>
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
          <View style={{ flex: 1 }}>
            {messages.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.black, textAlign: 'center' }}>
                  How can I help you today?
                </Text>
              </View>
            ) : (
              <ScrollView 
                ref={(ref) => { if (ref) ref.scrollToEnd({ animated: true }); }}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}
              >
                {messages.slice().reverse().map((message) => (
                  <View key={message._id} style={{ marginBottom: 16, alignItems: message.user._id === 1 ? 'flex-end' : 'flex-start' }}>
                    <View style={{
                      maxWidth: '80%',
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: message.user._id === 1 ? COLORS.primaryBlue : COLORS.lightGray,
                    }}>
                      {message.image && (
                        <Image source={{ uri: message.image }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: 8 }} />
                      )}
                      <Text style={{ color: message.user._id === 1 ? COLORS.white : COLORS.black, fontSize: 16 }}>
                        {message.text}
                      </Text>
                    </View>
                  </View>
                ))}
                {isTyping && (
                  <View style={{ marginBottom: 16, alignItems: 'flex-start' }}>
                    <View style={{ padding: 12, borderRadius: 16, backgroundColor: COLORS.lightGray }}>
                      <Text style={{ color: COLORS.gray }}>Typing...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Input Bar */}
            <View style={styles.customInputContainer}>
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
                  placeholder="Message..."
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
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORS.white },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.black },
  customInputContainer: { backgroundColor: COLORS.white, paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.divider },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  pillInput: { flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 10, fontSize: 16, maxHeight: 100 },
  imagePreviewContainer: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 10 },
  imagePreview: { width: 80, height: 80, borderRadius: 10, backgroundColor: COLORS.lightGray },
  removeImageBtn: { position: 'absolute', top: -10, left: 70, backgroundColor: COLORS.white, borderRadius: 15 },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 280, backgroundColor: COLORS.white, borderRightWidth: 1, borderRightColor: COLORS.divider, zIndex: 1000, elevation: 5 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  sidebarTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.black },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryBlue, padding: 12, margin: 15, borderRadius: 10 },
  newChatBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  chatList: { flex: 1 },
  chatSessionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: COLORS.white },
  chatSessionItemActive: { backgroundColor: COLORS.lightBlue },
  chatSessionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.black, marginBottom: 4 },
  chatSessionPreview: { fontSize: 14, color: COLORS.gray },
});