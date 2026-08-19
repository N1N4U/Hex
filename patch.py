import re
with open('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'r', encoding='utf8') as f:
    c = f.read()
c = c.replace('ram: Number(((stats.mem_used || 0) / (1024 * 1024 * 1024)).toFixed(1)),', 'ram: Number(((stats.mem_used || 0) / (1024 * 1024 * 1024)).toFixed(3)),')
c = c.replace('ramTotal: Number(((stats.mem_total || 0) / (1024 * 1024 * 1024)).toFixed(0)),', 'ramTotal: Number(((stats.mem_total || 0) / (1024 * 1024 * 1024)).toFixed(2)),')
c = c.replace('subText={$$' + '{ramUsed < 1 ? Math.round(ramUsed * 1024) + \\' MB\\' : ramUsed.toFixed(1) + \\' GB\\'} / ' + '{ramTotal} GB}', 'subText={$$' + '{ramUsed < 1 ? (ramUsed * 1024).toFixed(0) + \\' MB\\' : ramUsed.toFixed(2) + \\' GB\\'} / ' + '{ramTotal} GB}')
with open('panel/src/app/(dashboard)/DashboardPageClient.tsx', 'w', encoding='utf8') as f:
    f.write(c)
