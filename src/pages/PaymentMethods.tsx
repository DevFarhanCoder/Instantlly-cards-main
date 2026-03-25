import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Plus, Smartphone, Banknote, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const demoMethods = [
  { id: "upi-1", type: "upi", label: "UPI", detail: "user@paytm", icon: "📱", isDefault: true },
  { id: "card-1", type: "card", label: "Debit Card", detail: "•••• •••• •••• 4532", icon: "💳", isDefault: false },
];

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [methods, setMethods] = useState(demoMethods);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<"upi" | "card">("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Sign in to manage payment methods</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  const handleAdd = () => {
    if (newType === "upi" && !upiId.trim()) { toast.error("Enter UPI ID"); return; }
    if (newType === "card" && cardNumber.length < 12) { toast.error("Enter valid card number"); return; }

    const newMethod = {
      id: `${newType}-${Date.now()}`,
      type: newType,
      label: newType === "upi" ? "UPI" : "Card",
      detail: newType === "upi" ? upiId : `•••• •••• •••• ${cardNumber.slice(-4)}`,
      icon: newType === "upi" ? "📱" : "💳",
      isDefault: methods.length === 0,
    };
    setMethods([...methods, newMethod]);
    setShowAdd(false);
    setUpiId("");
    setCardNumber("");
    toast.success("Payment method added! ✅");
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
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Payment Methods</h1>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* Accepted methods */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accepted Payment Types</h3>
          <div className="flex gap-3">
            {[
              { icon: "📱", label: "UPI" },
              { icon: "💳", label: "Cards" },
              { icon: "💵", label: "Cash" },
              { icon: "🏦", label: "Net Banking" },
            ].map((t) => (
              <div key={t.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{t.icon}</span>
                <span className="text-[10px] text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Methods */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Saved Methods</h2>
            <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" /> Add New
            </Button>
          </div>

          {methods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No payment methods saved</p>
              <Button size="sm" className="mt-3 rounded-lg" onClick={() => setShowAdd(true)}>Add Payment Method</Button>
            </div>
          ) : (
            methods.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-2xl shrink-0">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{m.label}</p>
                    {m.isDefault && <Badge className="bg-primary/10 text-primary border-none text-[9px]">Default</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.detail}</p>
                </div>
                <div className="flex gap-1">
                  {!m.isDefault && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetDefault(m.id)}>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRemove(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Security note */}
        <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">🔒 Payment Security</p>
          <p>All payments are processed securely. We never store your full card details. All transactions go directly to the business — no middlemen.</p>
        </div>
      </div>

      {/* Add Method Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Payment Method</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {([["upi", "📱 UPI"], ["card", "💳 Card"]] as const).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
                    newType === type ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {newType === "upi" ? (
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} className="rounded-xl" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))} className="rounded-xl" />
              </div>
            )}

            <Button className="w-full rounded-xl" onClick={handleAdd}>Save Payment Method</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethods;
