const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

c = c.replace(/                            \}\)\}\r?\n                          <\/div>\r?\n                        <\/div>\r?\n                      \)\}/g,
`                            })}
                        </div>
                      )}`);

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
