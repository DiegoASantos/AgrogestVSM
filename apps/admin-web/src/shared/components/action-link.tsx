import Link from "next/link";

type ActionLinkProps = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function ActionLink({ href, label, variant = "primary" }: ActionLinkProps) {
  return (
    <Link className={`action-link action-link--${variant}`} href={href}>
      {label}
    </Link>
  );
}
