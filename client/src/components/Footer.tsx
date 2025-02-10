import { SiX, SiTelegram, SiLinkedin } from "react-icons/si";
import { Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 Devolved AI. All Rights Reserved.
          </p>
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
    </footer>
  );
}