import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

export default function NetworkScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [connections] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      title: 'Marketing Director',
      company: 'Digital Innovations',
      lastContact: '2 days ago',
      status: 'active'
    },
    {
      id: 2,
      name: 'Michael Chen',
      title: 'Product Manager',
      company: 'TechStart Solutions',
      lastContact: '1 week ago',
      status: 'pending'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      title: 'UX Designer',
      company: 'Creative Studio',
      lastContact: '3 days ago',
      status: 'active'
    },
    {
      id: 4,
      name: 'David Kim',
      title: 'Software Engineer',
      company: 'Code Masters',
      lastContact: '5 days ago',
      status: 'active'
    }
  ]);

  const handleConnectionPress = (connection) => {
    Alert.alert(
      connection.name,
      `Title: ${connection.title}\nCompany: ${connection.company}\nLast Contact: ${connection.lastContact}`,
      [
        { text: 'View Profile', onPress: () => console.log('View Profile') },
        { text: 'Send Message', onPress: () => console.log('Send Message') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleAddConnection = () => {
    Alert.alert('Add Connection', 'Connection adding feature coming soon!');
  };

  const filteredConnections = connections.filter(connection =>
    connection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ConnectionCard = ({ connection }) => (
    <TouchableOpacity 
      style={styles.connectionCard}
      onPress={() => handleConnectionPress(connection)}
    >
      <View style={styles.connectionHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {connection.name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName}>{connection.name}</Text>
          <Text style={styles.connectionTitle}>{connection.title}</Text>
          <Text style={styles.connectionCompany}>{connection.company}</Text>
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: connection.status === 'active' ? COLORS.success : COLORS.warning }
        ]} />
      </View>
      <Text style={styles.lastContact}>Last contact: {connection.lastContact}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Network</Text>
        <Text style={styles.headerSubtitle}>{connections.length} connections</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search connections..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleAddConnection}
        >
          <Text style={styles.actionButtonText}>➕ Add Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Scan Card', 'Card scanning feature coming soon!')}
        >
          <Text style={styles.actionButtonText}>📱 Scan Card</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.connectionsList}>
        <View style={styles.connectionsHeader}>
          <Text style={styles.connectionsTitle}>Recent Connections</Text>
        </View>
        
        {filteredConnections.map(connection => (
          <ConnectionCard key={connection.id} connection={connection} />
        ))}
        
        {filteredConnections.length === 0 && searchQuery && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No connections found matching "{searchQuery}"</Text>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  connectionsList: {
    flex: 1,
  },
  connectionsHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  connectionsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  connectionCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: 'white',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  connectionTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  connectionCompany: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  lastContact: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: SPACING.xl,
  },
});