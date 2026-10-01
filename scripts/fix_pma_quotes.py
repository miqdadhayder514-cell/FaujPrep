from pathlib import Path

path = Path(r"c:\Users\Miqdad Haider\Desktop\FaujPrep\my-app\supabase\migrations\018_seed_pma_400_questions.sql")
text = path.read_text(encoding='utf-8')
out = []
in_string = False
changed = 0
i = 0
while i < len(text):
    ch = text[i]
    if ch == "'":
        if in_string:
            if i + 1 < len(text) and text[i + 1] == "'":
                out.append("''")
                i += 2
                continue
            nxt = text[i + 1] if i + 1 < len(text) else ''
            if nxt in (',', ')', '\n', '\r', ' ', '\t', '', ';'):
                out.append("'")
                in_string = False
                i += 1
                continue
            out.append("''")
            changed += 1
            i += 1
            continue
        else:
            out.append("'")
            in_string = True
            i += 1
            continue
    out.append(ch)
    i += 1

path.write_text(''.join(out), encoding='utf-8')
print(f"Escaped apostrophes in SQL strings: {changed}")
