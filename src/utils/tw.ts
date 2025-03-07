import { StyleSheet } from 'react-native';

// Define our theme colors
const colors = {
  primary: '#4CAF50',
  accent: '#FF9800',
  text: '#333333',
  muted: '#666666',
  bg: '#F9F9F9',
  white: '#FFFFFF',
  gray: {
    100: '#F5F5F5',
    200: '#E0E0E0',
    500: '#9E9E9E',
  },
};

// Create a simplified styles object that mimics the tailwind classes we're using
const styles = StyleSheet.create({
  // Layout
  'flex-1': { flex: 1 },
  'flex-row': { flexDirection: 'row' },
  'items-center': { alignItems: 'center' },
  'justify-center': { justifyContent: 'center' },
  'justify-between': { justifyContent: 'space-between' },

  // Spacing
  'p-2': { padding: 8 },
  'p-3': { padding: 12 },
  'p-4': { padding: 16 },
  'mb-1': { marginBottom: 4 },
  'mb-2': { marginBottom: 8 },
  'mb-3': { marginBottom: 12 },
  'mb-4': { marginBottom: 16 },
  'mb-5': { marginBottom: 20 },
  'mt-2': { marginTop: 8 },
  'mt-3': { marginTop: 12 },
  'mr-2': { marginRight: 8 },

  // Typography
  'text-xs': { fontSize: 12 },
  'text-sm': { fontSize: 14 },
  'text-base': { fontSize: 16 },
  'text-lg': { fontSize: 18 },
  'text-2xl': { fontSize: 24 },
  'font-bold': { fontWeight: 'bold' },
  'font-semibold': { fontWeight: '600' },
  'text-center': { textAlign: 'center' },
  'italic': { fontStyle: 'italic' },

  // Colors
  'text-text': { color: colors.text },
  'text-muted': { color: colors.muted },
  'text-white': { color: colors.white },
  'text-gray-500': { color: colors.gray[500] },
  'bg-primary': { backgroundColor: colors.primary },
  'bg-accent': { backgroundColor: colors.accent },
  'bg-bg': { backgroundColor: colors.bg },
  'bg-white': { backgroundColor: colors.white },
  'bg-gray-100': { backgroundColor: colors.gray[100] },
  'bg-gray-200': { backgroundColor: colors.gray[200] },

  // Borders
  'rounded': { borderRadius: 4 },
  'rounded-lg': { borderRadius: 8 },
  'border': { borderWidth: 1 },
  'border-primary': { borderColor: colors.primary },
  'border-gray-200': { borderColor: colors.gray[200] },

  // Dimensions
  'h-12': { height: 48 },
  'w-full': { width: '100%' },

  // Opacity
  'opacity-50': { opacity: 0.5 },

  // Shadow
  'shadow-md': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});

// Function to combine multiple style objects
export const tw = (styleString: string) => {
  const classNames = styleString.split(' ');
  return classNames.reduce((acc, className) => {
    // @ts-ignore - We know these styles exist
    if (styles[className]) {
      // @ts-ignore
      return { ...acc, ...styles[className] };
    }
    return acc;
  }, {});
}; 