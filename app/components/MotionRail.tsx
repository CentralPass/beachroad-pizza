type MotionRailProps = {
  items: string[];
  tone?: "coral" | "blue";
  label: string;
};

export function MotionRail({ items, tone = "coral", label }: MotionRailProps) {
  return (
    <div className={`inner-motion-rail inner-motion-rail-${tone}`} aria-label={label}>
      <div className="inner-motion-track">
        {[0, 1].map((group) => (
          <div className="inner-motion-group" aria-hidden={group === 1 ? "true" : undefined} key={group}>
            {items.map((item) => (
              <span key={`${group}-${item}`}>{item}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
