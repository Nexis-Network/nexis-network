"use client";

/* eslint-disable @next/next/no-img-element */

import clsx from "clsx";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";

type PauseableVideoProps = {
  children: ReactNode;
  width: number;
  height: number;
  poster?: string;
  className?: string;
  videoClassName?: string;
};

const PauseableVideo = forwardRef<HTMLVideoElement | null, PauseableVideoProps>(
  function PauseableVideo({ children, className, videoClassName, width, height, poster }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [videoVisibilityRef, isInView] = useInView({
      triggerOnce: true,
      rootMargin: "0px 0px 400px 0px",
    });
    const { inView, ref: setVideoRef } = useInView({ threshold: 0.1 });

    useEffect(() => {
      setVideoRef(videoRef.current);
    }, [setVideoRef]);

    useEffect(() => {
      if (!videoRef.current) {
        return;
      }

      const videoElement = videoRef.current;

      if (!inView) {
        videoElement.pause();
        return;
      }

      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Error attempting to play video:", error);
        });
      }
    }, [inView]);

    useImperativeHandle<HTMLVideoElement | null, HTMLVideoElement | null>(
      ref,
      () => videoRef.current,
      [],
    );

    return (
      <LazyMotion features={domAnimation}>
        <div className={clsx("relative overflow-hidden", className)} ref={videoVisibilityRef}>
          <img
            className={clsx("relative", videoClassName)}
            src={
              poster ||
              `data:image/svg+xml;charset=utf-8,%3Csvg width='${width}' height='${height}' xmlns='http://www.w3.org/2000/svg' version='1.1'%3E%3C/svg%3E`
            }
            width={width}
            height={height}
            alt=""
            aria-hidden
          />
          <AnimatePresence>
            {isInView && (
              <m.video
                className={clsx("absolute inset-0", videoClassName)}
                ref={videoRef}
                controls={false}
                width={width}
                height={height}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                autoPlay
                loop
                playsInline
                muted
              >
                {children}
              </m.video>
            )}
          </AnimatePresence>
        </div>
      </LazyMotion>
    );
  },
);

export default PauseableVideo;
