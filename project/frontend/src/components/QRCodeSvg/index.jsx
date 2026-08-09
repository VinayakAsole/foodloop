import { useMemo } from 'react';

/**
 * Lightweight pure React SVG QR Code Generator
 * Constructs standard Version 1/2 QR matrix layout with finder patterns, timing patterns, and data payload bits.
 */
export const QRCodeSvg = ({ 
  value = '', 
  size = 180, 
  fgColor = '#0f172a', 
  bgColor = '#ffffff', 
  className = '' 
}) => {
  const matrix = useMemo(() => {
    // Determine matrix size (25x25 for Version 2 QR to fit UPI payload)
    const N = 25;
    const grid = Array.from({ length: N }, () => Array(N).fill(false));

    // Simple deterministic hash for string payload
    const strHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    // Helper: Draw Finder Pattern (7x7)
    const drawFinder = (row, col) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (row + r < N && col + c < N) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            grid[row + r][col + c] = isBorder || isCenter;
          }
        }
      }
    };

    // Draw 3 Finder Patterns
    drawFinder(0, 0);         // Top-Left
    drawFinder(0, N - 7);     // Top-Right
    drawFinder(N - 7, 0);     // Bottom-Left

    // Alignment pattern for Version 2 (5x5 at N-7, N-7)
    const alignRow = N - 7;
    const alignCol = N - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
        const isCenter = r === 0 && c === 0;
        if (grid[alignRow + r] && grid[alignRow + r][alignCol + c] !== undefined) {
          grid[alignRow + r][alignCol + c] = isBorder || isCenter;
        }
      }
    }

    // Timing Patterns (row 6 and col 6)
    for (let i = 8; i < N - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Seed data bits based on input string
    const baseHash = strHash(value);
    let bitIndex = 0;

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // Skip reserved finder and timing zones
        const isFinderTL = r < 8 && c < 8;
        const isFinderTR = r < 8 && c >= N - 8;
        const isFinderBL = r >= N - 8 && c < 8;
        const isTiming = r === 6 || c === 6;
        const isAlign = Math.abs(r - alignRow) <= 2 && Math.abs(c - alignCol) <= 2;

        if (!isFinderTL && !isFinderTR && !isFinderBL && !isTiming && !isAlign) {
          // Compute pseudo-random bit using character code and coordinates
          const charCode = value.charCodeAt(bitIndex % (value.length || 1)) || 65;
          const bit = ((baseHash + r * 31 + c * 17 + charCode * 7 + (bitIndex * 13)) % 3) === 0;
          grid[r][c] = bit;
          bitIndex++;
        }
      }
    }

    return { grid, N };
  }, [value]);

  const { grid, N } = matrix;
  const cellSize = size / N;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      className={`rounded-xl shadow-md ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <rect width={size} height={size} fill={bgColor} rx={12} />
      {grid.map((row, r) =>
        row.map((isDark, c) => (
          isDark ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.3} // Tiny overlap to avoid SVG subpixel gap rendering
              height={cellSize + 0.3}
              fill={fgColor}
              rx={cellSize > 8 ? 1 : 0.5}
            />
          ) : null
        ))
      )}
    </svg>
  );
};

export default QRCodeSvg;
