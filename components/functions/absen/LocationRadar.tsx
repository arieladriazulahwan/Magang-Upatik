import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

export default function LocationRadar() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  return (
    <View className="items-center justify-center" style={{ height: 260 }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: "rgba(59,130,246,0.35)",
          transform: [{ scale }],
          opacity,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 190,
          height: 190,
          borderRadius: 95,
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.3)",
          borderStyle: "dashed",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 130,
          height: 130,
          borderRadius: 65,
          borderWidth: 1,
          borderColor: "rgba(148,163,184,0.2)",
        }}
      />
      <View className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center">
        <Ionicons name="location" size={26} color="white" />
      </View>
    </View>
  );
}
