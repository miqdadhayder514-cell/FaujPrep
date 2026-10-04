import json
import re
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[2]
SOURCE_PDF = ROOT / "Full mock tests" / "PMA Long Course159 Mock Test 2.pdf"
DATA_FILE = ROOT / "my-app" / "src" / "data" / "pmaLongCourse159MockTest2.json"
IMAGE_DIR = ROOT / "my-app" / "public" / "images" / "mock-tests" / "pma-lc159-mock-test-2"


def section_for(question_id):
    if question_id <= 60:
        return "Verbal Intelligence"
    if question_id <= 120:
        return "Non-Verbal Intelligence"
    if question_id <= 130:
        return "Mathematics"
    if question_id <= 150:
        return "Pakistan Studies"
    if question_id <= 160:
        return "Physics"
    if question_id <= 190:
        return "English"
    if question_id <= 210:
        return "General Knowledge"
    return "Islamic Studies"


def clean_text(value):
    return re.sub(r"\s+", " ", value).strip()


def is_page_decoration(line):
    return (
        line == "PMA Long Course 159 - Full Mock Test"
        or line.startswith("Page ")
        or line.startswith("SECTION ")
        or line.startswith("Section ")
        or line.startswith("Subject ")
        or line.startswith("Questions ")
        or line.startswith("Q. numbers")
        or line.startswith("Suggested time")
    )


def parse_questions(document):
    questions = {}
    current = None

    def finish_question():
        nonlocal current
        if current is None:
            return

        question_id = current["id"]
        prompt = clean_text(" ".join(current["prompt"]))
        if not prompt:
            raise ValueError(f"Question {question_id} has no prompt.")

        if 61 <= question_id <= 120:
            if current["options"]:
                raise ValueError(f"Visual question {question_id} unexpectedly has text options.")
            option_count = 5 if "odd one out" in prompt.lower() else 4
            options = {letter: f"Figure {letter}" for letter in "ABCDE"[:option_count]}
        else:
            options = current["options"]
            if set(options) != set("ABCD"):
                raise ValueError(f"Question {question_id} must have four text options; found {sorted(options)}.")

        questions[question_id] = {
            "id": question_id,
            "question_text": f"{section_for(question_id)}: {prompt}",
            "option_a": options["A"],
            "option_b": options["B"],
            "option_c": options["C"],
            "option_d": options["D"],
            "section": section_for(question_id),
        }
        if "E" in options:
            questions[question_id]["option_e"] = options["E"]
        current = None

    questions_finished = False
    for page in document:
        for raw_line in page.get_text().splitlines():
            line = clean_text(raw_line)
            if not line or is_page_decoration(line):
                continue
            if line.upper().startswith("ANSWER KEY"):
                finish_question()
                questions_finished = True
                break

            question_heading = re.match(r"^Q(\d+)\.\s*(.*)$", line)
            if question_heading:
                rest = question_heading.group(2)
                if re.match(r"\[[EMH]\]\s*\([A-E]\)", rest):
                    finish_question()
                    continue
                finish_question()
                question_id = int(question_heading.group(1))
                if question_id > 220:
                    continue
                current = {"id": question_id, "prompt": [rest], "options": {}}
                continue

            if current is None:
                continue

            option = re.match(r"^\(([A-E])\)\s*(.*)$", line)
            if option:
                letter, value = option.groups()
                if letter in current["options"]:
                    raise ValueError(f"Question {current['id']} repeats option {letter}.")
                current["options"][letter] = value
            elif len(current["options"]) < 4:
                current["prompt"].append(line)
            elif current["id"] not in range(61, 121):
                last_letter = max(current["options"])
                current["options"][last_letter] = clean_text(f"{current['options'][last_letter]} {line}")
        if questions_finished:
            break

    finish_question()

    expected_ids = set(range(1, 221))
    if set(questions) != expected_ids:
        missing = sorted(expected_ids - set(questions))
        extra = sorted(set(questions) - expected_ids)
        raise ValueError(f"Question coverage mismatch. Missing: {missing}; extra: {extra}.")
    return questions


def parse_answers(document):
    answers = {}
    current = None
    answer_heading = re.compile(r"^Q(\d+)\.\s*\[([EMH])\]\s*\(([A-E])\)\s*(.*)$")

    def finish_answer():
        nonlocal current
        if current is None:
            return
        question_id, difficulty, correct_option, explanation_parts = current
        explanation = clean_text(" ".join(explanation_parts))
        if not explanation:
            raise ValueError(f"Question {question_id} has no explanation.")
        answers[question_id] = {
            "correct_option": correct_option,
            "difficulty": {"E": "Easy", "M": "Medium", "H": "Hard"}[difficulty],
            "explanation": explanation,
        }
        current = None

    for page in document:
        for raw_line in page.get_text().splitlines():
            line = clean_text(raw_line)
            if not line or is_page_decoration(line):
                continue
            answer = answer_heading.match(line)
            if answer:
                finish_answer()
                question_id, difficulty, correct_option, explanation = answer.groups()
                current = [int(question_id), difficulty, correct_option, [explanation]]
            elif current is not None:
                if line.startswith("ANSWER KEY") or line.startswith("DETAILED ANSWERS"):
                    continue
                current[3].append(line)
    finish_answer()

    expected_ids = set(range(1, 221))
    if set(answers) != expected_ids:
        missing = sorted(expected_ids - set(answers))
        extra = sorted(set(answers) - expected_ids)
        raise ValueError(f"Answer coverage mismatch. Missing: {missing}; extra: {extra}.")
    return answers


def extract_visuals(document, questions):
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    extracted = set()

    for page in document:
        question_ids = []
        for line in page.get_text().splitlines():
            heading = re.match(r"^Q(\d+)\.\s*(.*)$", clean_text(line))
            is_answer_line = heading and re.match(r"\[[EMH]\]\s*\([A-E]\)", heading.group(2))
            if heading and not is_answer_line and 61 <= int(heading.group(1)) <= 120:
                question_ids.append(int(heading.group(1)))

        if not question_ids:
            continue

        image_infos = sorted(page.get_image_info(xrefs=True), key=lambda info: info["bbox"][1])
        if len(image_infos) != len(question_ids):
            raise ValueError(
                f"Page {page.number + 1} has {len(question_ids)} figure questions "
                f"but {len(image_infos)} embedded figures."
            )

        for question_id, info in zip(question_ids, image_infos):
            image_file = IMAGE_DIR / f"q{question_id:03d}.png"
            if info["xref"]:
                pixmap = pymupdf.Pixmap(document, info["xref"])
                if pixmap.n - pixmap.alpha > 3:
                    pixmap = pymupdf.Pixmap(pymupdf.csRGB, pixmap)
                pixmap.save(image_file)
            else:
                pixmap = page.get_pixmap(dpi=180, clip=pymupdf.Rect(info["bbox"]), alpha=False)
                pixmap.save(image_file)
            questions[question_id]["image_url"] = f"/images/mock-tests/pma-lc159-mock-test-2/q{question_id:03d}.png"
            extracted.add(question_id)

    if extracted != set(range(61, 121)):
        missing = sorted(set(range(61, 121)) - extracted)
        raise ValueError(f"Visual image coverage mismatch. Missing question images: {missing}.")
    return extracted


def main():
    if not SOURCE_PDF.is_file():
        raise FileNotFoundError(f"Source PDF not found: {SOURCE_PDF}")

    document = pymupdf.open(SOURCE_PDF)
    questions = parse_questions(document)
    answers = parse_answers(document)
    visual_ids = extract_visuals(document, questions)

    for question_id, question in questions.items():
        question.update(answers[question_id])

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(list(questions.values()), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(questions)} questions, {len(answers)} answer explanations, and {len(visual_ids)} figure images.")


if __name__ == "__main__":
    main()