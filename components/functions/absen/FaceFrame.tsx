import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

const FRAME_SIZE = 220;

export default function FaceFrame() {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FRAME_SIZE / 2 + 10, FRAME_SIZE / 2 - 10],
  });

  return (
    <View className="items-center justify-center">
      {/* Sudut bracket kotak (4 pojok) */}
      <View style={{ width: FRAME_SIZE + 60, height: FRAME_SIZE + 60 }} className="absolute">
        <CornerBracket position="top-left" />
        <CornerBracket position="top-right" />
      </View>

      {/* Bingkai oval wajah */}
      <View
        style={{
          width: FRAME_SIZE,
          height: FRAME_SIZE * 1.2,
          borderRadius: FRAME_SIZE,
          borderWidth: 2,
          borderColor: "#3b82f6",
          overflow: "hidden",
        }}
        className="items-center justify-center bg-white/5"
      >
        <Ionicons name="person-outline" size={90} color="rgba(148,163,184,0.6)" />

        {/* Garis scan bergerak */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: "#60a5fa",
            transform: [{ translateY }],
          }}
        />
      </View>
    </View>
  );
}

function CornerBracket({ position }: { position: "top-left" | "top-right" }) {
  const isLeft = position === "top-left";
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        [isLeft ? "left" : "right"]: 0,
        width: 24,
        height: 24,
        borderColor: "#60a5fa",
        borderTopWidth: isLeft || !isLeft ? 2 : 0,
        borderLeftWidth: isLeft ? 2 : 0,
        borderRightWidth: !isLeft ? 2 : 0,
      }}
    />
  );
}