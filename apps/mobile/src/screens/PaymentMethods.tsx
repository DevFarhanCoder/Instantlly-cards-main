import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Plus,
  Trash2,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";

const demoMethods = [
  { id: "upi-1", type: "upi", label: "UPI", detail: "user@paytm", icon: "📱", isDefault: true },
  {
    id: "card-1",
    type: "card",
    label: "Debit Card",
    detail: "•••• •••• •••• 4532",
    icon: "💳",
    isDefault: false,
  },
];

const PaymentMethods = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [methods, setMethods] = useState(demoMethods);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<"upi" | "card">("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <CreditCard size={48} color="#c0c4cc" />
        <Text className="text-sm text-muted-foreground mt-3 mb-4">
          Sign in to manage payment methods
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  const handleAdd = () => {
    if (newType === "upi" && !upiId.trim()) {
      toast.error("Enter UPI ID");
      return;
    }
    if (newType === "card" && cardNumber.length < 12) {
      toast.error("Enter valid card number");
      return;
    }

    const newMethod = {
      id: `${newType}-${Date.now()}`,
      type: newType,
      label: newType === "upi" ? "UPI" : "Card",
      detail:
        newType === "upi"
          ? upiId
          : `•••• •••• •••• ${cardNumber.slice(-4)}`,
      icon: newType === "upi" ? "📱" : "💳",
      isDefault: methods.length === 0,
    };
    setMethods([...methods, newMethod]);
    setShowAdd(false);
    setUpiId("");
    setCardNumber("");
    toast.success("Payment method added!");
  };

  const handleSetDefault = (id: string) => {
    setMethods(methods.map((m) => ({ ...m, isDefault: m.id === id })));
    toast.success("Default payment method updated");
  };

  const handleRemove = (id: string) => {
    setMethods(methods.filter((m) => m.id !== id));
    toast.success("Payment method removed");
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-5">
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Accepted Payment Types
          </Text>
          <View className="flex-row gap-3">
            {[
              { icon: "📱", label: "UPI" },
              { icon: "💳", label: "Cards" },
              { icon: "💵", label: "Cash" },
              { icon: "🏦", label: "Net Banking" },
            ].map((t) => (
              <View key={t.label} className="items-center gap-1">
                <Text className="text-2xl">{t.icon}</Text>
                <Text className="text-[10px] text-muted-foreground">{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-4 space-y-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-bold text-foreground">Saved Methods</Text>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-xs gap-1"
              onPress={() => setShowAdd(true)}
            >
              <Plus size={14} color="#111827" /> Add New
            </Button>
          </View>

          {methods.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
              <CreditCard size={40} color="#c0c4cc" />
              <Text className="text-sm text-muted-foreground mt-2">
                No payment methods saved
              </Text>
              <Button size="sm" className="mt-3 rounded-lg" onPress={() => setShowAdd(true)}>
                Add Payment Method
              </Button>
            </View>
          ) : (
            methods.map((m) => (
              <View
                key={m.id}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <Text className="text-2xl">{m.icon}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-semibold text-foreground">{m.label}</Text>
                    {m.isDefault && (
                      <Badge className="bg-primary/10 text-primary border-none text-[9px]">
                        Default
                      </Badge>
                    )}
                  </View>
                  <Text className="text-xs text-muted-foreground">{m.detail}</Text>
                </View>
                <View className="flex-row gap-1">
                  {!m.isDefault && (
                    <Pressable
                      className="h-8 w-8 items-center justify-center"
                      onPress={() => handleSetDefault(m.id)}
                    >
                      <CheckCircle2 size={16} color="#6a7181" />
                    </Pressable>
                  )}
                  <Pressable
                    className="h-8 w-8 items-center justify-center"
                    onPress={() => handleRemove(m.id)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View className="mt-5 rounded-xl bg-muted/50 p-4 space-y-1">
          <Text className="text-xs font-semibold text-foreground">🔒 Payment Security</Text>
          <Text className="text-xs text-muted-foreground">
            All payments are processed securely. We never store your full card details.
            All transactions go directly to the business — no middlemen.
          </Text>
        </View>
      </ScrollView>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          <View className="space-y-4">
            <View className="flex-row gap-2">
              {([["upi", "📱 UPI"], ["card", "💳 Card"]] as const).map(([type, label]) => (
                <Pressable
                  key={type}
                  onPress={() => setNewType(type)}
                  className={`flex-1 rounded-xl py-3 ${
                    newType === type ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <Text className={`text-sm font-semibold text-center ${
                    newType === type ? "text-primary-foreground" : "text-muted-foreground"
                  }`}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {newType === "upi" ? (
              <View className="space-y-2">
                <Label>UPI ID</Label>
                <Input
                  placeholder="yourname@upi"
                  value={upiId}
                  onChangeText={setUpiId}
                  className="rounded-xl"
                />
              </View>
            ) : (
              <View className="space-y-2">
                <Label>Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChangeText={(t) => setCardNumber(t.replace(/\D/g, "").slice(0, 16))}
                  className="rounded-xl"
                  keyboardType="number-pad"
                />
              </View>
            )}

            <Button className="w-full rounded-xl" onPress={handleAdd}>
              Save Payment Method
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default PaymentMethods;

