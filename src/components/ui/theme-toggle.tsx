// This component is kept as a placeholder but doesn't do anything anymore
import { Button } from "@/components/ui/button";
import { Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { t } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full"
      disabled
    >
      <Sun className="h-5 w-5" />
      <span className="sr-only">{t("common.lightMode")}</span>
    </Button>
  );
}
