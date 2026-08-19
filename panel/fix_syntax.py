with open('src/app/(dashboard)/DashboardPageClient.tsx', 'r', encoding='utf8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i == 697 or i == 698: # 0-indexed, so lines 698 and 699
        continue
    new_lines.append(line)

with open('src/app/(dashboard)/DashboardPageClient.tsx', 'w', encoding='utf8') as f:
    f.writelines(new_lines)
