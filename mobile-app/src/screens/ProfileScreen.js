import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

export default function ProfileScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    title: 'Software Engineer',
    company: 'Tech Solutions Inc.',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/johndoe',
  });

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleShareProfile = () => {
    Alert.alert('Share Profile', 'Profile sharing feature coming soon!');
  };

  const ProfileField = ({ label, value, icon }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldIcon}>{icon}</Text>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <Text style={styles.name}>{userProfile.name}</Text>
          <Text style={styles.title}>{userProfile.title}</Text>
          <Text style={styles.company}>{userProfile.company}</Text>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.headerButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleShareProfile}
            >
              <Text style={styles.headerButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <ProfileField 
            label="Email"
            value={userProfile.email}
            icon="📧"
          />
          
          <ProfileField 
            label="Phone"
            value={userProfile.phone}
            icon="📱"
          />
          
          <ProfileField 
            label="LinkedIn"
            value={userProfile.linkedin}
            icon="💼"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🎨 Customize Business Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 View My Analytics</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔗 Manage Connections</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Cards Shared</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>18</Text>
              <Text style={styles.statLabel}>New Connections</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Events Attended</Text>
            </View>
            
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>92%</Text>
              <Text style={styles.statLabel}>Response Rate</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.md,
    color: 'white',
    opacity: 0.9,
  },
  company: {
    fontSize: FONT_SIZES.sm,
    color: 'white',
    opacity: 0.8,
    marginBottom: SPACING.lg,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  headerButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  fieldIcon: {
    fontSize: FONT_SIZES.lg,
    marginRight: SPACING.md,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  fieldValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statNumber: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});