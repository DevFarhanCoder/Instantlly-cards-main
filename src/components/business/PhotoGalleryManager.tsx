import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Upload, GripVertical, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  businessCardId: string;
}

export default function PhotoGalleryManager({ businessCardId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["business-photos", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_photos")
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!businessCardId,
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-photos", businessCardId] });
      toast.success("Photo deleted");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("business-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("business-photos").getPublicUrl(path);
      
      const { error } = await supabase.from("business_photos").insert({
        business_card_id: businessCardId,
        user_id: user.id,
        photo_url: urlData.publicUrl,
        caption: caption || null,
        sort_order: photos.length,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["business-photos", businessCardId] });
      setCaption("");
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-primary" /> Photo Gallery
        </h3>
        <span className="text-[10px] text-muted-foreground">{photos.length} photos</span>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-3">
        <Input
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="rounded-lg text-xs"
        />
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button variant="outline" className="w-full gap-2 rounded-xl text-xs" disabled={uploading} asChild>
            <span>
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload Photo"}
            </span>
          </Button>
        </label>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : photos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No photos yet. Upload your first!</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative group rounded-xl overflow-hidden border border-border bg-card"
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || "Business photo"}
                className="w-full h-32 object-cover"
              />
              {photo.caption && (
                <p className="text-[10px] text-muted-foreground px-2 py-1.5 truncate">{photo.caption}</p>
              )}
              <button
                onClick={() => deletePhoto.mutate(photo.id)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
