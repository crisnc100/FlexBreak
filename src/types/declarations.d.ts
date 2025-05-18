// Type declarations for modules without typings

declare module '@expo/vector-icons' {
  import { Component } from 'react';
  import { 
    StyleProp, 
    TextStyle, 
    ViewStyle 
  } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  export class Ionicons extends Component<IconProps> {}
  export class MaterialIcons extends Component<IconProps> {}
  export class FontAwesome extends Component<IconProps> {}
  export class FontAwesome5 extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
}

declare module 'expo-linear-gradient' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: readonly string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
  }

  export class LinearGradient extends Component<LinearGradientProps> {}
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy'
  }

  export function impactAsync(style: ImpactFeedbackStyle): Promise<void>;
}

declare module 'expo-constants' {
  const Constants: {
    manifest: any;
    expoVersion: string;
    statusBarHeight: number;
    systemFonts: string[];
    platform: {
      ios?: {
        model: string;
        platform: string;
        systemVersion: string;
      };
      android?: {
        versionCode: number;
      };
    };
  };
  
  export default Constants;
} 