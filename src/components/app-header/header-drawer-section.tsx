import { cn } from "@/lib/utils";

export function HeaderDrawerSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-col">{children}</div>;
}

export function HeaderDrawerSectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="ml-5 mb-1 text-xs font-light text-muted-foreground">
      {children}
    </span>
  );
}

export function HeaderDrawerSectionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[27px] backdrop-blur-md bg-background/70 border border-border shadow-lg flex flex-col gap-0 p-2 transition-all duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
