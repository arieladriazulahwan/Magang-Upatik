import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";

export type VerificationStepStatus = "pending" | "loading" | "done";

export type VerificationStep = {
  id: string;
  label: string;
  status: VerificationStepStatus;
};

function StepIcon({ status }: { status: VerificationStepStatus }) {
  if (status === "done") {
    return (
      <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
        <Ionicons name="checkmark" size={12} color="white" />
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View className="w-5 h-5 items-center justify-center">
        <ActivityIndicator size="small" color="#60a5fa" />
      </View>
    );
  }

  // pending
  return <View className="w-5 h-5 rounded-full border-2 border-slate-600" />;
}

export default function VerificationChecklist({
  steps,
}: {
  steps: VerificationStep[];
}) {
  return (
    <View className="gap-3">
      {steps.map((step) => (
        <View key={step.id} className="flex-row items-center gap-3">
          <StepIcon status={step.status} />
          <Text
            className={`text-sm ${
              step.status === "pending"
                ? "text-slate-500"
                : "text-white font-medium"
            }`}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
