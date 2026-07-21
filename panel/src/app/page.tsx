import DashboardPageClient from "./DashboardPageClient";

export default function DesktopPage() {
  const panelName = process.env.Name || "Hex";
  const links = {
    discord: process.env.LABEL_DISCORD || "#",
    github: process.env.LABEL_GITHUB || "#",
    feedback: process.env.LABEL_FEEDBACK || "#",
  };

  return <DashboardPageClient panelName={panelName} links={links} />;
}
