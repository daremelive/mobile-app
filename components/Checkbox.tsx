import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import CheckIcon from '../assets/icons/check.svg';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange }) => {
  return (
    <TouchableOpacity
      onPress={() => onChange(!checked)}
      className={`w-6 h-6 rounded border ${checked ? 'bg-[#FF0000] border-[#FF0000]' : 'border-[#666]'} justify-center items-center`}
    >
      {checked && <CheckIcon width={16} height={16} fill="#FFFFFF" />}
    </TouchableOpacity>
  );
};

export default Checkbox; 