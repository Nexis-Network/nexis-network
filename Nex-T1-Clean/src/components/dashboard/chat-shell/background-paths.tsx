"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Straight line paths for the intro animation (left, right, top edges going back to front)
const introLinePaths = [
  // Left vertical lines (going from top to bottom - "back to front")
  { d: "M35.2067 -73.2891V754.518", delay: 0 },
  { d: "M67.7409 -54.5305V734.816", delay: 0.05 },
  { d: "M99.5719 -36.1774V715.534", delay: 0.1 },
  { d: "M128.676 -19.3965V697.907", delay: 0.15 },
  // Right vertical lines (going from top to bottom)
  { d: "M1410.66 -71.8803V754.518", delay: 0 },
  { d: "M1378.12 -53.4461V734.816", delay: 0.05 },
  { d: "M1346.29 -36.1774V715.534", delay: 0.1 },
  { d: "M1317.19 -18.4748V697.907", delay: 0.15 },
  // Top horizontal lines (going from left to right - "back to front")
  { d: "M183.039 11.9481H1262.83", delay: 0 },
  { d: "M208.339 26.5352H1237.5", delay: 0.05 },
  { d: "M231.833 40.0816H1214.03", delay: 0.1 },
  { d: "M253.931 52.823L1191.93 52.8231", delay: 0.15 },
  { d: "M274.196 64.6725L1171.67 64.5081", delay: 0.2 },
  { d: "M292.667 75.1575H1153.2", delay: 0.25 },
  { d: "M309.737 84.9998L1136.1 85.012", delay: 0.3 },
];

export const BackgroundPaths = function BackgroundPaths() {
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    // After all intro animations complete, switch to the looping animation
    const timer = setTimeout(() => {
      setIntroComplete(true);
    }, 800); // 800ms for intro animation to complete
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
      <svg
        width="101%"
        height="100%"
        viewBox="0 0 1444 772"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-[101%] h-full absolute left-1/2 -translate-x-1/2"
      >
        {/* Base static grid */}
        <path
          d="M326.808 94.8427V127.047M326.808 94.8427L309.737 84.9998M326.808 94.8427H392.633M326.808 127.047V174.166M326.808 127.047L0.505634 -29.9058M309.737 84.9998V588.243M309.737 84.9998L1136.1 85.012M309.737 84.9998L292.667 75.1575M392.633 94.8427L261.454 -3.02248M392.633 94.8427H455.166M0.505634 697.568L326.808 539.937M326.808 539.937V577.904L309.737 588.243M326.808 539.937V498.58M309.737 588.243L292.667 598.582M326.808 498.58L0.505634 627.397M326.808 498.58V456.884M326.808 456.884L0.505634 555.531M326.808 456.884V415.528M326.808 415.528L0.505634 476.207M326.808 415.528V377.9M326.808 377.9L0.505634 408.07M326.808 377.9V336.204M326.808 336.204H0.505634M326.808 336.204V294.508M326.808 294.508L0.505634 264.338M326.808 294.508V256.88M326.808 256.88L0.505634 196.54M326.808 256.88V215.862M326.808 215.862L0.505634 116.877M326.808 215.862V174.166M326.808 174.166L0.505634 45.3501M35.2067 754.518L0.505634 775.535V-93.297L183.039 11.9481M35.2067 754.518V-73.2891M35.2067 754.518L67.7409 734.816M183.039 11.9481L183.526 664.686M183.039 11.9481L208.339 26.5352M183.039 11.9481H1262.83M67.7409 734.816V-54.5305M67.7409 734.816L99.5719 715.534M99.5719 715.534V-36.1774M99.5719 715.534L128.676 697.907M128.676 697.907V-19.3965M128.676 697.907L157.074 680.706M157.074 680.706V-3.02248H261.454M157.074 680.706L183.526 664.686M261.454 -3.02248H353.138M183.526 664.686L208.324 649.666M208.324 649.666L231.833 635.428M208.324 649.666L208.339 26.5352M231.833 635.428L253.931 622.043M231.833 635.428V40.0816M208.339 26.5352H1237.5L1237.54 649.666M208.339 26.5352L231.833 40.0816M253.931 622.043L274.196 609.769M253.931 622.043V52.823M231.833 40.0816L253.931 52.823M231.833 40.0816H1214.03M274.196 609.769L292.667 598.582M274.196 609.769V64.6725L1171.67 64.5081M253.931 52.823L292.667 75.1575M253.931 52.823L1191.93 52.8231M292.667 598.582V75.1575M1171.67 64.5081V609.769M1171.67 64.5081L1153.2 75.1575M1171.67 64.5081L1191.93 52.8231M292.667 75.1575H1153.2M1119.06 94.8427V127.047M1119.06 94.8427L1136.1 85.012M1119.06 94.8427H1051.35M1119.06 127.047V174.166M1119.06 127.047L1445.36 -29.9058M1136.1 85.012L1136.12 588.243M1136.1 85.012L1153.2 75.1575M1051.35 94.8427H988.817M1051.35 94.8427L1182.44 -3.02245M1445.36 697.568L1119.06 539.937M1119.06 539.937V577.904L1136.12 588.243M1119.06 539.937V498.58M1136.12 588.243L1153.2 598.582M1119.06 498.58L1445.36 627.397M1119.06 498.58V456.884M1119.06 456.884L1445.36 555.531M1119.06 456.884V415.528M1119.06 415.528L1445.36 476.207M1119.06 415.528V377.9M1119.06 377.9L1445.36 408.07M1119.06 377.9V336.204M1119.06 336.204H1445.36M1119.06 336.204V294.508M1119.06 294.508L1445.36 264.338M1119.06 294.508V256.88M1119.06 256.88L1445.36 196.54M1119.06 256.88V215.862M1119.06 215.862L1445.36 116.877M1119.06 215.862V174.166M1119.06 174.166L1445.36 45.3501M1410.66 754.518L1445.36 775.535V-93.297L1288.79 -3.02244M1410.66 754.518V-71.8803M1410.66 754.518L1378.12 734.816M1288.79 -3.02244V680.706M1288.79 -3.02244L1262.83 11.9481M1288.79 -3.02244L1182.44 -3.02245M1378.12 734.816L1376.24 -53.4461M1378.12 734.816L1346.29 715.534M1346.29 715.534V-36.1774M1346.29 715.534L1317.19 697.907M1317.19 697.907L1315.59 -18.4748M1317.19 697.907L1288.79 680.706M1288.79 680.706L1262.34 664.686M1262.34 664.686L1237.54 649.666M1262.34 664.686L1262.83 11.9481M1237.54 649.666L1214.03 635.428M1262.83 11.9481L1214.03 40.0816M1214.03 635.428L1191.93 622.043M1214.03 635.428V40.0816M1191.93 622.043L1171.67 609.769M1191.93 622.043V52.8231M1214.03 40.0816L1191.93 52.8231M1171.67 609.769L1153.2 598.582M1153.2 598.582V75.1575M1182.44 -3.02245H1090.69M455.166 94.8427L353.138 -3.02248M455.166 94.8427H511.117M353.138 -3.02248H428.366M511.117 94.8427L428.366 -3.02248M511.117 94.8427H567.539M428.366 -3.02248H503.746M567.539 94.8427L503.746 -3.02248M567.539 94.8427H623.49M503.746 -3.02248H580.372M623.49 94.8427L580.372 -3.02248M623.49 94.8427H675.209M580.372 -3.02248H652.484M675.209 94.8427L652.484 -3.02248M675.209 94.8427H721.757M652.484 -3.02248H721.757M721.757 94.8427V-3.02248M721.757 94.8427H768.774M721.757 -3.02248H791.24M768.774 94.8427L791.24 -3.02248M768.774 94.8427H820.024M791.24 -3.02248L863.28 -3.02247M820.024 94.8427L863.28 -3.02247M820.024 94.8427H876.445M863.28 -3.02247L940.011 -3.02246M876.445 94.8427L940.011 -3.02246M876.445 94.8427H932.866M940.011 -3.02246H1015.4M932.866 94.8427L1015.4 -3.02246M932.866 94.8427H988.817M1015.4 -3.02246L1090.69 -3.02245M988.817 94.8427L1090.69 -3.02245"
          strokeOpacity="0.1"
          strokeWidth="0.767712"
          className="stroke-neutral-900 dark:stroke-[#E4E4E4]"
        />

        {/* Intro one-time animation: straight lines rushing from back to front towards the viewer */}
        {!introComplete &&
          introLinePaths.map((line, index) => (
            <motion.path
              key={`intro-${index}`}
              d={line.d}
              stroke="url(#intro_gradient)"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              style={{
                transformOrigin: "center center",
                transformBox: "fill-box",
              }}
              initial={{ 
                scale: 1, 
                opacity: 0,
                filter: "blur(0px)",
              }}
              animate={{ 
                scale: 0.1, 
                opacity: [0, 1, 0.9, 0],
                filter: "blur(4px)",
              }}
              transition={{
                scale: { duration: 0.35, delay: line.delay, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.5, delay: line.delay, times: [0, 0.2, 0.6, 1] },
                filter: { duration: 0.35, delay: line.delay, ease: "easeOut" },
              }}
            />
          ))}

        {/* Looping blue line animations - only shown after intro completes */}
        {introComplete && (
          <>
            <motion.path
              d="M455.166 94.8427L397.805 39.9262L319.285 40.2652L261.924 -2.78654"
              stroke="url(#paint0_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M675.21 94.8427L668.234 64.6726H610.189H547.791L503.456 -3.46452"
              stroke="url(#paint1_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.05 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M721.757 94.8427V40.094H781.283L791.343 -3.46452"
              stroke="url(#paint2_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.1 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M932.866 94.8427L958.256 64.6725H1020.32L1090.85 -3.12553"
              stroke="url(#paint3_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.15 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M1119.06 127.047L1237.54 70.0964V127.386L1443.48 46.0281"
              stroke="url(#paint4_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.2 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M1119.06 215.862L1443.01 117.555"
              stroke="url(#paint5_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.25 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M1118.59 294.542L1171.72 289.633V247.144L1443.48 196.879"
              stroke="url(#paint6_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.3 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M1119.06 415.528L1262.46 442.308V500.275L1443.01 554.853"
              stroke="url(#paint7_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.35 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M326.808 415.528L208.324 437.562V492.689L0.505634 555.531"
              stroke="url(#paint8_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.4 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M328.219 336.204H208.324V283.66L0.0354576 264.338"
              stroke="url(#paint9_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.45 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
            <motion.path
              d="M326.808 215.862L292.673 205.489L292.956 160.81L0.505634 45.3501"
              stroke="url(#paint10_linear_22_3214)"
              strokeWidth="0.767712"
              strokeDasharray="38.39 76.77"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, strokeDashoffset: [0, -115.16] }}
              transition={{ 
                opacity: { duration: 0.5, delay: 0.5 },
                strokeDashoffset: { duration: 4.5, repeat: Infinity, ease: "linear" }
              }}
            />
          </>
        )}
        <defs>
          {/* Intro animation gradient - enhanced with richer, more vibrant colors */}
          <linearGradient
            id="intro_gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#6366F1" stopOpacity="0" />
            <stop offset="0.15" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="0.35" stopColor="#00D4FF" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="0.65" stopColor="#00D4FF" stopOpacity="0.9" />
            <stop offset="0.85" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="1" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="paint0_linear_22_3214"
            x1="261.924"
            y1="-2.78654"
            x2="19586.2"
            y2="-2.78654"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_22_3214"
            x1="503.456"
            y1="-3.46452"
            x2="17678.9"
            y2="-3.46452"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint2_linear_22_3214"
            x1="721.757"
            y1="-3.46452"
            x2="7680.37"
            y2="-3.46452"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint3_linear_22_3214"
            x1="932.866"
            y1="-3.12553"
            x2="16730.8"
            y2="-3.12553"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint4_linear_22_3214"
            x1="1119.06"
            y1="46.0281"
            x2="33561.2"
            y2="46.0281"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint5_linear_22_3214"
            x1="1119.06"
            y1="117.555"
            x2="33514.2"
            y2="117.555"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint6_linear_22_3214"
            x1="1118.59"
            y1="196.879"
            x2="33607.8"
            y2="196.879"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint7_linear_22_3214"
            x1="1119.06"
            y1="415.528"
            x2="33514.2"
            y2="415.528"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint8_linear_22_3214"
            x1="0.505634"
            y1="415.528"
            x2="32630.8"
            y2="415.528"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint9_linear_22_3214"
            x1="0.0354576"
            y1="264.338"
            x2="32818.4"
            y2="264.338"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
          <linearGradient
            id="paint10_linear_22_3214"
            x1="0.505634"
            y1="45.3501"
            x2="32630.8"
            y2="45.3501"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#009DFF" stopOpacity="0.27" />
            <stop
              offset="0.576923"
              stopColor="#00BBFF"
              stopOpacity="0.56"
            />
            <stop offset="1" stopColor="white" stopOpacity="0.39" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
