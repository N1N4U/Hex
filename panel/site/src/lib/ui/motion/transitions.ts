import { cubicOut, cubicIn } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export function fade(
  node: Element,
  { duration = 200, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t) => `opacity: ${t}`
  };
}

export function slideUp(
  node: Element,
  {
    duration = 200,
    delay = 0,
    distance = 8
  }: { duration?: number; delay?: number; distance?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t, u) => `opacity: ${t}; transform: translateY(${u * distance}px)`
  };
}

export function scaleIn(
  node: Element,
  {
    duration = 200,
    delay = 0,
    start = 0.95
  }: { duration?: number; delay?: number; start?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t) => {
      const scale = start + (1 - start) * t;
      return `opacity: ${t}; transform: scale(${scale})`;
    }
  };
}

export function slideRight(
  node: Element,
  { duration = 300, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t, u) => `transform: translateX(${u * 100}%)`
  };
}

export function slideLeft(
  node: Element,
  { duration = 300, delay = 0 }: { duration?: number; delay?: number } = {}
): TransitionConfig {
  return {
    duration,
    delay,
    easing: cubicOut,
    css: (t, u) => `transform: translateX(${-u * 100}%)`
  };
}
