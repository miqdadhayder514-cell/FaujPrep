import json
import re
from collections import Counter
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PDF = ROOT / "Full mock tests" / "PMA Long 159 Academic Portion Mock Test 4.pdf"
DATA_FILE = ROOT / "my-app" / "src" / "data" / "pmaLong159AcademicPortionMockTest4.json"
QUESTION_HEADING = re.compile(r"^Q(\d+)\.\s*(.*)$")
OPTION_LINE = re.compile(r"^\(([A-D])\)\s*(.*)$")
ANSWER_HEADING = re.compile(r"^Q(\d+)\.\s*Answer:\s*\(([A-D])\)\s*(.*)$")
SECTION_HEADING = re.compile(r"^SECTION ([A-E]):\s*(.+)$", re.IGNORECASE)


def clean_text(value):
    return re.sub(r"\s+", " ", value).strip()


def section_for(question_id):
    if question_id <= 24:
        return "Pakistan Studies"
    if question_id <= 48:
        return "General Knowledge"
    if question_id <= 72:
        return "Islamiyat"
    if question_id <= 96:
        return "Physics"
    return "English"


def is_page_decoration(line):
    return line.startswith("PMA Long Course 159") or line.startswith("Page ")


def parse_questions(source):
    questions = []
    current = None
    current_section = None
    current_difficulty = None

    def finish_question():
        nonlocal current
        if current is None:
            return
        question_id = current["id"]
        prompt = clean_text(" ".join(current["prompt"]))
        if not prompt:
            raise ValueError(f"Question {question_id} has no prompt.")
        if list(current["options"]) != list("ABCD"):
            raise ValueError(f"Question {question_id} must contain options A-D in order.")
        expected_section = section_for(question_id)
        if current["section"] != expected_section:
            raise ValueError(f"Question {question_id} is in {current['section']}, expected {expected_section}.")
        if not current["difficulty"]:
            raise ValueError(f"Question {question_id} has no difficulty label.")
        questions.append({
            "id": question_id,
            "question_text": prompt,
            "option_a": current["options"]["A"],
            "option_b": current["options"]["B"],
            "option_c": current["options"]["C"],
            "option_d": current["options"]["D"],
            "section": expected_section,
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

        section_heading = SECTION_HEADING.match(line)
        if section_heading:
            current_section = section_heading.group(2).title()
            continue
        if line in {"Easy Level", "Medium Level", "Hard Level"}:
            current_difficulty = line.removesuffix(" Level")
            continue

        heading = QUESTION_HEADING.match(line)
        if heading:
            finish_question()
            if current_section is None:
                raise ValueError(f"Question {heading.group(1)} appears before a section heading.")
            current = {
                "id": int(heading.group(1)),
                "section": current_section,
                "difficulty": current_difficulty,
                "prompt": [heading.group(2)],
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
        raise ValueError(f"Expected questions 1-120 in order; received {len(ids)} entries.")
    return questions


def parse_answer_key(source):
    try:
        key_source = source.split("ANSWER KEY", 1)[1].split("DETAILED ANSWERS", 1)[0]
    except IndexError as error:
        raise ValueError("The answer key or detailed answer section is missing.") from error

    pairs = re.findall(r"(?m)^\s*(\d+)\s*\n\s*([A-D])\s*$", key_source)
    answers = {int(question_id): answer for question_id, answer in pairs}
    if set(answers) != set(range(1, 121)) or len(answers) != 120:
        raise ValueError(f"Expected 120 answer-key pairs; found {len(answers)}.")
    return answers


def parse_detailed_answers(source):
    try:
        answer_source = source.split("DETAILED ANSWERS", 1)[1]
    except IndexError as error:
        raise ValueError("The detailed answer section is missing.") from error

    answers = {}
    current = None

    def finish_answer():
        nonlocal current
        if current is None:
            return
        current["explanation"] = clean_text(" ".join(current["explanation_parts"]))
        if not current["explanation"]:
            raise ValueError(f"Question {current['id']} has no explanation.")
        answers[current["id"]] = current
        current = None

    for raw_line in answer_source.splitlines():
        line = clean_text(raw_line)
        if not line or is_page_decoration(line) or re.match(r"^Section [A-E]:", line, re.IGNORECASE):
            continue
        heading = ANSWER_HEADING.match(line)
        if heading:
            finish_answer()
            current = {
                "id": int(heading.group(1)),
                "correct_option": heading.group(2),
                "answer_text": heading.group(3),
                "explanation_parts": [],
            }
        elif current is not None and not line.startswith("End of"):
            current["explanation_parts"].append(line)
    finish_answer()

    if set(answers) != set(range(1, 121)) or len(answers) != 120:
        raise ValueError(f"Expected detailed answers for questions 1-120; found {len(answers)}.")
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
    correct_text = question[f"option_{answer['correct_option'].lower()}"]
    if normalized(correct_text) != normalized(answer["answer_text"]):
        raise ValueError(f"Question {question_id}'s answer text does not match option {answer['correct_option']}.")
    question["correct_option"] = answer["correct_option"]
    question["explanation"] = answer["explanation"]

expected_sections = {
    "Pakistan Studies": 24,
    "General Knowledge": 24,
    "Islamiyat": 24,
    "Physics": 24,
    "English": 24,
}
if Counter(question["section"] for question in questions) != Counter(expected_sections):
    raise ValueError("The extracted section counts do not match the PDF cover page.")

DATA_FILE.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Generated {DATA_FILE} with {len(questions)} validated questions from {len(reader.pages)} PDF pages.")