import React, { ReactNode } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ThemedTextProps {
  children: ReactNode;
  style?: TextStyle | TextStyle[];
  type?: 'primary' | 'secondary' | 'accent' | 'success' | 'error';
  bold?: boolean;
  size?: number;
}

/**
 * A themed text component that automatically applies theme text colors
 * 
 * @param children - React children (text content)
 * @param style - Optional additional styles to apply
 * @param type - Text type (primary, secondary, accent, success, error)
 * @param bold - If true, applies fontWeight: 'bold'
 * @param size - Optional font size
 */
const ThemedText: React.FC<ThemedTextProps> = ({
  children,
  style,
  type = 'primary',
  bold = false,
  size
}) => {
  const { theme } = useTheme();
  
  // Get the appropriate color based on type
  const getColor = () => {
    switch (type) {
      case 'primary':
        return theme.text;
      case 'secondary':
        return theme.textSecondary;
      case 'accent':
        return theme.accent;
      case 'success':
        return theme.success;
      case 'error':
        return theme.error;
      default:
        return theme.text;
    }
  };
  
  return (
    <Text 
      style={[
        {
          color: getColor(),
          fontWeight: bold ? 'bold' : 'normal',
          ...(size ? { fontSize: size } : {})
        },
        Array.isArray(style) ? style : style ? [style] : null
      ]}
    >
      {children}
    </Text>
  );
};

export default ThemedText; 