import DesktopLayoutClient from "./DesktopLayoutClient";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const defaultWallpaper = process.env.DEFAULT_WALLPAPER || "beautiful-shot-snowy-mountain-sunset.jpg";
  const links = {
    discord: process.env.LABEL_DISCORD || "#",
    github: process.env.LABEL_GITHUB || "#",
    feedback: process.env.LABEL_FEEDBACK || "#"
  };

  return <DesktopLayoutClient defaultWallpaper={defaultWallpaper} links={links}>{children}</DesktopLayoutClient>;
}
