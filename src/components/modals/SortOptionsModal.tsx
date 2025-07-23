import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export type SortOption = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

interface SortOptionsModalProps {
  visible: boolean;
  currentSort: string;
  onSelectSort: (sortId: string) => void;
  onClose: () => void;
}

const SORT_OPTIONS: SortOption[] = [
  { id: "rating", label: "Top Rated", icon: "star" },
  { id: "distance", label: "Nearest", icon: "location" },
  { id: "price_asc", label: "Price: Low to High", icon: "cash-outline" },
  { id: "price_desc", label: "Price: High to Low", icon: "cash" },
  { id: "review_count", label: "Most Reviewed", icon: "chatbubbles" },
  { id: "name", label: "Alphabetical", icon: "text" },
];

const SortOptionsModal: React.FC<SortOptionsModalProps> = ({
  visible,
  currentSort,
  onSelectSort,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelectSort = (sortId: string) => {
    onSelectSort(sortId);
    setTimeout(onClose, 150); // Small delay for visual feedback
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity activeOpacity={1} onPress={onClose} className="flex-1">
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute inset-0"
        >
          <BlurView intensity={20} style={{ flex: 1 }} tint="dark" />
        </Animated.View>

        <View className="flex-1 justify-end">
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
            }}
            className="bg-white rounded-t-3xl shadow-xl"
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Handle Bar */}
              <View className="items-center py-2">
                <View className="w-12 h-1 bg-gray-300 rounded-full" />
              </View>

              {/* Title */}
              <View className="px-6 pb-2">
                <Text className="text-xl font-bold text-gray-900">Sort By</Text>
              </View>

              {/* Sort Options */}
              <View className="pb-8">
                {SORT_OPTIONS.map((option, index) => {
                  const isSelected = currentSort === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => handleSelectSort(option.id)}
                      className="flex-row items-center px-6 py-4"
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                          isSelected ? "bg-blue-100" : "bg-gray-100"
                        }`}
                      >
                        <Ionicons
                          name={option.icon}
                          size={20}
                          color={isSelected ? "#3B82F6" : "#6B7280"}
                        />
                      </View>
                      <Text
                        className={`flex-1 ml-4 text-base ${
                          isSelected
                            ? "font-semibold text-blue-600"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#3B82F6"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default SortOptionsModal;
