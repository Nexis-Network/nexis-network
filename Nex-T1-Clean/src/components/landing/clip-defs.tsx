"use client";

export function ClipDefs() {
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        <clipPath id="heroFrameClip" clipPathUnits="objectBoundingBox">
          {/* 
            Refined Shape:
            - Top Right Tab: Starts earlier (wider) to hold "Join Now" + Icons.
            - Bottom Left Tab: "Search Bar" protrusion.
            
            Path Walk (Clockwise):
            1. Start Top Left (Rounded Corner) -> 0.03,0
            2. Top Edge -> Go Right until x=0.65 (Tab Start)
               * This makes the top notch/tab wider to the left.
            3. Tab Up/Curve -> The design has the main frame lower, and the tab higher? 
               Wait, usually the "Glass Frame" is the container. 
               The screenshot shows the Top Right tab is PART of the frame, sticking UP? 
               Or is the main frame top at y=0, and there's a cutout?
               Let's assume the Top Line is y=0.08 (Main Header level) and the Tab goes up to y=0.
               
            Revised Walk:
            - Start Top Left (0.03, 0.08)
            - Top Edge (Main): L 0.65, 0.08
            - Tab Rise: Q 0.67, 0.08 0.68, 0.06 -> L 0.70, 0.01 -> Q 0.71, 0 0.73, 0
            - Tab Top: H 0.97
            - Tab Corner: Q 1,0 1,0.03
            - Right Edge: V 0.95
            - Bottom Right Corner: Q 1,1 0.97,1
            - Bottom Edge: H 0.35 (Search Tab End)
            - Search Tab: The search bar is in Bottom Left.
               The frame should EXTEND here? Or Recess?
               Screenshot: "Experience..." pill is in a specific housing.
               Let's assume the Main Bottom Edge is y=0.92, and Search Tab sticks DOWN to y=1.
            - Bottom Edge (continued from Right): H 0.35 -> Q 0.33,0.92 0.32,0.94 -> L 0.30,0.98 -> Q 0.29,1 0.27,1
            - Search Tab Bottom: H 0.03
            - Bottom Left Corner: Q 0,1 0,0.95
            - Left Edge: V 0.08
            - Back to start.
            
            This creates a "Main Rectangle" from y=0.08 to y=0.92.
            Protrusions: Top Right (up to 0), Bottom Left (down to 1).
          */}
          <path d="
            M 0.03,0 
            H 0.132
            Q 0.152,0 0.162,0.02
            L 0.182,0.06
            Q 0.192,0.08 0.212,0.08
            H 0.97
            Q 1,0.08 1,0.11
            V 0.95 
            Q 1,1 0.97,1 
            H 0.35 
            Q 0.33,1 0.32,0.98
            L 0.30,0.94
            Q 0.29,0.92 0.27,0.92
            H 0.03 
            Q 0,0.92 0,0.89 
            V 0.03 
            Q 0,0 0.03,0 
            Z
          " />
        </clipPath>
      </defs>
    </svg>
  );
}
