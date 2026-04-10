let polyconInstanceCounter = 0;

export function generatePolycon(
    seed: string | number,
    size: number = 100,
    circle: boolean = false,
): SVGElement {
    const svgns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgns, "svg");
    svg.setAttributeNS(null, "x", "0");
    svg.setAttributeNS(null, "y", "0");
    svg.setAttributeNS(null, "width", size.toString());
    svg.setAttributeNS(null, "height", size.toString());

    let str = `${seed}`;
    str = str.length < 6 ? str.padEnd(6, " ") : str;

    // SDBM hash algorithm
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    }

    const neutralPairs = [
        ["#FF5C16", "#FCFCFC"],
        ["#FF5C16", "#131416"],
        ["#D075FF", "#FCFCFC"],
        ["#D075FF", "#131416"],
        ["#BAF24A", "#FCFCFC"],
        ["#BAF24A", "#131416"],
        ["#89B0FF", "#FCFCFC"],
        ["#89B0FF", "#131416"],

        ["#FCFCFC", "#FF5C16"],
        ["#131416", "#FF5C16"],
        ["#FCFCFC", "#D075FF"],
        ["#131416", "#D075FF"],
        ["#FCFCFC", "#BAF24A"],
        ["#131416", "#BAF24A"],
        ["#FCFCFC", "#89B0FF"],
        ["#131416", "#89B0FF"],
    ];

    const tonalPairs = [
        ["#FFA680", "#FF5C16"],
        ["#661800", "#FF5C16"],
        ["#EAC2FF", "#D075FF"],
        ["#3D065F", "#D075FF"],
        ["#E5FFC3", "#BAF24A"],
        ["#013330", "#BAF24A"],
        ["#CCE7FF", "#89B0FF"],
        ["#190066", "#89B0FF"],

        ["#FF5C16", "#FFA680"],
        ["#FF5C16", "#661800"],
        ["#D075FF", "#EAC2FF"],
        ["#D075FF", "#3D065F"],
        ["#BAF24A", "#E5FFC3"],
        ["#BAF24A", "#013330"],
        ["#89B0FF", "#CCE7FF"],
        ["#89B0FF", "#190066"],

        ["#661800", "#FFA680"],
        ["#FFA680", "#661800"],
        ["#3D065F", "#EAC2FF"],
        ["#EAC2FF", "#3D065F"],
        ["#013330", "#E5FFC3"],
        ["#E5FFC3", "#013330"],
        ["#190066", "#CCE7FF"],
        ["#CCE7FF", "#190066"],
    ];

    const complementaryPairs = [
        ["#EAC2FF", "#013330"],
        ["#013330", "#EAC2FF"],

        ["#CCE7FF", "#661800"],
        ["#661800", "#CCE7FF"],

        ["#E5FFC3", "#3D065F"],
        ["#3D065F", "#E5FFC3"],

        ["#FFA680", "#190066"],
        ["#190066", "#FFA680"],

        ["#CCE7FF", "#013330"],
        ["#013330", "#CCE7FF"],
    ];

    // Color pairs
    const colorPairs = neutralPairs.concat(tonalPairs).concat(
        complementaryPairs,
    );

    // Select colors based on hash
    const colorPairIndex = Math.abs(hash) % colorPairs.length;
    const [bgColor, fgColor] = colorPairs[colorPairIndex];

    // SVG setup
    const grid = 2;
    const margin = size * 0.25; // 25% margin
    const innerSize = size - (2 * margin);
    const cellSize = innerSize / grid;

    svg.setAttributeNS(null, "viewBox", `0 0 ${size} ${size}`);
    svg.style.backgroundColor = bgColor;

    // Create single path element for all shapes
    const path = document.createElementNS(svgns, "path");
    path.setAttribute("fill", fgColor);
    let pathData = "";

    // Create grid to track filled cells
    const filledGrid = Array(grid).fill(null).map(() =>
        Array(grid).fill(false)
    );

    // Start from center to ensure connectivity
    const startX = Math.floor(grid / 2);
    const startY = Math.floor(grid / 2);
    const stack = [[startX, startY]];
    if (filledGrid[startX] && filledGrid[startX][startY] !== undefined) {
        filledGrid[startX][startY] = true;
    }

    while (stack.length > 0) {
        const coords = stack.pop();
        if (!coords) break;
        const [x, y] = coords;
        const cellHash = Math.abs(hash >> (x * 3 + y * 5)) & 15;

        // Get available neighbors
        const neighbors = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            if (
                newX >= 0 && newX < grid && newY >= 0 && newY < grid &&
                !filledGrid[newX][newY]
            ) {
                neighbors.push([newX, newY]);
            }
        }

        // Add random unvisited neighbors to stack
        while (neighbors.length > 0) {
            const idx = Math.abs(cellHash + neighbors.length) %
                neighbors.length;
            const [nextX, nextY] = neighbors.splice(idx, 1)[0];
            stack.push([nextX, nextY]);
            filledGrid[nextX][nextY] = true;
        }

        // Draw shape
        const rotation = (cellHash % 4) * 90; // 0, 90, 180, or 270 degrees
        const isSquare = cellHash % 5 === 0; // 20% chance of square

        // Adjust coordinates to include margin
        const cx = margin + (x * cellSize);
        const cy = margin + (y * cellSize);

        if (isSquare) {
            // Square
            pathData +=
                `M${cx},${cy} h${cellSize} v${cellSize} h-${cellSize}z `;
        } else {
            // Right triangle with rotation
            if (rotation === 0) {
                pathData += `M${cx},${cy} h${cellSize} v${cellSize}z `;
            } else if (rotation === 90) {
                pathData += `M${
                    cx + cellSize
                },${cy} v${cellSize} h-${cellSize}z `;
            } else if (rotation === 180) {
                pathData += `M${cx + cellSize},${
                    cy + cellSize
                } h-${cellSize} v-${cellSize}z `;
            } else { // 270
                pathData += `M${cx},${
                    cy + cellSize
                } v-${cellSize} h${cellSize}z `;
            }
        }
    }

    path.setAttribute("d", pathData);
    svg.appendChild(path);

    if (circle) {
        const clipId = `circle-clip-${Math.abs(hash)}-${polyconInstanceCounter++}`;
        const clipPath = document.createElementNS(svgns, "clipPath");
        clipPath.setAttribute("id", clipId);
        const circleClip = document.createElementNS(svgns, "circle");
        circleClip.setAttribute("cx", String(size / 2));
        circleClip.setAttribute("cy", String(size / 2));
        circleClip.setAttribute("r", String(size / 2));
        clipPath.appendChild(circleClip);
        svg.appendChild(clipPath);
        svg.setAttribute("clip-path", `url(#${clipId})`);
    }
    return svg;
}
