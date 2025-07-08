import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onFocus?: () => void;
  style?: any;
  navigateToSearch?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search for handyman",
  value,
  onChangeText,
  onSubmit,
  onFocus,
  style,
  navigateToSearch = false,
}) => {
  const navigation = useNavigation();
  const [localValue, setLocalValue] = useState(value || "");

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    onChangeText?.(text);
  };

  const handleSubmit = () => {
    onSubmit?.(localValue);
  };

  const handleFocus = () => {
    if (navigateToSearch) {
      navigation.navigate('Search' as never, { initialQuery: localValue } as never);
    } else {
      onFocus?.();
    }
  };

  const handlePress = () => {
    if (navigateToSearch) {
      navigation.navigate('Search' as never, { initialQuery: localValue } as never);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.searchInputContainer} 
        onPress={handlePress}
        activeOpacity={navigateToSearch ? 0.7 : 1}
      >
        <View style={styles.searchIcon}>
          <Ionicons name="search" size={20} color="#dc2626" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={localValue}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={handleFocus}
          returnKeyType="search"
          editable={!navigateToSearch}
          pointerEvents={navigateToSearch ? "none" : "auto"}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
});

export default SearchBar;
