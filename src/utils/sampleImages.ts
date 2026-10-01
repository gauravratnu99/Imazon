/**
 * Generates hermetic, realistic test image files (JPG, PNG, SVG) for immediate one-click testing.
 */

// 1. Generate an uncompressed high-resolution photo-style JPEG (landscape scene with gradients and detail)
async function generateSampleJpeg(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;

  // Sunset sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 700);
  skyGrad.addColorStop(0, '#1e1b4b');
  skyGrad.addColorStop(0.3, '#4c1d95');
  skyGrad.addColorStop(0.6, '#be185d');
  skyGrad.addColorStop(0.85, '#f97316');
  skyGrad.addColorStop(1, '#fde047');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1920, 1080);

  // Glowing sun
  const sunGrad = ctx.createRadialGradient(960, 650, 20, 960, 650, 260);
  sunGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  sunGrad.addColorStop(0.2, 'rgba(254, 240, 138, 0.9)');
  sunGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.4)');
  sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(960, 650, 260, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountain ranges
  const drawMountains = (yOffset: number, color: string, roughness: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 1080);
    ctx.lineTo(0, yOffset);
    for (let x = 0; x <= 1920; x += 30) {
      const y = yOffset + Math.sin(x * 0.005) * 120 + Math.cos(x * 0.015) * 60 + (Math.sin(x * 0.03) * roughness);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(1920, 1080);
    ctx.closePath();
    ctx.fill();
  };

  drawMountains(550, 'rgba(76, 29, 149, 0.6)', 30);
  drawMountains(680, 'rgba(49, 46, 129, 0.85)', 40);
  drawMountains(820, '#0f172a', 20);

  // Fine textured noise to create realistic compression data weight
  const imgData = ctx.getImageData(0, 0, 1920, 1080);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 8) {
    const noise = (Math.random() - 0.5) * 18;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Water reflections at the bottom
  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
  ctx.fillRect(0, 920, 1920, 160);

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.98));
  return new File([blob], 'sunset-mountain-view.jpg', { type: 'image/jpeg' });
}

// 2. Generate a high-res Graphic PNG with transparency
async function generateSamplePng(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  // Clear transparent
  ctx.clearRect(0, 0, 1200, 1200);

  // Central geometric badge
  const grad = ctx.createLinearGradient(200, 200, 1000, 1000);
  grad.addColorStop(0, '#ec4899');
  grad.addColorStop(0.5, '#8b5cf6');
  grad.addColorStop(1, '#3b82f6');

  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;

  // Rounded rectangle
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(250, 250, 700, 700, 140);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Inner rings and abstract patterns
  for (let r = 80; r < 280; r += 35) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (r / 500)})`;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(600, 600, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Modern typography
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 68px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IMAZON', 600, 580);

  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText('VECTOR & GRAPHICS SUITE', 600, 640);

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  return new File([blob], 'imazon-app-badge.png', { type: 'image/png' });
}

// 3. Generate a verbose SVG vector with redundant metadata and comments
function generateSampleSvg(): File {
  const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Generator: Adobe Illustrator 28.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0 -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="800.000000px" height="800.000000px" viewBox="0 0 800.000000 800.000000" version="1.1">
  <metadata id="metadata12938">
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <cc:Work xmlns:cc="http://creativecommons.org/ns#" rdf:about="">
        <dc:format xmlns:dc="http://purl.org/dc/elements/1.1/">image/svg+xml</dc:format>
        <dc:type xmlns:dc="http://purl.org/dc/elements/1.1/" rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Vector Illustration Sample</dc:title>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <defs id="defs4">
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0.000000%" style="stop-color:#ff0055;stop-opacity:1.000000" />
      <stop offset="50.000000%" style="stop-color:#7928ca;stop-opacity:1.000000" />
      <stop offset="100.000000%" style="stop-color:#0070f3;stop-opacity:1.000000" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="15" stdDeviation="25" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Main shape group -->
  <g id="layer1" inkscape:label="Layer 1" inkscape:groupmode="layer">
    <rect id="bg" x="50.123456" y="50.654321" width="699.876543" height="699.345678" rx="72.500000" fill="url(#grad1)" filter="url(#shadow)" />
    <!-- Nested graphic details -->
    <g id="innerGroup" sodipodi:insensitive="true">
      <circle cx="400.123456" cy="400.987654" r="180.543210" fill="#ffffff" fill-opacity="0.2" />
      <polygon points="400.000000,240.123456 520.456789,480.987654 280.543210,480.987654" fill="#ffffff" />
      <circle cx="400.000000" cy="380.000000" r="45.123456" fill="#ff0055" />
    </g>
    <!-- Empty tag test for cleaning -->
    <g id="emptyGroup1"></g>
    <g id="emptyGroup2"></g>
  </g>
</svg>`;

  return new File([svgContent], 'geometric-vector-emblem.svg', { type: 'image/svg+xml' });
}

// 4. Generate a Photo of Nature/Architecture
async function generateSamplePhoto2(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  // Architectural modern facade pattern
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1600, 1200);

  // Glass grid panels
  for (let x = 60; x < 1540; x += 110) {
    for (let y = 60; y < 1140; y += 90) {
      const hue = 190 + (x / 1600) * 40;
      const light = 20 + ((x + y) % 30);
      ctx.fillStyle = `hsl(${hue}, 45%, ${light}%)`;
      ctx.fillRect(x, y, 95, 75);

      // Reflection streak
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 40, y);
      ctx.lineTo(x + 95, y + 75);
      ctx.lineTo(x + 55, y + 75);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Warm interior lights behind some windows
  ctx.fillStyle = '#f59e0b';
  for (let i = 0; i < 24; i++) {
    const rx = 60 + (i * 137 % 13) * 110;
    const ry = 60 + (i * 89 % 11) * 90;
    ctx.fillRect(rx + 5, ry + 5, 85, 65);
  }

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.96));
  return new File([blob], 'modern-facade-architecture.jpg', { type: 'image/jpeg' });
}

export async function getSampleFiles(): Promise<File[]> {
  const [f1, f2, f3, f4] = await Promise.all([
    generateSampleJpeg(),
    generateSamplePng(),
    generateSampleSvg(),
    generateSamplePhoto2(),
  ]);
  return [f1, f2, f3, f4];
}
