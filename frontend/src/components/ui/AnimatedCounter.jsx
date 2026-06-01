/*
 * AnimatedCounter.jsx
 * A number that animates ("counts up") from 0 to a target value the first time
 * it scrolls into view. Used inside StatCard and other dashboard stats to make
 * the figures feel lively. Props: `value` (target), `duration` (ms), `format`
 * (formatter for the displayed number) and `className` (styling).
 */
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/** Counts up from 0 to `value` when it scrolls into view. */
export default function AnimatedCounter({ value = 0, duration = 1200, format = (n) => n, className = '' }) {
  const ref = useRef(null); // attached to the span so we can detect when it's visible
  // once:true = only animate the first time it appears; margin starts it slightly early
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [display, setDisplay] = useState(0); // the number currently shown on screen

  useEffect(() => {
    if (!inView) return; // wait until the element has scrolled into view
    let raf; // id of the current requestAnimationFrame, so we can cancel it on cleanup
    const start = performance.now(); // timestamp when the animation began
    const target = Number(value) || 0; // make sure we animate toward a real number
    // Runs once per animation frame; `now` is the current timestamp
    const tick = (now) => {
      // progress goes 0 -> 1 over `duration` ms (capped at 1)
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic: fast at first then slows down near the end for a natural feel
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(target * eased);
      // Keep requesting frames until we reach the end, then snap exactly to target
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    // Cleanup: cancel any in-flight frame if value changes or the component unmounts
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    // round so we never display fractional counts, then apply the optional formatter
    <span ref={ref} className={className}>
      {format(Math.round(display))}
    </span>
  );
}
