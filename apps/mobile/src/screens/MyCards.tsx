import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Calendar,
  Edit,
  Eye,
  Megaphone,
  MoreVertical,
  Plus,
  Share2,
  Tag,
  Trash2,
  Users,
  Lock,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards, type BusinessCardRow } from "../hooks/useBusinessCards";
import { useDirectoryCards } from "../hooks/useDirectoryCards";
import BusinessOnboarding from "../components/business/BusinessOnboarding";
import { toast } from "../lib/toast";

const MyCards = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { cards, isLoading, deleteCard } = useBusinessCards();
  const [shareCard, setShareCard] = useState<BusinessCardRow | null>(null);
  const { data: demoCards = [] } = useDirectoryCards();

  if (!user) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-4">
          <Text className="text-xl font-bold text-foreground">My Business Cards</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 items-center">
            <Lock size={28} color="#2463eb" />
            <Text className="mt-2 text-base font-bold text-foreground">
              Sign in to manage your cards
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground text-center">
              Create, edit, and share your digital business cards
            </Text>
            <Button
              className="mt-3 rounded-xl"
              onPress={() => navigation.navigate("Auth")}
            >
              Sign In
            </Button>
          </View>

          <View className="px-4 pt-4 pb-4">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              📇 Preview: Sample Business Cards
            </Text>
            <View className="gap-3 opacity-80">
              {demoCards.slice(0, 4).map((card: any) => (
                <Pressable
                  key={card.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                >
                  <View className="flex-row items-start gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image
                          source={{ uri: card.logo_url }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl">🏢</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground">
                        {card.full_name}
                      </Text>
                      {card.job_title && (
                        <Text className="text-xs font-medium text-primary">
                          {card.job_title}
                        </Text>
                      )}
                      {card.company_name && (
                        <Text className="text-xs text-muted-foreground">
                          {card.company_name}
                        </Text>
                      )}
                      <View className="mt-1 flex-row items-center gap-1.5">
                        {card.category && (
                          <Text className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {card.category}
                          </Text>
                        )}
                        <Text
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            card.home_service
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {card.home_service ? "🏠 Home" : "🏪 Visit"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {card.location && (
                    <Text className="mt-2 text-xs text-muted-foreground">
                      📍 {card.location}
                    </Text>
                  )}

                  {card.offer && (
                    <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
                      <Text className="text-xs font-medium text-accent-foreground">
                        🎁 {card.offer}
                      </Text>
                    </View>
                  )}

                  {card.services && card.services.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {card.services.slice(0, 3).map((s: string) => (
                        <Text
                          key={s}
                          className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          {s}
                        </Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-foreground">My Business Cards</Text>
        <Pressable
          onPress={() => navigation.navigate("CardCreate")}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          <Plus size={18} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 260 }}>
        {isLoading ? (
          <View className="px-4 py-4 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </View>
        ) : cards.length === 0 ? (
          <View className="pb-32">
            <BusinessOnboarding />
            <View className="items-center px-6 pt-16">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-muted">
                <Text className="text-4xl">📇</Text>
              </View>
              <Text className="text-lg font-bold text-foreground">
                You haven't created any cards yet.
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                Use the Quick Start Guide above or tap + to create your first card
              </Text>
              <Button
                className="mt-6 rounded-xl"
                onPress={() => navigation.navigate("CardCreate")}
              >
                <Plus size={14} color="#ffffff" /> Create Card
              </Button>
            </View>
          </View>
        ) : (
          <View className="px-4 py-4 gap-4 pb-32">
            <BusinessOnboarding />
            {cards.map((card) => (
              <View
                key={card.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image
                          source={{ uri: card.logo_url }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl">🏢</Text>
                      )}
                    </View>
                    <View>
                      <Text className="text-base font-bold text-foreground">
                        {card.full_name}
                      </Text>
                      {card.job_title && (
                        <Text className="text-xs font-medium text-primary">
                          {card.job_title}
                        </Text>
                      )}
                      {card.company_name && (
                        <Text className="text-xs text-muted-foreground">
                          {card.company_name}
                        </Text>
                      )}
                      {card.category && (
                        <Text className="mt-0.5 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {card.category}
                        </Text>
                      )}
                    </View>
                  </View>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable className="p-1">
                        <MoreVertical size={16} color="#6a7181" />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onPress={() => navigation.navigate("PublicCard", { id: card.id })}>
                        <Eye size={14} color="#111827" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => navigation.navigate("CardCreate", { cardId: card.id })}>
                        <Edit size={14} color="#111827" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setShareCard(card)}>
                        <Share2 size={14} color="#111827" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onPress={() => navigation.navigate("AdCreate", { cardId: card.id })}>
                        <Megaphone size={14} color="#111827" /> Run Ad
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => navigation.navigate("EventCreate", { cardId: card.id })}>
                        <Calendar size={14} color="#111827" /> List Event
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => navigation.navigate("VoucherCreate", { cardId: card.id })}>
                        <Tag size={14} color="#111827" /> Create Voucher
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onPress={() => deleteCard.mutate(card.id)}
                      >
                        <Trash2 size={14} color="#ef4343" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>

                {card.location && (
                  <Text className="mt-2 text-xs text-muted-foreground">
                    📍 {card.location}
                  </Text>
                )}

                {card.offer && (
                  <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
                    <Text className="text-xs font-medium text-accent-foreground">
                      🎁 {card.offer}
                    </Text>
                  </View>
                )}

                {card.services && card.services.length > 0 && (
                  <View className="mt-3 flex-row flex-wrap gap-1.5">
                    {card.services.map((s) => (
                      <Text
                        key={s}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {s}
                      </Text>
                    ))}
                  </View>
                )}

                <View className="mt-3 flex-row gap-2">
                  <Button size="sm" className="flex-1 rounded-lg" onPress={() => setShareCard(card)}>
                    <Share2 size={14} color="#ffffff" /> Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onPress={() => navigation.navigate("AdCreate", { cardId: card.id })}
                  >
                    📣 Promote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onPress={() => navigation.navigate("EventCreate", { cardId: card.id })}
                  >
                    🎫 Event
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {cards.length > 0 && (
        <View className="absolute bottom-48 right-4 flex-row items-center gap-3">
          <View className="rounded-xl bg-foreground/90 px-4 py-2.5">
            <Text className="text-xs font-medium text-primary-foreground">
              Share your cards with groups!
            </Text>
          </View>
          <Pressable className="h-14 w-14 items-center justify-center rounded-full bg-primary/80">
            <Users size={22} color="#ffffff" />
          </Pressable>
        </View>
      )}

      <Dialog open={!!shareCard} onOpenChange={() => setShareCard(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share "{shareCard?.full_name}"</DialogTitle>
          </DialogHeader>
          <View className="items-center gap-4 py-4">
            {shareCard ? (
              <QRCode value={`instantly://card/${shareCard.id}`} size={160} />
            ) : null}
            <Text className="text-xs text-muted-foreground">
              Scan to view this card
            </Text>
          </View>
          <View className="gap-2">
            <Button
              className="w-full rounded-xl"
              onPress={() => {
                toast.success("Link copied!");
                setShareCard(null);
              }}
            >
              📋 Copy Link
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={() => {
                toast.success("Opening WhatsApp...");
                setShareCard(null);
              }}
            >
              💬 Share via WhatsApp
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default MyCards;

