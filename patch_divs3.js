const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

c = c.replace(/(\s*\}\)\}\s*)<\/div>\s*<\/div>\s*\)\}/g, "$1</div>\n                      )}");

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
