import re
from pathlib import Path

path = Path(r"c:\Users\Miqdad Haider\Desktop\FaujPrep\my-app\supabase\migrations\018_seed_pma_400_questions.sql")
text = path.read_text(encoding='utf-8')
for idx, line in enumerate(text.splitlines(), 1):
    if re.search(r"[A-Za-z0-9](?:'|’)[A-Za-z0-9]", line):
        if any(token in line.lower() for token in ('mother', 'it', 'is', 'a person', 'from a', 'girl', 'student', 'teacher', 'owner', 'he', 'she', 'who', 'they', 'bilal', 'hadi', 'nadia')):
            print(f"{idx}: {line[:220]}")
