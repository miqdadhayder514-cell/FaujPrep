import json
import re
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[2]
SECTION_LAYOUT = [
    ("Verbal Intelligence", 60),
    ("Non-Verbal Intelligence", 60),
    ("Mathematics", 10),
    ("Pakistan Studies", 20),
    ("Physics", 10),
    ("English", 30),
    ("General Knowledge", 20),
    ("Islamic Studies", 10),
]
SECTION_STARTS = {}
current_start = 1
for section_name, count in SECTION_LAYOUT:
    SECTION_STARTS[section_name] = current_start
    current_start += count


def clean_text(value):
    return re.sub(r"\s+", " ", value).strip()


def section_name_from_heading(line):
    match = re.search(r"SECTION \d+: ([^(]+)", line, re.IGNORECASE)
    if not match:
        return None
    name = clean_text(match.group(1)).lower()
    for section_name, _ in SECTION_LAYOUT:
        if name.startswith(section_name.lower()):
            return section_name
    return clean_text(match.group(1))


def option_values(text):
    matches = list(re.finditer(r"(?<!\w)([A-E])\)\s*", text))
    if not matches or matches[0].start() > 2:
        return {}
    values = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        values[match.group(1)] = clean_text(text[match.end():end])
    return values


def parse_questions(document):
    questions = []
    current_section = None
    current = None

    def finish_question():
        nonlocal current
        if current is None:
            return
        local_id, prompt_parts, option_parts = current
        prompt_text = clean_text(" ".join(prompt_parts))
        options = option_values(" ".join(option_parts))
        is_visual = current_section == "Non-Verbal Intelligence"
        if is_visual:
            options = {letter: f"Figure {letter}" for letter in "ABCD"}
        if not prompt_text or set(options) != set("ABCD"):
            raise ValueError(f"Could not parse {current_section} question {local_id}: {prompt_text!r}")
        questions.append({
            "local_id": local_id,
            "section": current_section,
            "question_text": f"{current_section}: {prompt_text}",
            "option_a": options["A"],
            "option_b": options["B"],
            "option_c": options["C"],
            "option_d": options["D"],
        })
        current = None

    for page in document:
        for raw_line in page.get_text().splitlines():
            line = clean_text(raw_line)
            if not line:
                continue
            heading_section = section_name_from_heading(line)
            if heading_section:
                finish_question()
                current_section = heading_section
                continue
            if line.startswith("PART B"):
                finish_question()
                return questions
            question_heading = re.match(r"^(\d+)\.\s*(.*)$", line)
            if question_heading and current_section:
                finish_question()
                current = [int(question_heading.group(1)), [question_heading.group(2)], []]
                continue
            if current is None:
                continue
            if current[2] or option_values(line):
                current[2].append(line)
            else:
                current[1].append(line)
    finish_question()
    return questions


def parse_answers(document):
    answers = {}
    current_section = None
    current = None

    def finish_answer():
        nonlocal current
        if current is None:
            return
        local_id, correct_option, answer_text, explanation_parts = current
        answers[(current_section, local_id)] = {
            "correct_option": correct_option,
            "answer_text": answer_text,
            "explanation": clean_text(" ".join(explanation_parts)),
        }
        current = None

    for page in document:
        for raw_line in page.get_text().splitlines():
            line = clean_text(raw_line)
            if not line:
                continue
            section_match = re.match(r"Section \d+: (.+)$", line)
            if section_match:
                finish_answer()
                current_section = next(
                    (section_name for section_name, _ in SECTION_LAYOUT if section_match.group(1).lower().startswith(section_name.lower())),
                    clean_text(section_match.group(1)),
                )
                continue
            if line.startswith("Quick key:"):
                continue
            answer_match = re.match(r"^(\d+)\.\s*([A-E])\s*\((.*?)\)\s*[–-]\s*(.*)$", line)
            if answer_match and current_section:
                finish_answer()
                local_id, correct_option, answer_text, explanation = answer_match.groups()
                current = [int(local_id), correct_option, answer_text, [explanation]]
            elif current is not None:
                current[3].append(line)
    finish_answer()
    return answers


def extract_visuals(document, questions, image_dir, image_prefix):
    image_dir.mkdir(parents=True, exist_ok=True)
    visual_questions = [question for question in questions if question["section"] == "Non-Verbal Intelligence"]
    visual_index = 0
    in_visual_section = False
    for page in document:
        page_text = page.get_text()
        if "SECTION 2:" in page_text:
            in_visual_section = True
        ends_visual_section = "SECTION 3:" in page_text
        section_end_y = page.rect.height - 24
        blocks = []
        for block in page.get_text("blocks"):
            x0, y0, x1, y1, text, *_ = block
            first_line = clean_text(text.splitlines()[0]) if text.splitlines() else ""
            if ends_visual_section and "SECTION 3:" in text:
                section_end_y = y0 - 5
                break
            if re.match(r"^\d+\.\s", first_line) and in_visual_section:
                blocks.append((y0, first_line))
        if ends_visual_section:
            in_visual_section = False
        if not blocks:
            continue
        for index, (y0, _) in enumerate(blocks):
            if visual_index >= len(visual_questions):
                raise ValueError("Found more visual questions than expected.")
            next_y = blocks[index + 1][0] - 5 if index + 1 < len(blocks) else section_end_y
            question = visual_questions[visual_index]
            image_file = image_dir / f"q{question['id']:03d}.png"
            clip = pymupdf.Rect(40, max(0, y0 - 8), page.rect.width - 40, min(page.rect.height, next_y))
            page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=clip, alpha=False).save(image_file)
            question["image_url"] = f"/images/full-mock-tests/{image_prefix}/q{question['id']:03d}.png"
            visual_index += 1
    if visual_index != 60:
        raise ValueError(f"Expected 60 visual questions, found {visual_index}.")


def generate(source_name, output_name, image_prefix):
    source_pdf = ROOT / "Full mock tests" / source_name
    data_file = ROOT / "my-app" / "src" / "data" / output_name
    image_dir = ROOT / "my-app" / "public" / "images" / "full-mock-tests" / image_prefix
    document = pymupdf.open(source_pdf)
    questions = parse_questions(document)
    answers = parse_answers(document)
    expected_count = sum(count for _, count in SECTION_LAYOUT)
    if len(questions) != expected_count:
        raise ValueError(f"Expected {expected_count} questions, found {len(questions)}.")
    section_counts = {section: count for section, count in SECTION_LAYOUT}
    counters = {section: 0 for section in section_counts}
    for question in questions:
        counters[question["section"]] += 1
        question["id"] = SECTION_STARTS[question["section"]] + question["local_id"] - 1
        answer = answers.get((question["section"], question["local_id"]))
        if not answer or not answer["explanation"]:
            raise ValueError(f"Missing answer for {question['section']} {question['local_id']}.")
        question.update({key: answer[key] for key in ("correct_option", "explanation")})
        question.pop("local_id")
    if counters != section_counts:
        raise ValueError(f"Section coverage mismatch: {counters}")
    extract_visuals(document, questions, image_dir, image_prefix)
    questions.sort(key=lambda question: question["id"])
    data_file.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{source_name}: generated {len(questions)} questions and 60 visual images")


if __name__ == "__main__":
    generate("PMA Long Course 159 Mock test 5.pdf", "pmaLongCourse159MockTest5.json", "pma-lc159-mock-test-5")
    generate("PMA Long Course 159 Mock test 6.pdf", "pmaLongCourse159MockTest6.json", "pma-lc159-mock-test-6")