'use client';

import * as React from 'react';
import { motion, isMotionComponent, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

type AnyProps = Record<string, UntypedJson>;

type DOMMotionProps = Omit<
  HTMLMotionProps<keyof HTMLElementTagNameMap>,
  'ref' | 'children'
>;

type SlotChildren = HTMLMotionProps<keyof HTMLElementTagNameMap>['children'];

type WithAsChild<Base extends object> =
  | (Base & { asChild: true; children: React.ReactElement })
  | (Base & { asChild?: false | undefined });

type SlotProps = {
  children?: SlotChildren;
} & DOMMotionProps;

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as React.RefObject<T | null>).current = node;
      }
    });
  };
}

function mergeProps(
  childProps: AnyProps,
  slotProps: DOMMotionProps,
): AnyProps {
  const merged: AnyProps = { ...childProps, ...slotProps };

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className as string,
      slotProps.className as string,
    );
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style as React.CSSProperties),
      ...(slotProps.style as React.CSSProperties),
    };
  }

  return merged;
}

type MotionLikeComponent<T extends HTMLElement> = React.ComponentType<
  AnyProps & React.RefAttributes<T>
>;

function SlotComponent<T extends HTMLElement = HTMLElement>(
  { children, ...props }: SlotProps,
  forwardedRef: React.ForwardedRef<T>,
) {
  const childElement = React.isValidElement(children)
    ? (children as React.ReactElement)
    : null;

  const childType = (childElement?.type ?? 'span') as React.ElementType;
  const isAlreadyMotion = Boolean(
    childElement &&
      typeof childType === 'object' &&
      childType !== null &&
      isMotionComponent(childType),
  );

  const Base = React.useMemo<MotionLikeComponent<T>>(
    () =>
      (isAlreadyMotion
        ? childType
        : motion.create(childType)) as MotionLikeComponent<T>,
    [isAlreadyMotion, childType],
  );

  if (!childElement) return null;

  const { ref: childRef, ...childProps } = childElement.props as AnyProps;
  const mergedProps = mergeProps(childProps, props);

  return (
    <Base
      {...mergedProps}
      ref={mergeRefs(childRef as React.Ref<T>, forwardedRef)}
    />
  );
}

const Slot = React.forwardRef(SlotComponent) as <
  T extends HTMLElement = HTMLElement,
>(
  props: SlotProps & React.RefAttributes<T>,
) => React.ReactElement | null;

export {
  Slot,
  type SlotProps,
  type WithAsChild,
  type DOMMotionProps,
  type AnyProps,
};
