import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

type LocationMapProps = {
  location: LocationCoordinates;
};

const COLORS = {
  gray: '#8E8E93',
};

const LocationMap: React.FC<LocationMapProps> = ({ location }) => {
  return (
    <View style={styles.webFallback}>
      <Text style={styles.webText}>
        Map view is only available on mobile devices.
      </Text>
      <Text style={styles.webCoordinates}>
        Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  webCoordinates: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 10,
  },
});

export default LocationMap;
