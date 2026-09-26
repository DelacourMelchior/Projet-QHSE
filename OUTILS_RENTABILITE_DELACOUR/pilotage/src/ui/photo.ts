// A photo taken or chosen on the device, reduced (800 px, JPEG) so it fits in the shared data files.
export function readPhoto(file: File, max = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

export type Mark = 'arrow' | 'cross' | 'circle';
// Draws a mark on the photo at (x, y) given as a share of its width and height, returns the new picture
export function annotate(src: string, mark: Mark, x: number, y: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d')!;
      g.drawImage(img, 0, 0);
      const px = x * c.width, py = y * c.height, s = Math.max(24, c.width / 10);
      g.lineWidth = Math.max(4, c.width / 90); g.lineCap = 'round';
      if (mark === 'arrow') {
        g.strokeStyle = '#16a34a'; g.beginPath(); g.moveTo(px - s, py + s); g.lineTo(px, py); g.stroke();
        g.beginPath(); g.moveTo(px, py); g.lineTo(px - s * 0.45, py + s * 0.05); g.moveTo(px, py); g.lineTo(px - s * 0.05, py + s * 0.45); g.stroke();
      } else if (mark === 'cross') {
        g.strokeStyle = '#dc2626'; g.beginPath(); g.moveTo(px - s / 2, py - s / 2); g.lineTo(px + s / 2, py + s / 2); g.moveTo(px + s / 2, py - s / 2); g.lineTo(px - s / 2, py + s / 2); g.stroke();
      } else {
        g.strokeStyle = '#f59e0b'; g.beginPath(); g.arc(px, py, s * 0.6, 0, Math.PI * 2); g.stroke();
      }
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}
