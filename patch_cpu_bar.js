const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

c = c.replace(/className="w-full h-4 bg-white\/5 rounded-full overflow-hidden mt-3 relative">\s*<div className="h-full flex absolute left-0 top-0" style=\{\{ width: \`\$\{cpuPct\}%\` \}\}>/g,
  `className="w-full h-4 bg-white/5 rounded-full overflow-hidden mt-3 flex">`);

c = c.replace(/className="w-full h-4 bg-white\/5 rounded-full overflow-hidden mt-1 relative">\s*<div className="h-full flex absolute left-0 top-0" style=\{\{ width: \`\$\{displayCore\.cpu\}%\` \}\}>/g,
  `className="w-full h-4 bg-white/5 rounded-full overflow-hidden mt-1 flex">`);

c = c.replace(/text-black/g, 'text-white text-shadow-sm');

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
