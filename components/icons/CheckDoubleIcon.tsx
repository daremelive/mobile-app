import * as React from "react";
import Svg, { Path } from "react-native-svg";

export function CheckDoubleIcon(props: {
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
        d="M2 12L7.25 17L14 8M10 17L22 8"
        stroke={props.color || "currentColor"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
} 