import LockScreenClient from "./LockScreenClient";

export default function LoginPage() {
  const envConfig = {
    ownerUsername: process.env.OWNER_USERNAME || "admin",
    ownerPassword: process.env.OWNER_PASSWORD || "admin",
    discordToggle: process.env.DISCORD_TOGGLE === "true",
    googleToggle: process.env.GOOGLE_AUTH_TOGGLE === "true",
    smtpToggle: process.env.SMTP_TOGGLE === "true",
    defaultWallpaper: process.env.DEFAULT_WALLPAPER || "beautiful-shot-snowy-mountain-sunset.jpg"
  };

  return <LockScreenClient envConfig={envConfig} />;
}
