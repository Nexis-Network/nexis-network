"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

const PreLoader = () => {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative h-full">
      <AnimatePresence mode="wait">
        {showPreloader && <Preloader_004 />}
      </AnimatePresence>
      <Main />
    </main>
  );
};

const Main = () => {
  return (
    <section className="flex h-full w-screen items-center justify-center bg-background text-foreground">
      Your crazy Landing page
    </section>
  );
};

const Preloader_004 = () => {
  const text = "The first-ever AGI. Period.";
  const words = text.split(" ");

  return (
    <motion.div className="fixed inset-0 z-50">
      {/* Welcome Text */}
      <div className="absolute z-10 flex h-full w-full items-center justify-center text-center text-foreground">
        <motion.h1
          className="text-3xl font-semibold tracking-tighter"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 4 } }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          {words.map((word, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, delay: 0.2 * index }}
              className="mr-2 inline-block"
            >
              {word}
            </motion.span>
          ))}
        </motion.h1>
      </div>

      {/* Stairs Animation */}
      <motion.div className="pointer-events-none fixed left-0 top-0 z-[2] flex h-[50vh]">
        {[...Array(10)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ height: "100%" }}
            animate={{ height: "100%" }}
            exit={{ height: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4 + 0.05 * index,
              ease: [0.455, 0.03, 0.515, 0.955],
            }}
            className="h-full w-[10vw] bg-foreground"
          />
        ))}
      </motion.div>
      <motion.div className="pointer-events-none fixed bottom-0 left-0 z-[2] flex h-[50vh] items-end">
        {[...Array(10)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ height: "100%" }}
            animate={{ height: "100%" }}
            exit={{ height: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.4 + 0.05 * index,
              ease: [0.455, 0.03, 0.515, 0.955],
            }}
            className="h-full w-[10vw] bg-foreground"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export { PreLoader };
