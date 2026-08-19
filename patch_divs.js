const fs = require('fs');
let c = fs.readFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'utf8');

c = c.replace(/              <\/div>\r?\n            <\/div>\r?\n          \)\}\r?\n        <\/div>/g, 
`            </div>
          )}
        </div>`);

c = c.replace(/                          <\/div>\r?\n                        <\/div>\r?\n                      \)\}\r?\n                  <\/div>/g,
`                        </div>
                      )}
                  </div>`);

fs.writeFileSync('panel/src/app/(dashboard)/DashboardPageClient.tsx', c);
