import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, MessageCircle, Instagram, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateShareCard, shareToWhatsApp, downloadShareCard, type ShareCardData } from "@/lib/shareCardGenerator";

interface ShareCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareCardData;
}

const ShareCardModal = ({ open, onOpenChange, data }: ShareCardModalProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && !imageUrl) {
      setGenerating(true);
      generateShareCard(data).then((b) => {
        setBlob(b);
        setImageUrl(URL.createObjectURL(b));
        setGenerating(false);
      });
    }
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [open]);

  const handleDownload = () => {
    if (blob) {
      downloadShareCard(blob, data.fullName);
      toast.success("Card downloaded!");
    }
  };

  const handleWhatsApp = () => shareToWhatsApp(data);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(data.shareUrl);
    toast.success("Link copied!");
  };

  const handleNativeShare = async () => {
    if (!blob) return;
    const file = new File([blob], `${data.fullName}-card.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: data.fullName, url: data.shareUrl });
    } else if (navigator.share) {
      await navigator.share({ title: data.fullName, text: `${data.fullName} — ${data.companyName || ""}`, url: data.shareUrl });
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-bold">Share Business Card</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Card Preview */}
          <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-square">
            {generating ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="Share card preview" className="w-full h-full object-cover" />
            ) : null}
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleWhatsApp} className="gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
            <Button onClick={handleDownload} variant="outline" className="gap-2 rounded-xl" disabled={!blob}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button onClick={handleNativeShare} variant="outline" className="gap-2 rounded-xl" disabled={!blob}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button onClick={handleCopyLink} variant="outline" className="gap-2 rounded-xl">
              <Copy className="h-4 w-4" /> Copy Link
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Download the card image to share on Instagram Stories or Feed
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareCardModal;
