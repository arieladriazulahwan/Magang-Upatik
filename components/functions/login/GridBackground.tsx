import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

const GRID_SIZE = 32;

export default function GridBackground() {
  return (
    <Svg style={{ position: "absolute", width: "100%", height: "100%" }}>
      <Defs>
        <Pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <Path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}