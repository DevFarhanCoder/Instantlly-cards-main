import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Upload } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { colors } from "../../theme/colors";
import { Input } from "../ui/input";

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
        .from("business_photos" as any)
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!businessCardId,
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_photos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-photos", businessCardId] });
      toast.success("Photo deleted");
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  const handleUpload = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required to access photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const ext = (asset.fileName || asset.uri.split(".").pop() || "jpg")
        .split(".")
        .pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("business-photos")
        .upload(path, blob, { upsert: true } as any);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("business-photos").getPublicUrl(path);
      const { error } = await supabase.from("business_photos" as any).insert({
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
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <ImagePlus size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">Photo Gallery</Text>
        </View>
        <Text className="text-[10px] text-muted-foreground">{photos.length} photos</Text>
      </View>

      <View className="rounded-xl border border-dashed border-border bg-muted/30 p-4 gap-3">
        <Input
          placeholder="Caption (optional)"
          value={caption}
          onChangeText={setCaption}
          className="rounded-lg text-xs"
        />
        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
          style={uploading ? { opacity: 0.6 } : undefined}
        >
          <Upload size={14} color={colors.foreground} />
          <Text className="text-xs font-semibold text-foreground">
            {uploading ? "Uploading..." : "Upload Photo"}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="py-6 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : photos.length === 0 ? (
        <Text className="text-xs text-muted-foreground text-center py-4">
          No photos yet. Upload your first.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {photos.map((photo: any) => (
            <View
              key={photo.id}
              className="relative w-[48%] rounded-xl overflow-hidden border border-border bg-card"
            >
              <Image source={{ uri: photo.photo_url }} style={{ width: "100%", height: 120 }} />
              {photo.caption ? (
                <Text className="text-[10px] text-muted-foreground px-2 py-1" numberOfLines={1}>
                  {photo.caption}
                </Text>
              ) : null}
              <Pressable
                onPress={() => deletePhoto.mutate(photo.id)}
                className="absolute top-2 right-2 h-7 w-7 items-center justify-center rounded-full bg-destructive/90"
              >
                <Trash2 size={14} color="#ffffff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

