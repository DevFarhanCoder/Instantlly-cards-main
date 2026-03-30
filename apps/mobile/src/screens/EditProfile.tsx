import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Camera, Save, User } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../hooks/useAuth";
import { useGetProfileQuery, useUpdateProfileMutation } from "../store/api/usersApi";
import { supabase } from "../integrations/supabase/client";
import { toast } from "../lib/toast";

const EditProfile = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data: profile, isLoading } = useGetProfileQuery(undefined, { skip: !user });
  const [updateProfileMutation] = useUpdateProfileMutation();

  useEffect(() => {
    if (profile) {
      setFullName(profile.name || profile.profile?.full_name || "");
      setPhone(profile.phone || profile.profile?.phone || "");
      setAbout(profile.about || profile.profile?.bio || "");
      setGender(profile.gender || "");
      setAvatarUrl(profile.profile_picture || profile.profile?.avatar_url || null);
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await updateProfileMutation({
        name: fullName.trim(),
        phone: phone.trim(),
        about: about.trim(),
        gender: gender || undefined,
        profile_picture: avatarUrl ?? undefined,
      }).unwrap();
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      navigation.goBack();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update profile"),
  });

  const handleAvatarUpload = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required to access photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = (asset.fileName || asset.uri.split(".").pop() || "jpg")
        .split(".")
        .pop();
      const path = `${user.id}/avatar.${ext}`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(path, blob, { upsert: true } as any);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <User size={48} color="#c0c4cc" />
        <Text className="text-sm text-muted-foreground mt-3 mb-4">
          Sign in to edit your profile
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-6">
        <View className="items-center">
          <View className="relative">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground overflow-hidden">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ height: "100%", width: "100%" }} />
              ) : (
                <Text className="text-3xl font-bold text-primary-foreground">
                  {fullName?.substring(0, 2).toUpperCase() ||
                    user.email?.substring(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleAvatarUpload}
              className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-primary"
            >
              <Camera size={16} color="#ffffff" />
            </Pressable>
          </View>
          {uploading && <Text className="text-xs text-muted-foreground mt-2">Uploading...</Text>}
          <Text className="text-xs text-muted-foreground mt-2">{user.email}</Text>
        </View>

        <View className="mt-6 gap-4">
          <View className="gap-2">
            <Label>Full Name</Label>
            <Input
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              className="rounded-xl"
            />
          </View>

          <View className="gap-2">
            <Label>Phone Number</Label>
            <Input
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              className="rounded-xl"
            />
          </View>

          <View className="gap-2">
            <Label>About</Label>
            <Textarea
              placeholder="Tell others about yourself..."
              value={about}
              onChangeText={setAbout}
              className="rounded-xl"
              maxLength={500}
            />
            <Text className="text-[10px] text-muted-foreground text-right">{about.length}/500</Text>
          </View>

          <View className="gap-2">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="rounded-xl h-12">
                <SelectValue placeholder="Select gender (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </View>

          <View className="gap-2">
            <Label>Email</Label>
            <Input value={profile?.email || user.email || ""} editable={false} className="rounded-xl bg-muted" />
            <Text className="text-[10px] text-muted-foreground">Email cannot be changed</Text>
          </View>

          <View className="gap-2">
            <Label>Member Since</Label>
            <Input
              value={new Date(profile?.created_at || Date.now()).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              editable={false}
              className="rounded-xl bg-muted"
            />
          </View>
        </View>

        <Button
          className="mt-6 w-full gap-2 rounded-xl py-5"
          onPress={() => saveProfile.mutate()}
          disabled={saveProfile.isPending || isLoading}
        >
          <Save size={16} color="#ffffff" />
          {saveProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </ScrollView>
    </View>
  );
};

export default EditProfile;

