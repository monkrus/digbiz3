import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../store';
import { COLORS, FONTS } from '../../constants/theme';
import api from '../../services/apiService';

const { width, height } = Dimensions.get('window');

interface VRRoom {
  id: string;
  name: string;
  capacity: number;
  environment: string;
  features: string[];
  currentOccupancy: number;
  participants?: Participant[];
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  position: { x: number; y: number; z: number };
  isActive: boolean;
}

interface VRMeetingRoomProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
}

const VRMeetingRoom: React.FC<VRMeetingRoomProps> = ({
  visible,
  onClose,
  roomId
}) => {
  const [rooms, setRooms] = useState<VRRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<VRRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inVR, setInVR] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // VR interaction animations
  const roomScale = useRef(new Animated.Value(1)).current;
  const participantOpacity = useRef(new Animated.Value(0)).current;
  const immersionLevel = useRef(new Animated.Value(0)).current;

  const user = useAppSelector((state) => state.auth.user);

  const fetchVRRooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/v2/ar/meeting-rooms');
      if (response.data.success) {
        setRooms(response.data.data.availableRooms || []);
      }
    } catch (error) {
      console.error('Error fetching VR rooms:', error);
      Alert.alert('Error', 'Failed to load VR meeting rooms');
    } finally {
      setLoading(false);
    }
  };

  const joinVRRoom = async (room: VRRoom) => {
    try {
      setJoining(true);
      
      // Create VR session
      const sessionResponse = await api.post('/v2/vr/environments', {
        environmentType: room.environment,
        participants: [user?.id],
        roomId: room.id
      });

      if (sessionResponse.data.success) {
        setSelectedRoom(room);
        setInVR(true);
        startVRExperience();
        
        Alert.alert(
          'VR Session Created',
          `Joined ${room.name}. Session URL: ${sessionResponse.data.data.joinUrl}`
        );
      }
    } catch (error) {
      console.error('Error joining VR room:', error);
      Alert.alert('Error', 'Failed to join VR room');
    } finally {
      setJoining(false);
    }
  };

  const startVRExperience = () => {
    // Animate entry into VR
    Animated.sequence([
      Animated.timing(immersionLevel, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(participantOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Mock participant data
    setParticipants([
      {
        id: 'p1',
        name: 'Sarah Chen',
        position: { x: 0.3, y: 0.2, z: 0.5 },
        isActive: true
      },
      {
        id: 'p2', 
        name: 'Michael Rodriguez',
        position: { x: -0.2, y: 0.4, z: 0.8 },
        isActive: true
      },
      {
        id: 'p3',
        name: 'Emily Johnson',
        position: { x: 0.6, y: 0.3, z: 0.3 },
        isActive: false
      }
    ]);
  };

  const leaveVRRoom = () => {
    Animated.timing(immersionLevel, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      setInVR(false);
      setSelectedRoom(null);
      setParticipants([]);
    });
  };

  const getRoomIcon = (environment: string) => {
    switch (environment) {
      case 'corporate': return '🏢';
      case 'social': return '☕';
      case 'exhibition': return '🎪';
      default: return '🏠';
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'corporate': return [COLORS.primary, COLORS.primaryDark];
      case 'social': return [COLORS.warning, COLORS.warningDark];
      case 'exhibition': return [COLORS.success, COLORS.successDark];
      default: return [COLORS.textMuted, COLORS.border];
    }
  };

  useEffect(() => {
    if (visible) {
      fetchVRRooms();
    }
  }, [visible]);

  const renderRoomCard = ({ item: room }: { item: VRRoom }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => joinVRRoom(room)}
      disabled={joining}
    >
      <LinearGradient
        colors={getEnvironmentColor(room.environment)}
        style={styles.roomGradient}
      >
        <View style={styles.roomHeader}>
          <Text style={styles.roomIcon}>{getRoomIcon(room.environment)}</Text>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.roomCapacity}>
              {room.currentOccupancy || 0}/{room.capacity} participants
            </Text>
          </View>
          <View style={styles.roomStatus}>
            <View style={[
              styles.statusDot,
              { backgroundColor: (room.currentOccupancy || 0) < room.capacity ? COLORS.success : COLORS.warning }
            ]} />
          </View>
        </View>
        
        <View style={styles.roomFeatures}>
          {room.features.map((feature, index) => (
            <Text key={index} style={styles.featureTag}>
              {feature}
            </Text>
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderVRParticipant = (participant: Participant, index: number) => (
    <Animated.View
      key={participant.id}
      style={[
        styles.vrParticipant,
        {
          left: width * participant.position.x,
          top: height * participant.position.y,
          opacity: participantOpacity,
          transform: [
            {
              scale: immersionLevel.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1 + participant.position.z * 0.3]
              })
            }
          ]
        }
      ]}
    >
      <LinearGradient
        colors={participant.isActive ? [COLORS.success, COLORS.successDark] : [COLORS.textMuted, COLORS.border]}
        style={styles.participantAvatar}
      >
        <Text style={styles.participantInitial}>
          {participant.name.charAt(0)}
        </Text>
      </LinearGradient>
      <Text style={styles.participantName}>{participant.name}</Text>
      {participant.isActive && (
        <View style={styles.activeIndicator}>
          <Text style={styles.activeText}>🎤</Text>
        </View>
      )}
    </Animated.View>
  );

  const renderVRInterface = () => (
    <View style={styles.vrInterface}>
      <Animated.View
        style={[
          styles.vrBackground,
          {
            opacity: immersionLevel
          }
        ]}
      >
        <LinearGradient
          colors={selectedRoom ? getEnvironmentColor(selectedRoom.environment) : [COLORS.primary, COLORS.primaryDark]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* VR Environment Overlay */}
      <View style={styles.vrEnvironment}>
        <Text style={styles.vrTitle}>
          🌐 {selectedRoom?.name || 'VR Meeting Room'}
        </Text>
        <Text style={styles.vrSubtitle}>
          Immersive Business Networking Experience
        </Text>
      </View>

      {/* Participants in 3D space */}
      <View style={styles.vrSpace}>
        {participants.map(renderVRParticipant)}
      </View>

      {/* VR Controls */}
      <View style={styles.vrControls}>
        <TouchableOpacity style={styles.vrButton}>
          <Text style={styles.vrButtonText}>🎤 Mute</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.vrButton}>
          <Text style={styles.vrButtonText}>📹 Video</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.vrButton}>
          <Text style={styles.vrButtonText}>💼 Share Card</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.vrButton}>
          <Text style={styles.vrButtonText}>🔗 Connect</Text>
        </TouchableOpacity>
      </View>

      {/* Exit VR */}
      <TouchableOpacity style={styles.exitVRButton} onPress={leaveVRRoom}>
        <Text style={styles.exitVRText}>Exit VR</Text>
      </TouchableOpacity>
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!inVR ? (
          <>
            {/* Header */}
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.header}
            >
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>🥽 VR Meeting Rooms</Text>
              <Text style={styles.headerSubtitle}>
                Immersive business networking
              </Text>
            </LinearGradient>

            {/* Room Selection */}
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading VR rooms...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Available Rooms</Text>
                  <FlatList
                    data={rooms}
                    renderItem={renderRoomCard}
                    keyExtractor={(room) => room.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.roomsList}
                  />
                </>
              )}
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>VR Features</Text>
              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🎯</Text>
                  <Text style={styles.featureText}>Spatial Audio</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>👋</Text>
                  <Text style={styles.featureText}>Gesture Tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>💼</Text>
                  <Text style={styles.featureText}>Card Sharing</Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🌐</Text>
                  <Text style={styles.featureText}>Global Access</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          renderVRInterface()
        )}

        {joining && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={styles.joiningText}>Joining VR room...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 10,
    marginBottom: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.regular,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  roomsList: {
    paddingBottom: 20,
  },
  roomCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roomGradient: {
    padding: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roomIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  roomCapacity: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.regular,
  },
  roomStatus: {
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roomFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    fontSize: 12,
    color: COLORS.white,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
    fontFamily: FONTS.medium,
  },
  featuresContainer: {
    padding: 20,
    backgroundColor: COLORS.surface,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },
  vrInterface: {
    flex: 1,
    position: 'relative',
  },
  vrBackground: {
    position: 'absolute',
    width: width,
    height: height,
    top: 0,
    left: 0,
  },
  vrEnvironment: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  vrTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  vrSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  vrSpace: {
    flex: 1,
    position: 'relative',
  },
  vrParticipant: {
    position: 'absolute',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  participantName: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeText: {
    fontSize: 12,
  },
  vrControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vrButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backdropFilter: 'blur(10px)',
  },
  vrButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  exitVRButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: COLORS.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exitVRText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joiningText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
});

export default VRMeetingRoom;