import React, {
  useEffect,
  useRef,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const opacity =
    useRef(
      new Animated.Value(0.55)
    ).current;

  useEffect(() => {
    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.55,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={44} height={50} radius={13} />
      <View style={styles.rowText}>
        <Skeleton width="62%" height={14} />
        <Skeleton width="42%" height={12} />
        <View style={styles.badges}>
          <Skeleton width={58} height={22} radius={7} />
          <Skeleton width={76} height={22} radius={7} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Skeleton width={70} height={22} radius={7} />
        <Skeleton width={82} height={22} radius={7} />
      </View>
      <Skeleton width="68%" height={15} />
      <Skeleton width="48%" height={12} />
    </View>
  );
}

type LoadingDotsProps = {
  label?: string;
};

export function LoadingDots({
  label = "Memuat data",
}: LoadingDotsProps) {
  const dots =
    useRef([
      new Animated.Value(0.35),
      new Animated.Value(0.35),
      new Animated.Value(0.35),
    ]).current;

  useEffect(() => {
    const animations =
      dots.map((dot, index) =>
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(dot, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.35,
            duration: 280,
            useNativeDriver: true,
          }),
        ])
      );
    const animation =
      Animated.loop(
        Animated.stagger(
          90,
          animations
        )
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [dots]);

  return (
    <View style={styles.loadingDotsBox}>
      <Text style={styles.loadingDotsLabel}>
        {label}
      </Text>

      <View style={styles.loadingDots}>
        {dots.map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.loadingDot,
              {
                opacity: dot,
                transform: [
                  {
                    scale: dot.interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [0.8, 1.15],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#E5EAF2",
  },
  row: {
    flexDirection: "row",
    gap: 13,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F8",
  },
  rowText: {
    flex: 1,
    gap: 8,
    paddingTop: 3,
  },
  badges: {
    flexDirection: "row",
    gap: 7,
  },
  card: {
    gap: 10,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E9F2",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  loadingDotsBox: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 3,
  },
  loadingDotsLabel: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2F6BFF",
  },
});
