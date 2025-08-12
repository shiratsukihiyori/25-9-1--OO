import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from '../contexts/LanguageContext';

// Empty component
export function Empty() {
  const { t } = useLanguage();
  return (
    <div className={cn("flex h-full items-center justify-center text-center p-4")} onClick={() => toast('Coming soon')}>
<div dangerouslySetInnerHTML={{ __html: t('creditText') }}></div>
    </div>
  );
}