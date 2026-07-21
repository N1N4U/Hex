import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const uptimeSeconds = process.uptime();
    
    // Format the uptime nicely
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    let formatted = "";
    if (days > 0) formatted += `${days} days, `;
    if (hours > 0 || days > 0) formatted += `${hours} hrs, `;
    formatted += `${minutes} mins`;
    
    if (formatted === "0 mins") formatted = "Just started";

    return NextResponse.json({
      uptime: uptimeSeconds,
      formatted
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
