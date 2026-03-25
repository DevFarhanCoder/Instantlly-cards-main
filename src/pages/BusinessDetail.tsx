import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, MessageCircle, Globe, MapPin, Star, Share2, Heart, CalendarCheck, Mail, Clock, Calendar, ShieldCheck, Camera, X, UserPlus, UserMinus, Flag, Users } from "lucide-react";
import ShareCardModal from "@/components/ShareCardModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import BookAppointmentModal from "@/components/BookAppointmentModal";
import { useReviews } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import { useCreateConversation } from "@/hooks/useMessages";
import { useDirectoryCard } from "@/hooks/useDirectoryCards";
import { Skeleton } from "@/components/ui/skeleton";
import { trackCardEvent } from "@/lib/analytics";
import LeadForm from "@/components/business/LeadForm";
import { useBusinessFollows } from "@/hooks/useBusinessFollows";
import { useReportBusiness, useDisputes } from "@/hooks/useReports";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { user } = useAuth();
  const createConversation = useCreateConversation();
  const { data: card, isLoading } = useDirectoryCard(id || "");
  const { reviews, createReview, uploadReviewPhoto } = useReviews(id || "");
  const { followersCount, isFollowing, toggleFollow } = useBusinessFollows(id);
  const reportBusiness = useReportBusiness();
  const { createDispute } = useDisputes();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeType, setDisputeType] = useState("booking");
  const [disputeDescription, setDisputeDescription] = useState("");

  // Track profile view
  useEffect(() => {
    if (id && card) {
      trackCardEvent(id, "view");
    }
  }, [id, card]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="text-5xl mb-3">🔍</span>
        <p className="text-muted-foreground">Business not found</p>
        <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { toast.error("Please select a rating"); return; }
    if (!user) { toast.error("Please sign in to review"); navigate("/auth"); return; }
    try {
      setUploadingPhotos(true);
      const photoUrls: string[] = [];
      for (const file of reviewPhotos) {
        const url = await uploadReviewPhoto(file);
        photoUrls.push(url);
      }
      await createReview.mutateAsync({ rating: reviewRating, comment: reviewComment || undefined, photo_urls: photoUrls.length > 0 ? photoUrls : undefined });
      toast.success("Review submitted! Thanks for your feedback ⭐");
      setShowReviewDialog(false);
      setReviewRating(0);
      setReviewComment("");
      setReviewPhotos([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const allReviews = reviews.map((r) => ({
    id: r.id,
    userName: user?.email?.split("@")[0] || "User",
    rating: r.rating,
    comment: r.comment || "",
    photo_urls: r.photo_urls || [],
    date: new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }),
  }));

  const shareUrl = `${window.location.origin}/card/${card.id}`;

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Business Details</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleFavorite(card.id)}>
            <Heart className={`h-5 w-5 transition-colors ${isFavorite(card.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
          </button>
          <button onClick={() => setShowShareCard(true)}>
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </button>
          <button onClick={() => setShowReportDialog(true)}>
            <Flag className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl overflow-hidden shrink-0">
            {card.logo_url ? <img src={card.logo_url} alt="" className="h-full w-full object-cover" /> : <span>🏢</span>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-foreground">{card.full_name}</h2>
              {(card as any).is_verified && (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
            </div>
            {card.job_title && <p className="text-sm text-primary font-medium">{card.job_title}</p>}
            {card.company_name && <p className="text-sm text-muted-foreground">{card.company_name}</p>}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {card.category && <Badge variant="secondary" className="text-xs">{card.category}</Badge>}
              <Badge className={`text-xs border ${card.service_mode === "home" ? "bg-blue-100 text-blue-700 border-blue-200" : card.service_mode === "both" ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                {card.service_mode === "home" ? "🏠 Home Service" : card.service_mode === "both" ? "🔄 Home & Visit" : "🏪 Visit"}
              </Badge>
              {(card as any).is_verified && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">✓ Verified</Badge>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {allReviews.length > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="text-xs text-muted-foreground">({allReviews.length})</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {followersCount} followers
              </div>
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="h-7 text-[11px] rounded-lg gap-1"
                onClick={() => {
                  if (!user) { toast.error("Please sign in to follow"); navigate("/auth"); return; }
                  toggleFollow.mutate();
                }}
              >
                {isFollowing ? <><UserMinus className="h-3 w-3" /> Unfollow</> : <><UserPlus className="h-3 w-3" /> Follow</>}
              </Button>
            </div>
          </div>
        </motion.div>

        {card.description && <p className="text-sm text-muted-foreground">{card.description}</p>}

        {card.offer && (
          <div className="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
            🎁 {card.offer}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
          <div className="space-y-2 text-sm text-foreground">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {card.phone}</div>
            {card.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {card.email}</div>}
            {card.whatsapp && (
              <a href={`https://wa.me/${card.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                <MessageCircle className="h-4 w-4" /> WhatsApp: {card.whatsapp}
              </a>
            )}
            {card.telegram && (
              <a href={`https://t.me/${card.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                <MessageCircle className="h-4 w-4" /> Telegram: {card.telegram}
              </a>
            )}
            {card.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {card.location}</div>}
            {card.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> {card.website}</div>}
            {card.business_hours && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> {card.business_hours}</div>}
          </div>
        </div>

        {card.services && card.services.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Services</h3>
            <div className="flex flex-wrap gap-2">
              {card.services.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {card.location && (
          <div className="rounded-xl border border-border bg-muted h-40 flex items-center justify-center cursor-pointer"
            onClick={() => { trackCardEvent(card.id, "direction_click"); window.open(`https://maps.google.com/?q=${encodeURIComponent(card.location!)}`); }}>
            <div className="text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{card.location}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4">
          <QRCodeSVG value={shareUrl} size={120} />
          <p className="mt-2 text-xs text-muted-foreground">Scan to save this card</p>
        </div>

        {/* Reviews */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Reviews</h3>
            <Button size="sm" variant="outline" className="text-xs rounded-lg gap-1" onClick={() => {
              if (!user) { toast.error("Please sign in to write a review"); navigate("/auth"); return; }
              setShowReviewDialog(true);
            }}>
              <Star className="h-3 w-3" /> Write a Review
            </Button>
          </div>
          {allReviews.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No reviews yet. Be the first to review!</p>
          ) : (
            allReviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{r.userName}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.comment}</p>
                {r.photo_urls.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {r.photo_urls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Review"
                        className="h-16 w-16 rounded-lg object-cover shrink-0 border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setLightboxImage(url)}
                      />
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">{r.date}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lead Form */}
      <div className="px-4 pb-4">
        <LeadForm businessCardId={card.id} businessName={card.full_name} />
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3 flex gap-2">
        <Button className="flex-1 gap-1.5 rounded-xl py-5" onClick={async () => {
          trackCardEvent(card.id, "message_click");
          if (!user) { toast.error("Please sign in to message"); navigate("/auth"); return; }
          await createConversation.mutateAsync({ businessId: card.id, businessName: card.full_name, businessAvatar: card.logo_url || "🏢" });
          navigate("/messaging");
        }}>
          <MessageCircle className="h-4 w-4" /> Message
        </Button>
        <Button variant="outline" className="flex-1 gap-1.5 rounded-xl py-5" onClick={() => { trackCardEvent(card.id, "phone_click"); window.open(`tel:${card.phone}`); }}>
          <Phone className="h-4 w-4" /> Call
        </Button>
        {card.whatsapp && (
          <Button variant="outline" className="gap-1.5 rounded-xl py-5 text-green-600" onClick={() => window.open(`https://wa.me/${card.whatsapp!.replace(/[^0-9]/g, "")}`)}>
            <MessageCircle className="h-4 w-4" /> WA
          </Button>
        )}
        <Button variant="outline" className="gap-1.5 rounded-xl py-5" onClick={() => setShowBooking(true)}>
          <CalendarCheck className="h-4 w-4" /> Book
        </Button>
        <Button variant="outline" className="gap-1.5 rounded-xl py-5 text-xs" onClick={() => {
          if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }
          setShowDisputeDialog(true);
        }}>
          <Flag className="h-4 w-4" />
        </Button>
      </div>

      {/* Write Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Your Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setReviewRating(s)}>
                    <Star className={`h-7 w-7 transition-colors ${s <= reviewRating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              placeholder="Share your experience..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-primary font-medium">
                <Camera className="h-4 w-4" />
                <span>Add Photos ({reviewPhotos.length}/3)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 3 - reviewPhotos.length);
                    setReviewPhotos((prev) => [...prev, ...files].slice(0, 3));
                  }}
                />
              </label>
              {reviewPhotos.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {reviewPhotos.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />
                      <button onClick={() => setReviewPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground h-4 w-4 flex items-center justify-center">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl" onClick={handleSubmitReview} disabled={createReview.isPending || uploadingPhotos}>
              {uploadingPhotos ? "Uploading photos..." : createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Photo Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="sm:max-w-lg p-1 bg-black/90 border-none">
          {lightboxImage && (
            <div className="relative flex items-center justify-center min-h-[300px]">
              <img src={lightboxImage} alt="Review photo" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-2 right-2 rounded-full bg-black/50 text-white h-8 w-8 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BookAppointmentModal
        open={showBooking}
        onOpenChange={setShowBooking}
        businessName={card.full_name}
        businessLogo={card.logo_url || "🏢"}
        businessId={card.id}
      />
      <ShareCardModal
        open={showShareCard}
        onOpenChange={setShowShareCard}
        data={{
          fullName: card.full_name,
          companyName: card.company_name,
          jobTitle: card.job_title,
          phone: card.phone,
          email: card.email,
          location: card.location,
          website: card.website,
          category: card.category,
          offer: card.offer,
          services: card.services,
          logoUrl: card.logo_url,
          shareUrl,
        }}
      />

      {/* Report Business Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fake_listing">Fake or misleading listing</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="spam">Spam or scam</SelectItem>
                <SelectItem value="wrong_info">Wrong information</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Additional details (optional)..." value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} rows={3} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl" disabled={!reportReason || reportBusiness.isPending} onClick={async () => {
              try {
                await reportBusiness.mutateAsync({ business_id: card.id, reason: reportReason, details: reportDetails });
                toast.success("Report submitted. We'll review it shortly.");
                setShowReportDialog(false);
                setReportReason("");
                setReportDetails("");
              } catch { toast.error("Failed to submit report"); }
            }}>
              {reportBusiness.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">Booking issue</SelectItem>
                <SelectItem value="voucher">Voucher issue</SelectItem>
                <SelectItem value="service">Service complaint</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Describe the issue..." value={disputeDescription} onChange={(e) => setDisputeDescription(e.target.value)} rows={3} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl" disabled={!disputeDescription.trim()} onClick={async () => {
              try {
                await createDispute.mutateAsync({ dispute_type: disputeType, reference_id: card.id, business_id: card.id, description: disputeDescription });
                toast.success("Dispute filed. Our team will review it.");
                setShowDisputeDialog(false);
                setDisputeDescription("");
              } catch { toast.error("Failed to file dispute"); }
            }}>
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessDetail;
