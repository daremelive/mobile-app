import * as React from "react";
import Svg, { Path } from "react-native-svg";

export function ArrowLeftIcon(props: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke={props.color || "currentColor"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
} 