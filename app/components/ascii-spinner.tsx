import { useState, useEffect } from "react";

interface AsciiSpinnerProps {
  speed?: number; // milliseconds between frames
}

const frames = ["|", "/", "-", "\\"] as const;

export default function AsciiSpinner({ speed = 100 }: AsciiSpinnerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, speed);

    return () => clearInterval(interval);
  }, [speed]);

  return <span>{frames[currentFrame]}</span>;
}
