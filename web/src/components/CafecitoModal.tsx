"use client";

import { Coffee, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const STORAGE_KEY = "cafecito-modal-closed";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 8000;

export function CafecitoModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const lastClosedStr = localStorage.getItem(STORAGE_KEY);
    if (lastClosedStr) {
      const lastClosed = Number.parseInt(lastClosedStr, 10);
      const now = Date.now();
      if (now - lastClosed < ONE_DAY_MS) {
        return;
      }
    }

    setShouldShow(true);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!shouldShow || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <Card className="relative w-80 shadow-2xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <CardContent className="pt-6 pb-5 px-5">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 flex-shrink-0">
              <Coffee className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-1">¿Te gusta La Brecha?</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3 leading-relaxed">
                ¡Invitame un cafecito! Tu apoyo ayuda a mantener el sitio funcionando y mejorando.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  asChild
                >
                  <a
                    href="https://cafecito.app/finlatam"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Coffee className="h-4 w-4" />
                    Invitar un café
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
                >
                  Más tarde
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
