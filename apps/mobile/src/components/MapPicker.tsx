/**
 * Draggable-pin map for choosing the report location. Imports react-native-maps
 * at module scope, so it is loaded LAZILY (React.lazy) behind an ErrorBoundary
 * in the report screen — if the native maps module is unavailable (e.g. a
 * misconfigured Expo Go / dev client), evaluation throws and the boundary shows
 * the coords-only fallback instead of crashing.
 */
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  return (
    <View style={styles.wrap}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onChange(latitude, longitude);
        }}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          draggable
          onDragEnd={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            onChange(latitude, longitude);
          }}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
  },
});
