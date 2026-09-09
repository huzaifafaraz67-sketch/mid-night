import * as THREE from 'three';

export function createNoiseOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number,
  size = 1
) {
  for (let i = 0; i < (w * h) / (size * size) / 2; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(Math.random() * alpha).toFixed(3)})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

export function createCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  repX = 1,
  repY = 1
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    draw(ctx, w, h);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX,repY);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function generateNormalMapFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  strength = 1.5
): THREE.CanvasTexture {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = w;
  normalCanvas.height = h;
  const srcCtx = sourceCanvas.getContext('2d');
  const dstCtx = normalCanvas.getContext('2d');
  if (!srcCtx || !dstCtx) {
    return new THREE.CanvasTexture(normalCanvas);
  }

  const srcData = srcCtx.getImageData(0, 0, w, h);
  const dstData = dstCtx.createImageData(w, h);
  const src = srcData.data;
  const dst = dstData.data;

  const getLuma = (x: number, y: number) => {
    const px = ((x + w) % w);
    const py = ((y + h) % h);
    const idx = (py * w + px) * 4;
    return (src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const left = getLuma(x - 1, y);
      const right = getLuma(x + 1, y);
      const up = getLuma(x, y - 1);
      const down = getLuma(x, y + 1);

      const dx = (right - left) * strength;
      const dy = (down - up) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = (dx / len) * 0.5 + 0.5;
      const ny = (dy / len) * 0.5 + 0.5;
      const nz = (dz / len) * 0.5 + 0.5;

      dst[idx] = Math.floor(nx * 255);
      dst[idx + 1] = Math.floor(ny * 255);
      dst[idx + 2] = Math.floor(nz * 255);
      dst[idx + 3] = 255;
    }
  }

  dstCtx.putImageData(dstData, 0, 0);
  const texture = new THREE.CanvasTexture(normalCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createFloorTexture(): { diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#5c4b37';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#725f47' : '#554532';
      ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
      // Subtle gradient highlight
      const grad = ctx.createLinearGradient(x * 128, y * 128, (x + 1) * 128, (y + 1) * 128);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
    }
  }

  // Grout seams
  ctx.strokeStyle = '#221a14';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 128, 0);
    ctx.lineTo(i * 128, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 128);
    ctx.lineTo(512, i * 128);
    ctx.stroke();
  }
  createNoiseOverlay(ctx, 512, 512, 0.2, 2);

  const diffuse = new THREE.CanvasTexture(c);
  diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(5, 5);
  diffuse.anisotropy = 8;
  diffuse.colorSpace = THREE.SRGBColorSpace;

  const normal = generateNormalMapFromCanvas(c, 2.0);
  normal.repeat.set(5, 5);
  return { diffuse, normal };
}

export function createWallpaperTexture(): { diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#837a6c';
  ctx.fillRect(0, 0, 512, 512);

  // Vintage floral stripes
  for (let x = 0; x < 512; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? '#797063' : '#8d8475';
    ctx.fillRect(x, 0, 16, 512);
    // Subtle repeating damask motif
    for (let y = 16; y < 512; y += 48) {
      ctx.fillStyle = 'rgba(60, 50, 40, 0.12)';
      ctx.beginPath();
      ctx.arc(x + 8, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Age spots and peeling water stains
  ctx.fillStyle = 'rgba(50, 35, 20, 0.16)';
  for (let i = 0; i < 35; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    const rw = 20 + Math.random() * 60;
    const rh = 10 + Math.random() * 25;
    ctx.fillRect(rx, ry, rw, rh);
  }
  createNoiseOverlay(ctx, 512, 512, 0.25, 2);

  const diffuse = new THREE.CanvasTexture(c);
  diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(3, 1.5);
  diffuse.colorSpace = THREE.SRGBColorSpace;
  const normal = generateNormalMapFromCanvas(c, 1.4);
  normal.repeat.set(3, 1.5);
  return { diffuse, normal };
}

export function createWoodTexture(): THREE.CanvasTexture {
  return createCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#6b4728';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) {
        ctx.strokeStyle = `rgba(40, 20, 10, ${(0.15 + Math.random() * 0.3).toFixed(2)})`;
        ctx.lineWidth = 1 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(y * 0.15) * 4);
        ctx.bezierCurveTo(w / 3, y + 8, (2 * w) / 3, y - 8, w, y + Math.cos(y * 0.12) * 4);
        ctx.stroke();
      }
      createNoiseOverlay(ctx, w, h, 0.15, 2);
    },
    2,
    2
  );
}

export function createHallwayTexture(): THREE.CanvasTexture {
  return createCanvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#4c4842';
      ctx.fillRect(0, 0, w, h);
      // Heavy cracks & stains
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      for (let i = 0; i < 90; i++) {
        ctx.lineWidth = 0.5 + Math.random() * 2;
        ctx.beginPath();
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 60, sy + (Math.random() - 0.5) * 60);
        ctx.stroke();
      }

      // Etched tally marks and scratch gouges on hallway plaster
      ctx.strokeStyle = 'rgba(20, 15, 12, 0.55)';
      ctx.lineWidth = 1.6;
      for (let group = 0; group < 12; group++) {
        const gx = 30 + (group % 4) * 120 + (Math.random() * 20);
        const gy = 60 + Math.floor(group / 4) * 140 + (Math.random() * 30);
        for (let t = 0; t < 4; t++) {
          ctx.beginPath();
          ctx.moveTo(gx + t * 8, gy);
          ctx.lineTo(gx + t * 8 + (Math.random() - 0.5) * 3, gy + 22 + (Math.random() - 0.5) * 4);
          ctx.stroke();
        }
        // Cross slash
        ctx.beginPath();
        ctx.moveTo(gx - 4, gy + 18);
        ctx.lineTo(gx + 28, gy + 4);
        ctx.stroke();
      }

      // Faint etched warnings in plaster
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = 'rgba(15, 10, 8, 0.45)';
      ctx.fillText("DON'T LOOK", 210, 310);
      ctx.fillText("4C ADA", 80, 440);

      createNoiseOverlay(ctx, w, h, 0.35, 2);
    },
    4,
    2
  );
}

export function createBaseboardTexture(): THREE.CanvasTexture {
  return createCanvasTexture(
    256,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = '#2b1e15';
      ctx.fillRect(0, 0, w, h);
      // Top beveled highlight
      const topGrad = ctx.createLinearGradient(0, 0, 0, 16);
      topGrad.addColorStop(0, '#513d2f');
      topGrad.addColorStop(1, '#2b1e15');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, 16);

      // Shadow recess
      ctx.fillStyle = '#140c07';
      ctx.fillRect(0, 16, w, 4);

      // Wood grain
      ctx.strokeStyle = 'rgba(10, 5, 2, 0.4)';
      for (let y = 20; y < h; y += 4) {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (Math.random() - 0.5) * 3);
        ctx.stroke();
      }
      createNoiseOverlay(ctx, w, h, 0.15, 1);
    },
    8,
    1
  );
}

export function createEtchingTexture(type: 'hallway' | 'tally' | 'closet' | 'warning' | 'scratches'): {
  diffuse: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Transparent / faint background
  ctx.clearRect(0, 0, 512, 512);

  if (type === 'hallway') {
    // Gouged scratches and desperate warning
    ctx.strokeStyle = 'rgba(25, 16, 12, 0.88)';
    ctx.lineWidth = 2.5;

    // Deep jagged scratch marks
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const sx = 60 + i * 65;
      const sy = 40 + Math.random() * 30;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 40, sy + 180 + Math.random() * 80);
      ctx.stroke();
    }

    // Carved text
    ctx.fillStyle = 'rgba(35, 12, 10, 0.92)';
    ctx.font = '900 28px "Courier New", monospace';
    ctx.fillText("IT WEARS HER FACE", 70, 290);
    ctx.font = '700 20px "Courier New", monospace';
    ctx.fillText("OCT 14 — ADA 4C", 110, 335);
    ctx.fillText("DO NOT OPEN AT NIGHT", 75, 380);

    // Dried blood-tinged drips
    ctx.fillStyle = 'rgba(70, 15, 10, 0.7)';
    for (let d = 0; d < 8; d++) {
      const dx = 80 + Math.random() * 340;
      const dy = 270 + Math.random() * 40;
      ctx.fillRect(dx, dy, 2.5, 30 + Math.random() * 60);
    }
  } else if (type === 'tally') {
    // Multiple clusters of frantic carved tally marks
    ctx.strokeStyle = 'rgba(20, 14, 10, 0.9)';
    ctx.lineWidth = 2.2;
    for (let r = 0; r < 5; r++) {
      for (let cIdx = 0; cIdx < 5; cIdx++) {
        const ox = 50 + cIdx * 84;
        const oy = 55 + r * 85;
        // 4 verticals
        for (let v = 0; v < 4; v++) {
          ctx.beginPath();
          ctx.moveTo(ox + v * 12, oy);
          ctx.lineTo(ox + v * 12 + (Math.random() - 0.5) * 4, oy + 42 + (Math.random() - 0.5) * 6);
          ctx.stroke();
        }
        // Diagonal slash
        ctx.beginPath();
        ctx.moveTo(ox - 6, oy + 36);
        ctx.lineTo(ox + 46, oy + 8);
        ctx.stroke();
      }
    }
    ctx.font = '700 22px "Courier New", monospace';
    ctx.fillStyle = 'rgba(30, 15, 10, 0.85)';
    ctx.fillText("NIGHT 34 — STILL WAITING", 80, 485);
  } else if (type === 'closet') {
    // Frantic fingernail etchings on cupboard interior
    ctx.strokeStyle = 'rgba(20, 12, 8, 0.92)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 22; i++) {
      const sx = 40 + Math.random() * 420;
      const sy = 40 + Math.random() * 320;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 70, sy + 50 + Math.random() * 90);
      ctx.stroke();
    }
    ctx.font = '900 24px "Courier New", monospace';
    ctx.fillStyle = 'rgba(50, 10, 8, 0.92)';
    ctx.fillText("KEEP THE LATCH SHUT", 70, 240);
    ctx.fillText("IT MIMICS OUR VOICES", 65, 290);
    ctx.fillText("DON'T LOOK OUT", 110, 340);
  } else if (type === 'warning') {
    // Carved wall warning near front door
    ctx.fillStyle = 'rgba(30, 10, 8, 0.9)';
    ctx.font = '900 26px "Courier New", monospace';
    ctx.fillText("RULE 1: LATCH IT", 90, 180);
    ctx.fillText("RULE 2: MOM IS 6:00 AM", 60, 230);
    ctx.fillText("ANYONE ELSE IS IT", 95, 280);

    ctx.strokeStyle = 'rgba(25, 12, 8, 0.85)';
    ctx.lineWidth = 2.0;
    // Box around warning
    ctx.strokeRect(40, 130, 430, 190);
    // Deep scratch through the box
    ctx.beginPath();
    ctx.moveTo(20, 110);
    ctx.lineTo(490, 340);
    ctx.stroke();
  } else {
    // Claw scratches
    ctx.strokeStyle = 'rgba(30, 12, 10, 0.9)';
    ctx.lineWidth = 3.0;
    for (let set = 0; set < 4; set++) {
      const baseY = 80 + set * 100;
      const baseX = 80 + Math.random() * 80;
      for (let finger = 0; finger < 4; finger++) {
        ctx.beginPath();
        const fx = baseX + finger * 20;
        ctx.moveTo(fx, baseY);
        ctx.bezierCurveTo(
          fx + 10,
          baseY + 40,
          fx - 15,
          baseY + 80,
          fx + (Math.random() - 0.5) * 20,
          baseY + 120 + Math.random() * 40
        );
        ctx.stroke();
      }
    }
  }

  const diffuse = new THREE.CanvasTexture(c);
  diffuse.anisotropy = 8;
  diffuse.colorSpace = THREE.SRGBColorSpace;
  const normal = generateNormalMapFromCanvas(c, 2.5);

  return { diffuse, normal };
}

export function createDustMoteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
  grad.addColorStop(0.3, 'rgba(240, 230, 200, 0.6)');
  grad.addColorStop(1, 'rgba(220, 210, 180, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}
