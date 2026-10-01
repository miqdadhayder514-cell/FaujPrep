from pathlib import Path

path = Path(r"c:\Users\Miqdad Haider\Desktop\FaujPrep\my-app\supabase\migrations\018_seed_pma_400_questions.sql")
text = path.read_text(encoding='utf-8')
text = text.replace("''pma-", "'pma-")
text = text.replace("''::jsonb", "'::jsonb")
path.write_text(text, encoding='utf-8')
print('Patched PMA migration quote corruption')
