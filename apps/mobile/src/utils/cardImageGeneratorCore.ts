// cardImageGeneratorCore.ts
// Utility: card image capture and sharing mechanics only.
// No UI components, no data fetching, no message building.

// ── Lazy-loaded modules ───────────────────────────────────────────────────────

export const missingModules: string[] = [];

let captureRef: ((view: unknown, options?: object) => Promise<string>) | null = null;
try {
  const viewShot = require('react-native-view-shot');
  captureRef = viewShot.captureRef;
} catch {
  missingModules.push('react-native-view-shot');
}

let FileSystem: {
  cacheDirectory: string | null;
  copyAsync: (options: { from: string; to: string }) => Promise<void>;
  getInfoAsync: (uri: string) => Promise<{ exists: boolean; size?: number }>;
} | null = null;
try {
  FileSystem = require('expo-file-system/legacy');
} catch {
  missingModules.push('expo-file-system/legacy');
}

let Sharing: {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (uri: string, options?: object) => Promise<void>;
} | null = null;
try {
  Sharing = require('expo-sharing');
} catch {
  missingModules.push('expo-sharing');
}

let RNShareLib: {
  open: (options: object) => Promise<void>;
} | null = null;
try {
  const mod = require('react-native-share');
  RNShareLib = mod.default ?? mod;
} catch {
  missingModules.push('react-native-share');
}

let Platform: { OS: string } | null = null;
let Alert: { alert: (title: string, message?: string) => void } | null = null;
let RNShare: { share: (content: object) => Promise<void> } | null = null;
try {
  const rn = require('react-native');
  Platform = rn.Platform;
  Alert = rn.Alert;
  RNShare = rn.Share;
} catch {
  missingModules.push('react-native');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveView(viewRef: unknown): unknown | null {
  if (viewRef == null) return null;
  if (typeof viewRef === 'object' && viewRef !== null && 'current' in viewRef) {
    return (viewRef as { current: unknown }).current ?? null;
  }
  return viewRef;
}

function toShareableUri(uri: string): string {
  if (Platform?.OS === 'android' && !uri.startsWith('file://')) {
    return 'file://' + uri;
  }
  return uri;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Capture the card view and share or save the resulting image.
 *
 * @param viewRef      React ref (`.current`) or direct view instance
 * @param shareMethod  "native" | "whatsapp" | "save"  (default: "native")
 * @param shareTitle   Dialog / share title             (default: "Business Card")
 * @param shareMessage Body text for the share sheet    (default: "")
 * @param fileName     Suggested file name              (default: "Card.png")
 */
export async function generateAndShareCardImage(
  viewRef: unknown,
  shareMethod: 'native' | 'whatsapp' | 'save' = 'native',
  shareTitle = 'Business Card',
  shareMessage = '',
  fileName = 'Card.png',
): Promise<{ success: boolean; error?: string }> {
  // 1. Check captureRef availability
  if (!captureRef) {
    return { success: false, error: 'native_module_not_available' };
  }

  // 2. Resolve view
  const view = resolveView(viewRef);
  if (!view) {
    return { success: false, error: 'view_ref_not_ready' };
  }

  try {
    // 3. Wait for remote images to load before capturing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. Capture
    const uri: string = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });

    // 4. Copy to cache if FileSystem is available
    let shareableUri = uri;
    if (FileSystem) {
      try {
        const dest = (FileSystem.cacheDirectory ?? '') + 'card_share_' + Date.now() + '.png';
        await FileSystem.copyAsync({ from: uri, to: dest });
        const fileInfo = await FileSystem.getInfoAsync(dest);
        if (fileInfo.exists && (fileInfo.size ?? 0) > 0) {
          shareableUri = dest;
        }
      } catch {
        // keep original URI
      }
    }

    // 5. Build shareUrl
    const shareUrl = toShareableUri(shareableUri);

    // ── save ─────────────────────────────────────────────────────────────────
    if (shareMethod === 'save') {
      if (!Sharing) throw new Error('Sharing is not available on this device');
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Sharing is not available on this device');
      await Sharing.shareAsync(shareableUri, {
        mimeType: 'image/png',
        dialogTitle: 'Save Card',
        UTI: 'public.png',
      });
      return { success: true };
    }

    // ── native / whatsapp — 3-method fallback chain ───────────────────────────
    let shared = false;
    let lastError: Error | null = null;

    // A) react-native-share
    if (!shared && RNShareLib) {
      try {
        await RNShareLib.open({
          title: shareTitle,
          message: shareMessage,
          url: shareUrl,
          type: 'image/png',
          filename: fileName,
        });
        shared = true;
      } catch (err: unknown) {
        const e = err as Error;
        if (e?.message?.includes('User did not share')) {
          return { success: false, error: 'cancelled' };
        }
        lastError = e;
      }
    }

    // B) expo-sharing
    if (!shared && Sharing) {
      try {
        await Sharing.shareAsync(shareableUri, {
          mimeType: 'image/png',
          dialogTitle: shareTitle,
        });
        shared = true;
      } catch (err: unknown) {
        const e = err as Error;
        if (e?.message?.includes('User did not share')) {
          return { success: false, error: 'cancelled' };
        }
        lastError = e;
      }
    }

    // C) React Native built-in Share
    if (!shared && RNShare) {
      try {
        await RNShare.share({ message: shareMessage, title: shareTitle });
        shared = true;
      } catch (err: unknown) {
        const e = err as Error;
        if (e?.message?.includes('User did not share')) {
          return { success: false, error: 'cancelled' };
        }
        lastError = e;
      }
    }

    if (shared) return { success: true };

    return {
      success: false,
      error: lastError?.message || 'Failed to generate card image',
    };
  } catch (err: unknown) {
    const e = err as Error;
    if (e?.message?.includes('User did not share')) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: e?.message || 'Failed to generate card image' };
  }
}

/**
 * Capture the card view and return the local file URI.
 * Use this when you need the image file without immediately sharing it.
 *
 * @param viewRef  React ref (`.current`) or direct view instance
 */
export async function generateCardImageFile(
  viewRef: unknown,
): Promise<{ success: boolean; uri?: string; error?: string }> {
  if (!captureRef || !FileSystem) {
    return { success: false, error: 'native_module_not_available' };
  }

  const view = resolveView(viewRef);
  if (!view) {
    return { success: false, error: 'view_ref_not_ready' };
  }

  try {
    const uri: string = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
    return { success: true, uri };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e?.message || 'Failed to generate card image' };
  }
}
