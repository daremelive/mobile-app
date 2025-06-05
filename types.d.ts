declare module '@hugeicons/react-native' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  // Define the structure of the icon objects from @hugeicons/core-free-icons
  export type IconSvgObject = [string, { [key: string]: string | number }][];

  export interface HugeiconsIconProps extends ViewProps {
    icon: ComponentType<any>;
    size?: number;
    color?: string;
    strokeWidth?: number;
  }

  export const HugeiconsIcon: React.FC<HugeiconsIconProps>;
  
  // Icon components
  export const Home04Icon: ComponentType<any>;
  export const Search01Icon: ComponentType<any>;
  export const MessageCircle01Icon: ComponentType<any>;
  export const User01Icon: ComponentType<any>;
  export const Add01Icon: ComponentType<any>;
}

declare module '@hugeicons/core-free-icons' {
  import { FC } from 'react';
  import { SvgProps } from 'react-native-svg';

  interface IconProps extends SvgProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
  }

  export const Home04Icon: FC<IconProps>;
  export const Search01Icon: FC<IconProps>;
  export const Add01Icon: FC<IconProps>;
  export const Message01Icon: FC<IconProps>;
  export const User02Icon: FC<IconProps>;
  // Add other icons you might use from this package here
} 