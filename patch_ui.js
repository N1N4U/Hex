const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

c = c.replace(/\{usage > 5 \? `\$\{idx\}:\$\{usage\.toFixed\(0\)\}%` : ''\}/g, '{`${idx}:${usage.toFixed(0)}%`}');

// Update colors to be a bit more green/blue focused for cpu cores
c = c.replace(/const colors = \['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500', 'bg-indigo-500', 'bg-teal-500'\];/g, 
"const colors = ['bg-green-500', 'bg-emerald-400', 'bg-teal-500', 'bg-cyan-400', 'bg-blue-500', 'bg-indigo-400', 'bg-purple-500', 'bg-fuchsia-400', 'bg-pink-500', 'bg-rose-400'];");

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
