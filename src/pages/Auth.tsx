import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Eye, EyeOff, Users, Store, Shield } from "lucide-react";
import { motion } from "framer-motion";

type RoleTab = "customer" | "business";

const DEMO_ACCOUNTS: Record<string, { email: string; password: string }> = {
  customer: { email: "customer@demo.com", password: "demo1234" },
  business: { email: "business@demo.com", password: "demo1234" },
  admin: { email: "admin@demo.com", password: "demo1234" },
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<RoleTab>("customer");
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({ title: error.message, variant: "destructive" });
      } else if (isSignUp) {
        toast({ title: "Check your email to confirm your account!" });
      } else {
        navigate("/my-passes");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: string) => {
    const creds = DEMO_ACCOUNTS[role];
    setLoading(true);
    try {
      const { error } = await signIn(creds.email, creds.password);
      if (error) {
        toast({ title: `Demo login failed: ${error.message}`, variant: "destructive" });
      } else {
        if (role === "admin") navigate("/admin");
        else if (role === "business") navigate("/business-dashboard");
        else navigate("/my-passes");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardContent className="p-6 pt-6 space-y-5">
            {/* Role tabs */}
            {!isSignUp && (
              <div className="flex rounded-full bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setRoleTab("customer")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all ${
                    roleTab === "customer"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRoleTab("business")}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all ${
                    roleTab === "business"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Store className="h-4 w-4" />
                  Business
                </button>
              </div>
            )}

            {/* Heading */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isSignUp ? "Create account" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp
                  ? "Sign up to get started"
                  : `Sign in as ${roleTab}`}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            {/* Quick demo */}
            {!isSignUp && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">quick demo</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("customer")}
                    disabled={loading}
                    className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 border-primary/20 bg-primary/5 py-3 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs font-semibold">Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("business")}
                    disabled={loading}
                    className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 border-primary/20 bg-primary/5 py-3 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    <Store className="h-5 w-5" />
                    <span className="text-xs font-semibold">Business</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("admin")}
                    disabled={loading}
                    className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 border-destructive/30 bg-destructive/5 py-3 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <Shield className="h-5 w-5" />
                    <span className="text-xs font-semibold">Admin</span>
                  </button>
                </div>
              </div>
            )}

            {/* Toggle sign up / sign in */}
            <div className="text-center pt-1">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary font-medium hover:underline"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
