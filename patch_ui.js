const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

// Fix colors and text
const oldColors = "const colors = ['bg-green-400', 'bg-green-500', 'bg-green-600', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600', 'bg-teal-400', 'bg-teal-500', 'bg-teal-600'];";
const newColors = "const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500', 'bg-indigo-500', 'bg-teal-500'];";

c = c.split(oldColors).join(newColors);

c = c.replace(/className=\{\`h-full flex items-center justify-center text-\[8px\] font-bold text-black border-r border-black\/20 \$\{colors\[idx % colors\.length\]\}\`\}/g, 
"className={`h-full flex items-center justify-center text-[7px] font-bold text-black border-r border-black/20 overflow-hidden min-w-0 ${colors[idx % colors.length]}`}");

// Fix ugly scrollbar
c = c.replace(/className="flex-1 p-4 overflow-y-auto \[\&::\-webkit\-scrollbar\]:w-2 \[\&::\-webkit\-scrollbar\-thumb\]:bg-white\/10 \[\&::\-webkit\-scrollbar\-thumb\]:rounded-full"/g,
'className="flex-1 p-4 overflow-y-auto no-scrollbar"');

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
