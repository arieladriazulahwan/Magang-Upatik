import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

export default function VerificationRing() {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View className="items-center justify-center" style={{ height: 140 }}>
      {/* Ring dasar (redup) */}
      <View
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: 55,
          borderWidth: 3,
          borderColor: "rgba(148,163,184,0.2)",
        }}
      />
      {/* Ring aktif berputar (cuma sebagian sisi terang, biar terlihat "loading") */}
      <Animated.View
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: 55,
          borderWidth: 3,
          borderColor: "transparent",
          borderTopColor: "#3b82f6",
          borderRightColor: "#3b82f6",
          transform: [{ rotate }],
        }}
      />
      <Ionicons name="person-outline" size={40} color="rgba(148,163,184,0.7)" />
    </View>
  );
}