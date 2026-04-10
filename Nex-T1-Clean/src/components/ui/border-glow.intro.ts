import {
  animateValue,
  easeInCubic,
  easeOutCubic,
} from "@/components/ui/border-glow.utils";

type BorderGlowIntroArgs = {
  onAngleChange: (value: number) => void;
  onIntroEnd: () => void;
  onVisibilityChange: (value: number) => void;
};

export function startBorderGlowIntro({
  onAngleChange,
  onIntroEnd,
  onVisibilityChange,
}: BorderGlowIntroArgs): () => void {
  const angleStart = 110;
  const angleEnd = 465;

  onAngleChange(angleStart);

  const animations = [
    animateValue({
      duration: 500,
      onUpdate: (value) => onVisibilityChange(value / 100),
    }),
    animateValue({
      duration: 1500,
      ease: easeInCubic,
      end: 50,
      onUpdate: (value) => {
        onAngleChange((angleEnd - angleStart) * (value / 100) + angleStart);
      },
    }),
    animateValue({
      delay: 1500,
      duration: 2250,
      ease: easeOutCubic,
      start: 50,
      end: 100,
      onUpdate: (value) => {
        onAngleChange((angleEnd - angleStart) * (value / 100) + angleStart);
      },
    }),
    animateValue({
      delay: 2500,
      duration: 1500,
      ease: easeInCubic,
      start: 100,
      end: 0,
      onUpdate: (value) => onVisibilityChange(value / 100),
      onEnd: onIntroEnd,
    }),
  ];

  return () => {
    animations.forEach((animation) => animation.cancel());
    onIntroEnd();
  };
}
