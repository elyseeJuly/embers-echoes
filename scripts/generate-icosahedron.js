import fs from 'fs';

const phi = (1 + Math.sqrt(5)) / 2;
const scale = 155;
const cx = 256;
const cy = 256;

const vertices3D = [
  [-1,  phi, 0],
  [ 1,  phi, 0],
  [-1, -phi, 0],
  [ 1, -phi, 0],
  [ 0, -1,  phi],
  [ 0,  1,  phi],
  [ 0, -1, -phi],
  [ 0,  1, -phi],
  [ phi, 0, -1],
  [ phi, 0,  1],
  [-phi, 0, -1],
  [-phi, 0,  1],
];

const edges = [
  [0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
  [1, 5], [1, 7], [1, 8], [1, 9],
  [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
  [3, 4], [3, 6], [3, 8], [3, 9],
  [4, 5], [4, 9], [4, 11],
  [5, 9], [5, 11],
  [6, 7], [6, 8], [6, 10],
  [7, 8], [7, 10],
  [8, 9],
  [10, 11],
];

function rotateX(point, angle) {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function rotateY(point, angle) {
  const [x, y, z] = point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function project(point) {
  const [x, y, z] = point;
  const perspective = 500;
  const factor = perspective / (perspective + z);
  return [cx + x * scale * factor, cy + y * scale * factor, z];
}

const rotX = -0.25;
const rotY = 0.25;

const projected = vertices3D.map(v => {
  let p = rotateX(v, rotX);
  p = rotateY(p, rotY);
  return project(p);
});

let svgContent = '';

const sortedEdges = [...edges].sort((a, b) => {
  const za = (projected[a[0]][2] + projected[a[1]][2]) / 2;
  const zb = (projected[b[0]][2] + projected[b[1]][2]) / 2;
  return zb - za;
});

sortedEdges.forEach(([i, j], idx) => {
  const [x1, y1, z1] = projected[i];
  const [x2, y2, z2] = projected[j];
  const avgZ = (z1 + z2) / 2;
  const opacity = 0.4 + (1 - avgZ / 200) * 0.5;
  const width = 0.8 + (1 - avgZ / 200) * 0.7;
  svgContent += `    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="url(#wireGrad)" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(2)}"/>\n`;
});

let vertexDots = '';
projected.forEach(([x, y, z], i) => {
  const size = 2.5 + (1 - z / 200) * 2;
  const opacity = 0.5 + (1 - z / 200) * 0.4;
  vertexDots += `    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="#ffd700" opacity="${opacity.toFixed(2)}"/>\n`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd700" stop-opacity="0.95"/>
      <stop offset="20%" stop-color="#ff8c42" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#ff6b35" stop-opacity="0.85"/>
      <stop offset="80%" stop-color="#ff4500" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#cc3300" stop-opacity="0.9"/>
    </linearGradient>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#fff8e7" stop-opacity="1"/>
      <stop offset="10%" stop-color="#ffd700" stop-opacity="0.95"/>
      <stop offset="30%" stop-color="#ff6b35" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="#ff4500" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#8b0000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#ff6b35" stop-opacity="0.18"/>
      <stop offset="50%" stop-color="#ff4500" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="strongGlow">
      <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="512" height="512" fill="#0a0a0f"/>
  <circle cx="256" cy="256" r="225" fill="url(#outerGlow)"/>

  <g filter="url(#strongGlow)" opacity="0.5">
    <circle cx="256" cy="256" r="185" fill="none" stroke="#ff6b35" stroke-width="0.5"/>
  </g>

  <g filter="url(#glow)">
${svgContent}  </g>

  <g transform="translate(256, 256)">
    <circle cx="0" cy="0" r="90" fill="url(#coreGlow)"/>
    
    <g opacity="0.85">
      <path d="M0 -62 Q-18 -50, -15 -31 Q-12 -12, 0 -18 Q12 -12, 15 -31 Q18 -50, 0 -62" 
            fill="#ff6b35"/>
      <path d="M0 -72 Q-23 -58, -18 -36 Q-14 -15, 0 -22 Q14 -15, 18 -36 Q23 -58, 0 -72" 
            fill="none" stroke="#ffd700" stroke-width="0.8" opacity="0.7"/>
      
      <path d="M-14 -40 Q-26 -33, -21 -18 Q-18 -7, -14 -14" 
            fill="#ff4500" opacity="0.78"/>
      <path d="M14 -40 Q26 -33, 21 -18 Q18 -7, 14 -14" 
            fill="#ff4500" opacity="0.78"/>
      
      <circle cx="0" cy="-29" r="6" fill="#fff8e7" opacity="0.95"/>
      <circle cx="0" cy="-29" r="10" fill="#ffd700" opacity="0.4"/>
      
      <path d="M0 -16 Q-11 -10, -8 4 Q-6 16, 0 8 Q6 16, 8 4 Q11 -10, 0 -16" 
            fill="#ff4500" opacity="0.9"/>
      
      <path d="M0 8 Q-15 16, -11 32 Q-7 45, 0 36 Q7 45, 11 32 Q15 16, 0 8" 
            fill="#cc3300" opacity="0.86"/>
      
      <path d="M0 28 Q-11 38, -7 52 Q-5 63, 0 54 Q5 63, 7 52 Q11 38, 0 28" 
            fill="#8b0000" opacity="0.72"/>
    </g>
    
    <g opacity="0.5" filter="url(#glow)">
      <circle cx="-30" cy="-26" r="2.5" fill="#ffa500"/>
      <circle cx="24" cy="-31" r="2" fill="#ff8c42"/>
      <circle cx="-20" cy="-48" r="1.8" fill="#fff8e7"/>
      <circle cx="16" cy="-18" r="1.5" fill="#ff6b35"/>
      <circle cx="-11" cy="-59" r="1.3" fill="#ffa500"/>
      <circle cx="13" cy="-52" r="1.5" fill="#ffd700"/>
      <circle cx="-37" cy="-10" r="1.5" fill="#ff8c42"/>
      <circle cx="32" cy="-12" r="1.8" fill="#ffa500"/>
      <circle cx="-26" cy="10" r="1.4" fill="#ff6b35"/>
      <circle cx="28" cy="8" r="1.6" fill="#ff8c42"/>
    </g>
  </g>

  <g filter="url(#glow)" opacity="0.6">
${vertexDots}  </g>

  <g opacity="0.28" filter="url(#glow)">
    <circle cx="80" cy="75" r="1.8" fill="#ff6b35"/>
    <circle cx="432" cy="92" r="1.4" fill="#ffa500"/>
    <circle cx="58" cy="338" r="1.8" fill="#ff8c42"/>
    <circle cx="454" cy="322" r="1.4" fill="#ff6b35"/>
    <circle cx="95" cy="406" r="1.4" fill="#ffa500"/>
    <circle cx="416" cy="396" r="1.8" fill="#ff8c42"/>
  </g>

  <ellipse cx="256" cy="458" rx="100" ry="6" fill="#ff4500" opacity="0.1"/>
  <ellipse cx="256" cy="466" rx="80" ry="3.5" fill="#ff6b35" opacity="0.07"/>
</svg>`;

fs.writeFileSync('./icons/icon.svg', svg);
console.log('Generated icosahedron SVG icon!');