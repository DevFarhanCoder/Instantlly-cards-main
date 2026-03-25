import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Phone, Plus, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  useNetworkCards,
  useSyncContacts,
  useSyncedContacts,
  isContactPickerSupported,
  pickContacts,
  type SyncedContact,
} from "@/hooks/useContactSync";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const NetworkCards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: networkCards = [], isLoading } = useNetworkCards();
  const { data: syncedContacts = [] } = useSyncedContacts();
  const syncMutation = useSyncContacts();
  const [showManual, setShowManual] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const autoSyncAttempted = useRef(false);

  // Auto-sync contacts on first load if Contact Picker API is supported and no contacts synced yet
  useEffect(() => {
    if (!user || autoSyncAttempted.current || !isContactPickerSupported()) return;
    if (syncedContacts.length > 0) return; // already synced before
    autoSyncAttempted.current = true;
    
    // Auto-trigger contact picker
    pickContacts().then((contacts) => {
      if (contacts.length > 0) {
        syncMutation.mutate(contacts);
      }
    });
  }, [user, syncedContacts.length]);

  const handleContactPicker = async () => {
    const contacts = await pickContacts();
    if (contacts.length > 0) {
      syncMutation.mutate(contacts);
    }
  };

  const handleManualAdd = () => {
    if (!manualPhone.trim()) return;
    syncMutation.mutate([
      { phone_number: manualPhone.trim(), contact_name: manualName.trim() || null },
    ]);
    setManualPhone("");
    setManualName("");
  };

  if (!user) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">My Network</h2>
          {networkCards.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded-full">
              {networkCards.length}
            </span>
          )}
        </div>
      </div>

      {networkCards.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {networkCards.map((card: any, i: number) => (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/business/${card.id}`)}
              className="flex-shrink-0 w-[140px] rounded-xl border border-border bg-card p-3 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                {card.logo_url ? (
                  <img src={card.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                    {card.full_name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground truncate">{card.full_name}</p>
              {card.company_name && (
                <p className="text-[10px] text-muted-foreground truncate">{card.company_name}</p>
              )}
              {card.category && (
                <span className="inline-block mt-1 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full truncate max-w-full">
                  {card.category}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-2">
            Find friends & family who have business cards on Instantly
          </p>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg text-xs gap-1"
            onClick={() => setShowManual(true)}
          >
            <Phone className="h-3 w-3" /> Sync Your Contacts
          </Button>
        </div>
      )}
    </div>
  );
};

export default NetworkCards;
