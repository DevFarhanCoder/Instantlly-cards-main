export interface ShareCardData {
  fullName: string;
  companyName?: string | null;
  jobTitle?: string | null;
  phone: string;
  email?: string | null;
  location?: string | null;
  website?: string | null;
  category?: string | null;
  offer?: string | null;
  services?: string[] | null;
  logoUrl?: string | null;
  shareUrl: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;

const categoryColors: Record<string, { bg: string; accent: string; text: string }> = {
  Technology: { bg: "#0f172a", accent: "#3b82f6", text: "#e0f2fe" },
  Health: { bg: "#052e16", accent: "#10b981", text: "#d1fae5" },
  Education: { bg: "#1e1b4b", accent: "#8b5cf6", text: "#ede9fe" },
  "Food & Dining": { bg: "#431407", accent: "#f59e0b", text: "#fef3c7" },
  Shopping: { bg: "#500724", accent: "#ec4899", text: "#fce7f3" },
  Travel: { bg: "#0c1929", accent: "#0ea5e9", text: "#e0f2fe" },
  Services: { bg: "#042f2e", accent: "#14b8a6", text: "#ccfbf1" },
  Construction: { bg: "#451a03", accent: "#d97706", text: "#fef3c7" },
  "Real Estate": { bg: "#052e16", accent: "#22c55e", text: "#dcfce7" },
  Automotive: { bg: "#450a0a", accent: "#ef4444", text: "#fee2e2" },
  Lifestyle: { bg: "#4a044e", accent: "#d946ef", text: "#fae8ff" },
  Legal: { bg: "#1e293b", accent: "#64748b", text: "#e2e8f0" },
};

const defaultColors = { bg: "#0f172a", accent: "#6366f1", text: "#e0e7ff" };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  const colors = categoryColors[data.category || ""] || defaultColors;

  // Background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle grid pattern
  ctx.strokeStyle = `${colors.accent}12`;
  ctx.lineWidth = 1;
  for (let i = 0; i < CARD_WIDTH; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, CARD_HEIGHT);
    ctx.stroke();
  }
  for (let i = 0; i < CARD_HEIGHT; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(CARD_WIDTH, i);
    ctx.stroke();
  }

  // Decorative accent circles
  ctx.globalAlpha = 0.06;
  drawCircle(ctx, 900, 150, 200);
  ctx.fillStyle = colors.accent;
  ctx.fill();
  drawCircle(ctx, 180, 900, 150);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Top accent bar
  const gradient = ctx.createLinearGradient(80, 80, 600, 80);
  gradient.addColorStop(0, colors.accent);
  gradient.addColorStop(1, `${colors.accent}33`);
  roundRect(ctx, 80, 80, 500, 6, 3);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Category badge
  if (data.category) {
    roundRect(ctx, 80, 110, ctx.measureText(data.category).width + 60, 40, 20);
    ctx.fillStyle = `${colors.accent}22`;
    ctx.fill();
    ctx.strokeStyle = `${colors.accent}44`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = colors.accent;
    // re-measure after setting font
    const catWidth = ctx.measureText(data.category).width;
    // redraw badge with correct width
    ctx.clearRect(78, 108, 600, 46);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(78, 108, 600, 46);
    roundRect(ctx, 80, 110, catWidth + 40, 36, 18);
    ctx.fillStyle = `${colors.accent}22`;
    ctx.fill();
    ctx.fillStyle = colors.accent;
    ctx.fillText(data.category, 100, 134);
  }

  // Logo circle placeholder
  const logoY = 190;
  drawCircle(ctx, 140, logoY + 50, 50);
  ctx.fillStyle = `${colors.accent}20`;
  ctx.fill();
  ctx.strokeStyle = `${colors.accent}40`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = "bold 36px -apple-system, sans-serif";
  ctx.fillStyle = colors.accent;
  const initial = (data.fullName || "B")[0].toUpperCase();
  const initW = ctx.measureText(initial).width;
  ctx.fillText(initial, 140 - initW / 2, logoY + 63);

  // Name
  ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#ffffff";
  const nameX = 210;
  ctx.fillText(data.fullName, nameX, logoY + 40);

  // Job title
  if (data.jobTitle) {
    ctx.font = "500 26px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = colors.accent;
    ctx.fillText(data.jobTitle, nameX, logoY + 75);
  }

  // Company
  if (data.companyName) {
    ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = `${colors.text}99`;
    ctx.fillText(data.companyName, nameX, logoY + (data.jobTitle ? 110 : 75));
  }

  // Divider
  const divY = 370;
  const divGrad = ctx.createLinearGradient(80, divY, 1000, divY);
  divGrad.addColorStop(0, `${colors.accent}66`);
  divGrad.addColorStop(1, `${colors.accent}00`);
  ctx.fillStyle = divGrad;
  ctx.fillRect(80, divY, 920, 1);

  // Contact info section
  let infoY = 410;
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = `${colors.text}66`;
  ctx.fillText("CONTACT", 80, infoY);
  infoY += 40;

  const drawInfoRow = (icon: string, text: string) => {
    ctx.font = "24px -apple-system, sans-serif";
    ctx.fillStyle = `${colors.text}aa`;
    ctx.fillText(icon, 80, infoY);
    ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = colors.text;
    ctx.fillText(text, 120, infoY);
    infoY += 42;
  };

  drawInfoRow("📱", data.phone);
  if (data.email) drawInfoRow("✉️", data.email);
  if (data.location) drawInfoRow("📍", data.location);
  if (data.website) drawInfoRow("🌐", data.website);

  // Services
  if (data.services && data.services.length > 0) {
    infoY += 20;
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = `${colors.text}66`;
    ctx.fillText("SERVICES", 80, infoY);
    infoY += 35;

    let pillX = 80;
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
    for (const service of data.services.slice(0, 6)) {
      const sw = ctx.measureText(service).width + 28;
      if (pillX + sw > 1000) {
        pillX = 80;
        infoY += 40;
      }
      roundRect(ctx, pillX, infoY - 22, sw, 32, 16);
      ctx.fillStyle = `${colors.accent}18`;
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.fillText(service, pillX + 14, infoY);
      pillX += sw + 10;
    }
    infoY += 30;
  }

  // Offer banner
  if (data.offer) {
    infoY += 20;
    roundRect(ctx, 80, infoY, 920, 60, 16);
    ctx.fillStyle = "#10b98118";
    ctx.fill();
    ctx.strokeStyle = "#10b98133";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#34d399";
    ctx.fillText(`🎁  ${data.offer}`, 100, infoY + 38);
  }

  // Bottom section — share URL + branding
  const bottomY = CARD_HEIGHT - 100;

  // Accent line
  const btmGrad = ctx.createLinearGradient(80, bottomY, 1000, bottomY);
  btmGrad.addColorStop(0, `${colors.accent}44`);
  btmGrad.addColorStop(1, `${colors.accent}00`);
  ctx.fillStyle = btmGrad;
  ctx.fillRect(80, bottomY, 920, 1);

  ctx.font = "400 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = `${colors.text}66`;
  ctx.fillText(data.shareUrl, 80, bottomY + 40);

  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = `${colors.accent}88`;
  const brand = "Instantly";
  const brandW = ctx.measureText(brand).width;
  ctx.fillText(brand, CARD_WIDTH - 80 - brandW, bottomY + 40);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 1);
  });
}

export async function shareToWhatsApp(data: ShareCardData) {
  const text = `${data.fullName}${data.companyName ? ` — ${data.companyName}` : ""}${data.jobTitle ? ` | ${data.jobTitle}` : ""}\n\n${data.phone}${data.email ? `\n${data.email}` : ""}${data.location ? `\n📍 ${data.location}` : ""}${data.offer ? `\n\n🎁 ${data.offer}` : ""}\n\n${data.shareUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export function downloadShareCard(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-card.png`;
  a.click();
  URL.revokeObjectURL(url);
}
