const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

c = c.replace(/              <div className="w-full h-1 bg-white\/5 rounded-full overflow-hidden">\r?\n                <div className="h-full bg-yellow-400" style=\{\{ width:[^>]+>\r?\n            <\/div>\r?\n          \)\}/g,
`              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400" style={{ width: \`\${((displayCore?.stats?.swap_used || 0) / (displayCore?.stats?.swap_total || 1)) * 100}%\` }} />
              </div>
            </div>
          )}`);

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
