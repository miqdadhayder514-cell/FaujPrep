import json
import re
from collections import Counter
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PDF = ROOT / "Full mock tests" / "PMA Long 159 Academic Portion Mock Test 3.pdf"
DATA_FILE = ROOT / "my-app" / "src" / "data" / "pmaLong159AcademicPortionMockTest3.json"
QUESTION_HEADING = re.compile(r"^(\d+)\.\s+\[(Easy|Medium|Hard)\]\s*(.*)$")
OPTION_LINE = re.compile(r"^\(([A-D])\)\s*(.*)$")
ANSWER_HEADING = re.compile(r"^Q(\d+)\s+\[(Easy|Medium|Hard)\]\s+[—–-]\s*Answer:\s*\(([A-D])\)\s*(.*)$")


def clean_text(value):
    return re.sub(r"\s+", " ", value).strip()


def section_for(question_id):
    if question_id <= 25:
        return "Pakistan Studies"
    if question_id <= 45:
        return "General Knowledge"
    if question_id <= 70:
        return "Islamiyat"
    if question_id <= 95:
        return "Physics"
    return "English"


def is_page_decoration(line):
    return line.startswith("PMA Long Course 159") or line.startswith("Page ")


def parse_questions(source):
    questions = []
    current = None

    def finish_question():
        nonlocal current
        if current is None:
            return
        prompt = clean_text(" ".join(current["prompt"]))
        if not prompt:
            raise ValueError(f"Question {current['id']} has no prompt.")
        if list(current["options"]) != list("ABCD"):
            raise ValueError(f"Question {current['id']} must contain options A-D in order.")
        questions.append({
            "id": current["id"],
            "question_text": prompt,
            "option_a": current["options"]["A"],
            "option_b": current["options"]["B"],
            "option_c": current["options"]["C"],
            "option_d": current["options"]["D"],
            "section": section_for(current["id"]),
            "difficulty": current["difficulty"],
        })
        current = None

    for raw_line in source.splitlines():
        line = clean_text(raw_line)
        if not line or is_page_decoration(line):
            continue
        if line.startswith("ANSWER KEY"):
            finish_question()
            break

        heading = QUESTION_HEADING.match(line)
        if heading:
            finish_question()
            current = {
                "id": int(heading.group(1)),
                "difficulty": heading.group(2),
                "prompt": [heading.group(3)],
                "options": {},
            }
            continue

        if current is None:
            continue
        option = OPTION_LINE.match(line)
        if option:
            letter, value = option.groups()
            if letter in current["options"] or letter != "ABCD"[len(current["options"]):len(current["options"]) + 1]:
                raise ValueError(f"Question {current['id']} has an out-of-order or duplicate option {letter}.")
            current["options"][letter] = value
        elif len(current["options"]) < 4:
            current["prompt"].append(line)
        else:
            last_letter = "ABCD"[len(current["options"]) - 1]
            current["options"][last_letter] = clean_text(f"{current['options'][last_letter]} {line}")

    ids = [question["id"] for question in questions]
    if ids != list(range(1, 121)):
        raise ValueError(f"Expected questions 1-120 in order; received {len(ids)} entries: {ids}.")
    return questions


def parse_answer_key(source):
    try:
        key_source = source.split("ANSWER KEY (quick check)", 1)[1].split("DETAILED ANSWERS WITH TRICKS", 1)[0]
    except IndexError as error:
        raise ValueError("The answer key or detailed answer section is missing.") from error

    question_ids = []
    answers = []
    for raw_line in key_source.splitlines():
        line = raw_line.strip()
        if re.fullmatch(r"\d+", line):
            question_ids.append(int(line))
        elif re.fullmatch(r"[A-D]", line):
            answers.append(line)
    if question_ids != list(range(1, 121)) or len(answers) != 120:
        raise ValueError(f"Expected 120 ordered answer-key entries; found {len(question_ids)} IDs and {len(answers)} answers.")
    return dict(zip(question_ids, answers, strict=True))


def parse_detailed_answers(source):
    try:
        answer_source = source.split("DETAILED ANSWERS WITH TRICKS", 1)[1]
    except IndexError as error:
        raise ValueError("The detailed answer section is missing.") from error

    answers = {}
    current = None
    field = None

    def finish_answer():
        nonlocal current
        if current is None:
            return
        current["explanation"] = clean_text(" ".join(current.pop("explanation_parts")))
        current["trick"] = clean_text(" ".join(current.pop("trick_parts")))
        if not current["explanation"] or not current["trick"]:
            raise ValueError(f"Question {current['id']} is missing an explanation or trick.")
        answers[current["id"]] = current
        current = None

    for raw_line in answer_source.splitlines():
        line = clean_text(raw_line)
        if not line or is_page_decoration(line):
            continue
        heading = ANSWER_HEADING.match(line)
        if heading:
            finish_answer()
            current = {
                "id": int(heading.group(1)),
                "difficulty": heading.group(2),
                "correct_option": heading.group(3),
                "answer_text": heading.group(4),
                "explanation_parts": [],
                "trick_parts": [],
            }
            field = "answer_text"
            continue
        if current is None:
            if line.startswith("End of mock test"):
                break
            continue
        if line.startswith("Explanation:"):
            field = "explanation_parts"
            current[field].append(line.removeprefix("Explanation:").strip())
        elif re.match(r"^(?:⚡\s*)?Trick:", line):
            field = "trick_parts"
            current[field].append(re.sub(r"^(?:⚡\s*)?Trick:\s*", "", line))
        elif field == "answer_text":
            current[field] = clean_text(f"{current[field]} {line}")
        else:
            current[field].append(line)
    finish_answer()

    if list(sorted(answers)) != list(range(1, 121)):
        raise ValueError(f"Expected detailed answers for questions 1-120; found {len(answers)} entries.")
    return answers


def normalized(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


reader = PdfReader(SOURCE_PDF)
source_text = "\n".join(page.extract_text() or "" for page in reader.pages)
questions = parse_questions(source_text)
answer_key = parse_answer_key(source_text)
detailed_answers = parse_detailed_answers(source_text)

for question in questions:
    question_id = question["id"]
    answer = detailed_answers[question_id]
    if answer_key[question_id] != answer["correct_option"]:
        raise ValueError(f"Question {question_id} has conflicting answer-key and detailed-answer options.")
    if answer["difficulty"] != question["difficulty"]:
        raise ValueError(f"Question {question_id} has conflicting difficulty labels.")
    correct_text = question[f"option_{answer['correct_option'].lower()}"]
    if normalized(correct_text) != normalized(answer["answer_text"]):
        raise ValueError(f"Question {question_id}'s answer text does not match option {answer['correct_option']}.")
    question["correct_option"] = answer["correct_option"]
    question["explanation"] = f"{answer['explanation']} Trick: {answer['trick']}"

expected_sections = {
    "Pakistan Studies": 25,
    "General Knowledge": 20,
    "Islamiyat": 25,
    "Physics": 25,
    "English": 25,
}
if Counter(question["section"] for question in questions) != Counter(expected_sections):
    raise ValueError("The extracted section counts do not match the PDF cover page.")

DATA_FILE.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Generated {DATA_FILE} with {len(questions)} validated questions from {len(reader.pages)} PDF pages.")