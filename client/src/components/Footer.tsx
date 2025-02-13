import { SiX, SiTelegram, SiLinkedin } from "react-icons/si";
import { Globe, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Footer() {
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleReset = () => {
    if (typeof window !== 'undefined' && window.clearAllGameState) {
      window.clearAllGameState();
    }
    setShowResetDialog(false);
  };

  return (
    <footer className="mt-16 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Devolved AI. All Rights Reserved.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Game Data
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://devolvedai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-5 w-5" />
            </a>
            <a
              href="https://x.com/devolvedai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <SiX className="h-5 w-5" />
            </a>
            <a
              href="https://t.me/devolvedai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <SiTelegram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Game Data</DialogTitle>
            <DialogDescription>
              This will clear all your chat history and game progress. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  );
}