import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import EyeOffIcon from '../assets/icons/eye-off.svg';
import EyeIcon from '../assets/icons/eye.svg';
import PasswordUpdateSuccessModal from '../components/modals/PasswordUpdateSuccessModal';

interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}

const PasswordInput = ({ label, value, onChangeText }: PasswordInputProps) => {
  const [isSecure, setSecure] = useState(true);
  return (
    <View className="mb-6">
      <Text className="text-white text-sm mb-2">{label}</Text>
      <View className="flex-row items-center bg-[#1A1A1A] rounded-full border border-[#2A2A2A] px-4">
        <TextInput
          className="flex-1 text-white py-3 text-base"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
        />
        <TouchableOpacity onPress={() => setSecure(!isSecure)}>
          {isSecure ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EditPasswordScreen = () => {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);

  const handleSave = () => {
    // Add password validation logic here
    setModalVisible(true);
  };

  const handleDone = () => {
    setModalVisible(false);
    router.replace('/signin');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24} />
          </View>
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-semibold">Edit Password</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text className="text-[#C42720] text-lg font-semibold">Save</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-8">
        <PasswordInput label="New Password" value={newPassword} onChangeText={setNewPassword} />
        <PasswordInput label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} />
      </View>
      <PasswordUpdateSuccessModal
        visible={isModalVisible}
        onDone={handleDone}
      />
    </SafeAreaView>
  );
};

export default EditPasswordScreen; 