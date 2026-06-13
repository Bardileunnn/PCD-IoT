import { useState } from "react";
import { useLocation } from "wouter";
import { Shell } from "@/components/layout/shell";
import { GlassCard } from "@/components/ui/glass-card";
import { NeonButton } from "@/components/ui/neon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { login } from "@/lib/auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      // Login flow
      const result = login(username, password);
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          setLocation("/dashboard");
        }, 1000);
      } else {
        setError(result.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <Shell className="items-center justify-center p-4">
      {/* Back Button */}
      <button
        onClick={() => setLocation("/")}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-mono text-sm uppercase">Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 max-w-5xl w-full gap-8">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-8">
          <h1 className="text-4xl font-bold text-white uppercase">AGV <span className="text-neon-blue">LINE FOLLOWER</span></h1>
          <p className="text-white/50 font-mono mt-2 tracking-widest uppercase">Berbasis IoT</p>
        </motion.div>

        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <GlassCard className="p-8 md:p-12 h-full">
            <h3 className="text-2xl font-bold text-white mb-8 uppercase">Authenticate</h3>
            
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-neon-red/20 border border-neon-red/50 text-neon-red text-sm font-mono"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-neon-green/20 border border-neon-green/50 text-neon-green text-sm font-mono"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-white/70 font-mono text-xs uppercase">Operator ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                  <Input 
                    placeholder="Masukkan Nama/ID" 
                    className="pl-10 bg-white/5 border-white/10 text-white font-mono h-12"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 font-mono text-xs uppercase">Access Key</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-white/30" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 bg-white/5 border-white/10 text-white font-mono h-12" 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <NeonButton 
                type="submit" 
                variant="blue"
                className="w-full mt-4 py-4 uppercase"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Enter Mainframe"}
              </NeonButton>
            </form>
          </GlassCard>
        </motion.div>
      </div>
    </Shell>
  );
}