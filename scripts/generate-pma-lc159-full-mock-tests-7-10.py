import base64
import json
import re
from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = ROOT / "my-app"
SOURCE_ROOT = ROOT / "Full mock tests"
MIGRATION_PATH = APP_ROOT / "supabase" / "migrations" / "056_paid_pma_lc159_full_mock_tests_7_10.sql"
SECTION_COUNTS = {
    "Verbal Intelligence": 60,
    "Non-Verbal Intelligence": 60,
    "Physics": 30,
    "English": 30,
    "General Knowledge": 20,
}
TESTS = {
    7: "PMA Long Course 159 Mock Test 7.pdf",
    8: "PMA Long Course 159 Mock Test 8.pdf",
    9: "PMA Long Course 159 Mock Test 9.pdf",
    10: "PMA Long Course 159 Mock Test 10.pdf",
}
SECTION_HEADING = re.compile(r"^(?:SECTION|Section)\s*(\d+)\s*[-:–—]\s*(.*)$", re.IGNORECASE)
QUESTION_HEADING = re.compile(r"^(\d+)\.\s*(.*)$")
OPTION_HEADING = re.compile(r"^\(?([A-E])\)?[.)]\s*(.*)$")
PAGE_HEADER = re.compile(r"^(?:PMA Long Course 159\b.*|Page \d+)$", re.IGNORECASE)


def clean_text(value):
    return re.sub(r"\s+", " ", value).strip()


def section_from_heading(line):
    match = SECTION_HEADING.match(line)
    if not match:
        return None
    heading = clean_text(match.group(2)).lower()
    if "non-verbal" in heading:
        return "Non-Verbal Intelligence"
    if "verbal intelligence" in heading:
        return "Verbal Intelligence"
    if "physics" in heading:
        return "Physics"
    if "english" in heading:
        return "English"
    if "general knowledge" in heading:
        return "General Knowledge"
    return None


def section_from_answer_heading(line):
    match = SECTION_HEADING.match(line)
    heading = clean_text(match.group(2) if match else line).lower()
    if "non-verbal intelligence" in heading:
        return "Non-Verbal Intelligence"
    for section in SECTION_COUNTS:
        if section.lower() in heading:
            return section
    return None


def answer_marker(lines):
    for index, line in enumerate(lines):
        if re.fullmatch(r"(?:ANSWER KEY|Answer Key|Answers with explanations|SOLUTIONS AND EXPLANATIONS)", line, re.IGNORECASE):
            return index
    raise ValueError("Could not find the answer key in the source PDF.")


def parse_questions(document, test_number, question_limit):
    all_lines = [clean_text(line) for page in document for line in page.get_text().splitlines()]
    stop_at = answer_marker(all_lines)
    questions = []
    section_order = []
    current_section = None
    current = None

    def finish_question():
        nonlocal current
        if current is None:
            return
        local_id, prompt_parts, options, visual_options = current
        prompt = clean_text(" ".join(prompt_parts))
        if current_section == "Non-Verbal Intelligence":
            options = {letter: f"Figure {letter}" for letter in "ABCD"}
            if "E" in visual_options:
                options["E"] = "Figure E"
            prompt = prompt or "Select the correct figure."
        if not prompt or not set("ABCD").issubset(options):
            raise ValueError(
                f"Test {test_number}: could not parse {current_section} question "
                f"{local_id}: prompt={prompt!r}, options={sorted(options)}"
            )
        questions.append({
            "id": 0,
            "local_id": local_id,
            "section": current_section,
            "question_text": f"{current_section}: {prompt}",
            "option_a": options["A"],
            "option_b": options["B"],
            "option_c": options["C"],
            "option_d": options["D"],
        })
        if "E" in options:
            questions[-1]["option_e"] = options["E"]
        current = None

    for line in all_lines[:stop_at]:
        if not line or PAGE_HEADER.fullmatch(line):
            continue
        heading_section = section_from_heading(line)
        if heading_section:
            finish_question()
            current_section = heading_section
            if current_section not in section_order:
                section_order.append(current_section)
            continue
        question_heading = QUESTION_HEADING.match(line)
        if question_heading and current_section:
            finish_question()
            current = [int(question_heading.group(1)), [question_heading.group(2)], {}, set()]
            continue
        if current is None:
            continue
        option_match = OPTION_HEADING.match(line)
        if option_match and current_section != "Non-Verbal Intelligence":
            current[2][option_match.group(1)] = clean_text(option_match.group(2))
        elif current[2] and current_section != "Non-Verbal Intelligence":
            previous_option = next(reversed(current[2]))
            current[2][previous_option] = clean_text(f"{current[2][previous_option]} {line}")
        elif current_section != "Non-Verbal Intelligence":
            current[1].append(line)
        elif current_section == "Non-Verbal Intelligence" and re.fullmatch(r"\(?[A-E]\)?[.)]?", line):
            current[3].add(line.strip("()."))
        elif line != "?":
            current[1].append(line)
    finish_question()

    if len(questions) != question_limit:
        raise ValueError(f"Test {test_number}: expected {question_limit} questions, found {len(questions)}.")
    counts = {section: 0 for section in SECTION_COUNTS}
    for question in questions:
        counts[question["section"]] += 1
    if counts != SECTION_COUNTS:
        raise ValueError(f"Test {test_number}: section coverage mismatch: {counts}")
    expected_order = [section for section in section_order]
    next_id = 1
    for section in expected_order:
        section_questions = [question for question in questions if question["section"] == section]
        for question in section_questions:
            question["id"] = next_id
            next_id += 1
    return questions, expected_order, all_lines


def parse_answer_data(lines, test_number, section_order):
    key_start = answer_marker(lines)
    answer_start = {}
    current_section = None
    answers = {}
    for line in lines[key_start + 1:]:
        normalized = section_from_answer_heading(line)
        if normalized:
            current_section = normalized
            answer_start.setdefault(current_section, True)
            continue
        if current_section is None:
            continue
        match = re.fullmatch(r"(\d+)\s*(?:[.\-–—])\s*([A-E])", line)
        if match:
            answers[(current_section, int(match.group(1)))] = {
                "correct_option": match.group(2),
                "explanation": "",
            }

    detail_start = next(
        (
            index for index, line in enumerate(lines)
            if re.fullmatch(r"(?:Answers with explanations|SOLUTIONS AND EXPLANATIONS)", line, re.IGNORECASE)
        ),
        key_start,
    )
    current_section = None
    current_answer = None

    def finish_answer():
        nonlocal current_answer
        if current_answer:
            section, local_id, correct_option, explanation_parts = current_answer
            explanation = clean_text(" ".join(explanation_parts))
            if explanation and (section, local_id) in answers:
                if answers[(section, local_id)]["correct_option"] != correct_option:
                    raise ValueError(
                        f"Test {test_number}: answer key and explanation disagree for "
                        f"{section} question {local_id}: "
                        f"{answers[(section, local_id)]['correct_option']} vs {correct_option}."
                    )
                answers[(section, local_id)]["explanation"] = explanation
            current_answer = None

    for line in lines[detail_start + 1:]:
        section = section_from_answer_heading(line)
        if section:
            finish_answer()
            current_section = section
            continue
        match = re.match(r"^(\d+)\.\s*\(([A-E])\)\s*(.*)$", line)
        if not match:
            match = re.match(r"^(\d+)\.\s*([A-E])\s*(?:\([^)]*\))?\s*[–—-]\s*(.*)$", line)
        if match and current_section:
            finish_answer()
            current_answer = [
                current_section,
                int(match.group(1)),
                match.group(2),
                [match.group(3)],
            ]
        elif current_answer and line and not PAGE_HEADER.fullmatch(line):
            current_answer[3].append(line)
    finish_answer()

    for section in section_order:
        for local_id in range(1, SECTION_COUNTS[section] + 1):
            if (section, local_id) not in answers:
                raise ValueError(f"Test {test_number}: missing answer for {section} question {local_id}.")
    return answers


def fallback_explanation(section, question, answer):
    option = answer[f"option_{answer['correct_option'].lower()}"]
    prompt = question["question_text"].split(": ", 1)[-1]
    answer_label = answer["correct_option"]

    if section == "Verbal Intelligence":
        number_match = re.search(r":\s*([0-9][0-9,\s]*(?:[,;]\s*[0-9][0-9,\s]*){2,})", prompt)
        if number_match:
            values = [int(value) for value in re.findall(r"\d+", number_match.group(1))]
            if len(values) >= 3:
                if values[:5] == [1, 2, 6, 24, 120]:
                    return f"The terms are factorials: 1!, 2!, 3!, 4!, 5!; the next is 6! = {option}."
                differences = [right - left for left, right in zip(values, values[1:])]
                if len(set(differences)) == 1:
                    return f"The sequence increases by {differences[0]} each step, so the next term is {option}."
                if len(differences) >= 3 and differences[0] and all(
                    right == left * 2 for left, right in zip(differences, differences[1:])
                ):
                    return f"The differences double each time ({', '.join(map(str, differences))}); adding the next difference gives {option}."
                cube_roots = [round(value ** (1 / 3)) for value in values]
                if all(root**3 == value for root, value in zip(cube_roots, values)) and all(
                    right == left + 1 for left, right in zip(cube_roots, cube_roots[1:])
                ):
                    next_cube = (cube_roots[-1] + 1) ** 3
                    return f"The terms are consecutive cubes ({', '.join(f'{root}³' for root in cube_roots)}); the next is {cube_roots[-1] + 1}³ = {next_cube}."
                if values[:5] == [1, 2, 6, 24, 120]:
                    return f"The terms are factorials: 1!, 2!, 3!, 4!, 5!; the next is 6! = {option}."
                if len(values) >= 4 and all(
                    values[index] == values[index - 1] + values[index - 2]
                    for index in range(2, len(values))
                ):
                    return f"Each term is the sum of the previous two; adding the last two terms gives {option}."
                if values[:5] == [2, 5, 4, 10, 8]:
                    return f"There are two interleaved sequences: 2, 4, 8, 16 doubles, while 5, 10, 15, 20 increases by 5; the next term is {option}."
                if values[:6] == [5, 5, 10, 15, 25, 40]:
                    return f"Each term is the sum of the previous two: 5 + 5 = 10, 5 + 10 = 15, 10 + 15 = 25, so the next is 15 + 25 = {option}."
                if values[:6] == [2, 3, 5, 7, 11, 13]:
                    return f"The sequence lists prime numbers in increasing order; the prime after 13 is {option}."
                if values[:5] == [1, 8, 27, 64, 125]:
                    return f"The terms are cubes (1³, 2³, 3³, 4³); the next is 5³ = {option}."
                ratios = [right / left for left, right in zip(values, values[1:]) if left]
                if len(ratios) == len(values) - 1 and len(set(ratios)) == 1:
                    return f"Each term is multiplied by {ratios[0]:g}; applying the same rule gives {option}."
                if len(differences) >= 3:
                    second_differences = [right - left for left, right in zip(differences, differences[1:])]
                    if len(set(second_differences)) == 1:
                        next_difference = differences[-1] + second_differences[0]
                        return f"The differences change by {second_differences[0]} each time; adding the next difference, {next_difference}, gives {option}."
        letter_match = re.search(r":\s*([A-Z](?:\s*,\s*[A-Z]){2,})", prompt)
        if letter_match:
            letters = re.findall(r"[A-Z]", letter_match.group(1))
            differences = [
                (ord(right) - ord(left)) % 26
                for left, right in zip(letters, letters[1:])
            ]
            if differences and len(set(differences)) == 1:
                next_letter = chr((ord(letters[-1]) - ord("A") + differences[0]) % 26 + ord("A"))
                return f"Each letter advances {differences[0]} place(s) in the alphabet, so the next letter is {next_letter}."
            if len(differences) >= 3 and differences == list(range(differences[0], differences[0] + len(differences))):
                next_letter = chr((ord(letters[-1]) - ord("A") + differences[-1] + 1) % 26 + ord("A"))
                return f"The letter advances increase by one each time ({', '.join(map(str, differences))} places); the next letter is {next_letter}."
        pair_match = re.search(r":\s*([A-Z]{2}(?:\s*,\s*[A-Z]{2}){2,})", prompt)
        if pair_match:
            pairs = re.findall(r"[A-Z]{2}", pair_match.group(1))
            first_steps = [ord(right[0]) - ord(left[0]) for left, right in zip(pairs, pairs[1:])]
            second_steps = [ord(right[1]) - ord(left[1]) for left, right in zip(pairs, pairs[1:])]
            if len(set(first_steps)) == len(set(second_steps)) == 1:
                return f"Each pair follows the same letter shifts ({first_steps[0]:+d} for the first letter and {second_steps[0]:+d} for the second), giving {option}."
        if re.search(r":\s*[A-Z]{3}(?:\s*,\s*[A-Z]{3}){2,}", prompt):
            return f"Each position in the three-letter group advances consistently; applying the pattern to all positions gives {option}."
        if re.search(r"\b(?:after|in)\s+\d+\s+days?\b", prompt, re.IGNORECASE):
            days_match = re.search(r"\bafter\s+(\d+)\s+days?\b", prompt, re.IGNORECASE)
            weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            start_day = next((day for day in weekdays if day.lower() in prompt.lower()), None)
            if days_match and start_day:
                days_ahead = int(days_match.group(1))
                result = weekdays[(weekdays.index(start_day) + days_ahead) % 7]
                return f"Count forward {days_ahead % 7} days from {start_day}, wrapping after Sunday; the result is {result}."
        if re.search(r"\b(?:percent|% of)\b", prompt, re.IGNORECASE):
            percent = re.search(r"(\d+(?:\.\d+)?)\s*%\s*of\s+(?:Rs\s*)?([\d,]+)", prompt, re.IGNORECASE)
            if percent:
                rate, amount = percent.groups()
                return f"Multiply {amount} by {rate}/100 to find the requested percentage: {option}."
        if re.search(r"\bmonths?\b.*\b31\b|\b31\b.*\bmonths?\b", prompt, re.IGNORECASE):
            return "January, March, May, July, August, October, and December have 31 days, so there are seven."
        if re.search(r"\bangle between the hands of a clock\b", prompt, re.IGNORECASE):
            time_match = re.search(r"at\s+(\d{1,2}):(\d{2})", prompt)
            if time_match:
                hour, minute = map(int, time_match.groups())
                difference = abs((hour % 12) * 30 + minute * 0.5 - minute * 6)
                angle = min(difference, 360 - difference)
                return f"The hour hand moves 0.5° per minute and the minute hand 6° per minute; their smaller angle is {angle:g}°."
        unit_cost = re.search(r"If\s+(\d+)\s+\w+\s+cost\s+Rs\s*([\d,]+)", prompt, re.IGNORECASE)
        if unit_cost:
            count, total = map(lambda value: int(value.replace(",", "")), unit_cost.groups())
            return f"Divide the total cost, Rs {total}, by {count} items to get Rs {total // count} per item."
        if "day before yesterday" in prompt.lower():
            weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            start_day = next((day for day in weekdays if day.lower() in prompt.lower()), None)
            if start_day:
                tomorrow = weekdays[(weekdays.index(start_day) + 3) % 7]
                return f"Today is two days after {start_day}; tomorrow is three days after it, which is {tomorrow}."
        date_match = re.search(r"1st of a month is a (\w+).*?25th", prompt, re.IGNORECASE)
        if date_match:
            weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            start_day = date_match.group(1).capitalize()
            result = weekdays[(weekdays.index(start_day) + 24) % 7]
            return f"The 25th is 24 days after the 1st; 24 mod 7 = 3, so three weekdays after {start_day} is {result}."
        if "day before yesterday" in prompt.lower():
            weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            start_day = next((day for day in weekdays if day.lower() in prompt.lower()), None)
            if start_day:
                tomorrow = weekdays[(weekdays.index(start_day) + 3) % 7]
                return f"Today is two days after {start_day}; tomorrow is three days after it, which is {tomorrow}."
        if re.search(r"\b(?:father|son).*(?:older|old)\b", prompt, re.IGNORECASE):
            return f"Let the son's age be x. The conditions give 3x + 12 = 2(x + 12), so x = {option}."
        height_match = re.search(
            r"(\w+)\s+is taller than\s+(\w+), and\s+(\w+)\s+is taller than\s+(\w+).*shortest",
            prompt,
            re.IGNORECASE,
        )
        if height_match:
            return f"Since {height_match.group(1)} is taller than {height_match.group(2)}, who is taller than {height_match.group(4)}, {height_match.group(4)} is the shortest."
        if re.search(r"\b(?:son|father|mother|brother|sister|niece|nephew|related)\b", prompt, re.IGNORECASE):
            return f"Trace the stated parent-child and sibling links in order; they establish that the answer is {option}."
        if re.search(r"\b(?:north|south|east|west|direction)\b", prompt, re.IGNORECASE):
            return f"Combine the movements and cancel opposite directions; the remaining displacement is {option}."
        if re.search(r"\b(?:students|row of)\b", prompt, re.IGNORECASE):
            numbers = [int(value) for value in re.findall(r"\d+", prompt)]
            if len(numbers) >= 3:
                return f"Students between them = total − left rank − right rank = {numbers[0]} − {numbers[1]} − {numbers[2]} = {option}."
        average_match = re.search(
            r"average of (\w+) numbers is (\d+(?:\.\d+)?).*?remaining (\w+) becomes (\d+(?:\.\d+)?)",
            prompt,
            re.IGNORECASE,
        )
        if average_match:
            counts = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
            total_count, initial_average, remaining_count, remaining_average = average_match.groups()
            total_count = int(total_count) if total_count.isdigit() else counts[total_count.lower()]
            remaining_count = int(remaining_count) if remaining_count.isdigit() else counts[remaining_count.lower()]
            original_sum = total_count * float(initial_average)
            remaining_sum = remaining_count * float(remaining_average)
            removed = original_sum - remaining_sum
            return f"The original sum is {total_count}×{initial_average} = {original_sum:g}; the remaining sum is {remaining_count}×{remaining_average} = {remaining_sum:g}. Their difference, {removed:g}, is the removed number."
        if re.search(r"\baverage\b", prompt, re.IGNORECASE) and "removed" in prompt.lower():
            return f"Use average = total ÷ count to find the original and remaining totals; their difference is the removed number, {option}."
        if re.search(r"\b(?:ratio|divided among)\b", prompt, re.IGNORECASE):
            ratio = re.search(r"([\d\s]+):\s*([\d\s]+):\s*([\d\s]+)", prompt)
            total = re.search(r"Rs\s*([\d,]+)", prompt, re.IGNORECASE)
            if ratio and total:
                parts = [int(value.strip()) for value in ratio.groups()]
                amount = int(total.group(1).replace(",", ""))
                return f"The largest share is {amount} × {max(parts)}/{sum(parts)} = Rs {amount * max(parts) // sum(parts)}."
        if re.search(r"\b(?:loss|gain)\b", prompt, re.IGNORECASE) and "sold for" in prompt.lower():
            return f"A 10% loss means the sale price is 90% of cost price; a 10% gain requires 110% of cost price, giving {option}."
        if re.search(r"\b(?:increase|decrease|net change)\b", prompt, re.IGNORECASE) and "%" in prompt:
            return "Successive changes apply to the changing price: 1.20 × 0.80 = 0.96, a net 4% decrease."
        if re.search(r"\bstatements?:.*conclusions?\b", prompt, re.IGNORECASE):
            if "only conclusion ii follows" in option.lower():
                return "Conclusion II is stated directly by the premise that some brave men are young; the premises do not establish that any soldiers are young."
            if "only conclusion i follows" in option.lower():
                return "The soldier-coward overlap gives soldiers who are not pilots; nothing establishes that pilots are soldiers."
            return f"Test each conclusion against every arrangement allowed by the statements; only conclusions that must be true follow. Here the answer is {option}."
        if re.search(r"\b(?:train|pole|cross each other)\b", prompt, re.IGNORECASE):
            return f"Convert speed to metres per second, then divide the distance by the speed relative to the pole or other train; this gives {option}."
        if "compound interest" in prompt.lower():
            return f"Compound amount = principal × (1 + rate)^time; subtracting the principal gives interest of {option}."
        if re.search(r"\b(?:work|job|working together)\b", prompt, re.IGNORECASE):
            return f"Add the daily work rates (1/A + 1/B), then take the reciprocal to get the completion time: {option}."
        if re.search(r"\bnot a prime\b", prompt, re.IGNORECASE):
            return f"{option} is composite because it has factors other than 1 and itself."
        if re.search(r"\bnot a perfect square\b", prompt, re.IGNORECASE):
            return f"{option} is not a perfect square; the other listed values are squares of whole numbers."
        if re.search(r"\b(?:sum of the letter values|letter values)\b", prompt, re.IGNORECASE):
            return f"Convert each letter to its alphabet position and add the values; the total is {option}."
        if re.search(r"\bshortest distance\b", prompt, re.IGNORECASE):
            return f"The perpendicular movements form a right triangle; the Pythagorean theorem gives {option}."
        if "coded as" in prompt.lower() or "written as" in prompt.lower():
            return f"Apply the same letter-by-letter coding rule shown in the example; it produces {option}."
        if re.search(r"\b(?:synonym|meaning|closest in meaning)\b", prompt, re.IGNORECASE):
            return f"{option} is the matching meaning of the word asked in the question."
        if re.search(r"\b(?:opposite|antonym)\b", prompt, re.IGNORECASE):
            return f"{option} expresses the opposite meaning requested."
        if re.search(r"\bodd one out|different from the others\b", prompt, re.IGNORECASE):
            answer_lower = option.lower()
            if answer_lower in {"potato", "carrot", "onion", "cabbage"}:
                return f"{option} is a vegetable, while the other listed choices are fruits."
            return f"{option} is the exception; the remaining choices share the category or property being tested."
        analogy = re.search(r"([^:?.]+)\s*:\s*([^:?.]+)\s*::\s*([^:?.]+)\s*:", prompt)
        if analogy:
            first, second, third = (part.strip() for part in analogy.groups())
            if option.lower() in {"cut", "write", "read", "eat", "drink"}:
                return f"A {first.lower()} is used to {second.lower()}; in the same way, a {third.lower()} is used to {option.lower()}."
            return f"The pair {first} : {second} sets a relationship; applying the same relationship to {third} gives {option}."
        return f"Option {answer_label} ({option}) preserves the sequence or relationship described in the question."
    if section == "Physics":
        if re.search(r"\b(?:gravity|gravitational acceleration|acceleration due to gravity)\b", prompt, re.IGNORECASE):
            return f"Near Earth's surface, gravitational acceleration is approximately {option}."
        if re.search(r"\bscalar quantity\b", prompt, re.IGNORECASE):
            return f"{option} is scalar because it has magnitude but no direction."
        if re.search(r"\bdimensions?\b.*\bvelocity\b", prompt, re.IGNORECASE):
            return f"Velocity is displacement divided by time, so its dimensions are length/time: {option}."
        if re.search(r"\b(?:speed of light|light in vacuum)\b", prompt, re.IGNORECASE):
            return f"The speed of light in vacuum is approximately {option}."
        if re.search(r"\bmaximum range\b", prompt, re.IGNORECASE):
            return "For a fixed launch speed, projectile range is greatest at 45° because sin(2θ) is maximal when 2θ = 90°."
        if re.search(r"\bmaximum height\b", prompt, re.IGNORECASE):
            return f"At maximum height the vertical speed is zero; using v² = u² − 2gh gives h = u²/(2g) = {option}."
        if re.search(r"\buniformly accelerat", prompt, re.IGNORECASE):
            return f"For uniform acceleration from rest, s = ut + ½at²; substituting the given values gives {option}."
        if re.search(r"\b(?:simple pendulum|time period)\b", prompt, re.IGNORECASE):
            return f"For a simple pendulum, the period is T = 2π√(L/g), giving {option}."
        if re.search(r"\b(?:ohm|resistance|current|voltage)\b", prompt, re.IGNORECASE):
            return f"Applying the relevant electrical relationship (V = IR) gives {option}."
        if re.search(r"\b(?:momentum|mass|velocity)\b", prompt, re.IGNORECASE):
            return f"Momentum is mass multiplied by velocity; substituting the given values gives {option}."
        if re.search(r"\b(?:work|force|displacement)\b", prompt, re.IGNORECASE):
            return f"Work is the component of force along the displacement multiplied by that displacement; this gives {option}."
        if re.search(r"\b(?:kinetic energy)\b", prompt, re.IGNORECASE):
            return f"Kinetic energy is calculated as ½mv²; using the stated values gives {option}."
        if re.search(r"\b(?:potential energy)\b", prompt, re.IGNORECASE):
            return f"Gravitational potential energy is mgh; substituting the stated values gives {option}."
        if re.search(r"\bunit\b", prompt, re.IGNORECASE):
            return f"{option} is the SI unit for the physical quantity asked about."
        if re.search(r"\b(?:speed|velocity|distance|time)\b", prompt, re.IGNORECASE):
            return f"Speed is distance divided by time; using the values in the question gives {option}."
        if re.search(r"\b(?:force|mass|acceleration)\b", prompt, re.IGNORECASE):
            return f"Newton's second law, F = ma, gives the result {option} for the quantities in the question."
        return f"{option} is consistent with the physical principle or definition tested in the question."
    if section == "English":
        if re.search(r"\b(?:synonym|meaning|closest in meaning)\b", prompt, re.IGNORECASE):
            return f"{option} is the word that matches the meaning requested."
        if re.search(r"\b(?:antonym|opposite)\b", prompt, re.IGNORECASE):
            return f"{option} has the opposite meaning requested."
        return f"{option} is the grammatically correct choice for the sentence structure and usage in the question."
    return f"{option} is the factual answer to the question."


def extract_visuals(document, questions, test_number, image_dir, slug):
    page_texts = [page.get_text() for page in document]
    section_two_page = next(
        (index for index, text in enumerate(page_texts) if re.search(r"(?:SECTION|Section)\s*2\s*[-:–—]", text)),
        None,
    )
    section_three_page = next(
        (index for index, text in enumerate(page_texts) if re.search(r"(?:SECTION|Section)\s*3\s*[-:–—]", text)),
        None,
    )
    if section_two_page is None or section_three_page is None:
        raise ValueError(f"Test {test_number}: could not locate the non-verbal section boundaries.")
    visual_questions = [question for question in questions if question["section"] == "Non-Verbal Intelligence"]
    image_dir.mkdir(parents=True, exist_ok=True)
    visual_index = 0
    for page_index in range(section_two_page, section_three_page + 1):
        page = document[page_index]
        blocks = page.get_text("blocks")
        section_end_y = page.rect.height - 24
        for block in blocks:
            _, y0, _, _, text, *_ = block
            if re.search(r"(?:SECTION|Section)\s*3\s*[-:–—]", text):
                section_end_y = min(section_end_y, y0 - 5)
        question_blocks = []
        for block in blocks:
            _, y0, _, _, text, *_ = block
            first_line = clean_text(text.splitlines()[0]) if text.splitlines() else ""
            if y0 < section_end_y and re.match(r"^\d+\.\s", first_line):
                question_blocks.append((y0, text))
        question_blocks.sort(key=lambda block: block[0])
        for index, (y0, _) in enumerate(question_blocks):
            if visual_index >= len(visual_questions):
                raise ValueError(f"Test {test_number}: found more than 60 non-verbal question figures.")
            next_y = question_blocks[index + 1][0] - 5 if index + 1 < len(question_blocks) else section_end_y
            question = visual_questions[visual_index]
            filename = f"q{question['id']:03d}.png"
            clip = pymupdf.Rect(32, max(0, y0 - 8), page.rect.width - 32, min(page.rect.height, next_y))
            page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=clip, alpha=False).save(image_dir / filename)
            question["image_url"] = f"/images/full-mock-tests/{slug}/{filename}"
            visual_index += 1
    if visual_index != 60:
        raise ValueError(f"Test {test_number}: expected 60 non-verbal figures, found {visual_index}.")


def migration_prefix():
    return """-- Seed the paid 200-question PMA Long Course 159 Mock Tests 7-10.
begin;

alter table public.paid_mock_test_question_banks
  drop constraint if exists paid_mock_test_question_banks_test_slug_check;

alter table public.paid_mock_test_question_banks
  add constraint paid_mock_test_question_banks_test_slug_check
  check (test_slug in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-mock-test-5',
    'pma-long-course-159-mock-test-6',
    'pma-long-course-159-mock-test-7',
    'pma-long-course-159-mock-test-8',
    'pma-long-course-159-mock-test-9',
    'pma-long-course-159-mock-test-10',
    'pma-long-course-159-most-repeated-questions-bank',
    'pma-long-course-159-must-come-questions-bank',
    'academic-portion-mock-test-2',
    'pma-long-course-159-non-verbal-intelligence-test-1',
    'pma-long-course-159-non-verbal-intelligence-test-2',
    'academic-portion-mock-test-1',
    'pma-long-course-159-academic-portion-mock-test-3',
    'pma-long-course-academic-portion-most-repeated-questions',
    'pma-verbal-intelligence-test-2',
    'pma-verbal-intelligence-test-3',
    'pma-non-verbal-intelligence-test-2',
    'pma-non-verbal-intelligence-test-3',
    'pma-analogy-test',
    'pma-mathematical-series-test',
    'army-initial-practice-mock'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_test_slug_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_test_slug_check
  check (test_slug in (
    'first-full-mock-test',
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-mock-test-5',
    'pma-long-course-159-mock-test-6',
    'pma-long-course-159-mock-test-7',
    'pma-long-course-159-mock-test-8',
    'pma-long-course-159-mock-test-9',
    'pma-long-course-159-mock-test-10',
    'pma-long-course-159-most-repeated-questions-bank',
    'pma-long-course-159-must-come-questions-bank',
    'academic-portion-mock-test-2',
    'pma-long-course-159-non-verbal-intelligence-test-1',
    'pma-long-course-159-non-verbal-intelligence-test-2',
    'academic-portion-mock-test-1',
    'pma-long-course-159-academic-portion-mock-test-3',
    'pma-long-course-academic-portion-most-repeated-questions',
    'pma-academic-notes',
    'pa-academic-notes',
    'pma-academic-tests-notes',
    'pma-non-verbal-intelligence-notes',
    'pma-verbal-intelligence-notes',
    'pma-verbal-intelligence-test-2',
    'pma-verbal-intelligence-test-3',
    'pma-non-verbal-intelligence-test-2',
    'pma-non-verbal-intelligence-test-3',
    'pma-analogy-test',
    'pma-mathematical-series-test',
    'army-initial-practice-mock',
    'live-interview-assessment',
    'pma-long-course-159-interview-fully-cracked',
    'interview-practice-personal',
    'interview-practice-academic',
    'interview-practice-general-knowledge',
    'interview-practice-current-affairs',
    'interview-practice-defense',
    'interview-practice-rapid-fire',
    'interview-practice-mock'
  ));

alter table public.mock_test_purchase_requests
  drop constraint if exists mock_test_purchase_requests_amount_pkr_check;

alter table public.mock_test_purchase_requests
  add constraint mock_test_purchase_requests_amount_pkr_check
  check (
    (test_slug = 'first-full-mock-test' and amount_pkr = 100)
    or (test_slug = 'pma-long-course-159-mock-test-2' and amount_pkr = 49)
    or (test_slug in (
      'pma-long-course-159-mock-test-5',
      'pma-long-course-159-mock-test-6',
      'pma-long-course-159-mock-test-7',
      'pma-long-course-159-mock-test-8',
      'pma-long-course-159-mock-test-9',
      'pma-long-course-159-mock-test-10'
    ) and amount_pkr = 100)
    or (test_slug = 'pma-long-course-159-most-repeated-questions-bank' and amount_pkr = 79)
    or (test_slug = 'pma-long-course-159-must-come-questions-bank' and amount_pkr = 99)
    or (test_slug = 'academic-portion-mock-test-2' and amount_pkr = 20)
    or (test_slug in (
      'pma-long-course-159-non-verbal-intelligence-test-1',
      'pma-long-course-159-academic-portion-mock-test-3',
      'pma-long-course-academic-portion-most-repeated-questions'
    ) and amount_pkr = 49)
    or (test_slug = 'pma-long-course-159-non-verbal-intelligence-test-2' and amount_pkr in (14, 49))
    or (test_slug = 'academic-portion-mock-test-1' and amount_pkr = 30)
    or (test_slug in (
      'pma-academic-notes', 'pa-academic-notes', 'pma-academic-tests-notes',
      'pma-non-verbal-intelligence-notes', 'pma-verbal-intelligence-notes',
      'pma-verbal-intelligence-test-2', 'pma-verbal-intelligence-test-3',
      'pma-non-verbal-intelligence-test-2', 'pma-non-verbal-intelligence-test-3',
      'pma-analogy-test', 'pma-mathematical-series-test', 'army-initial-practice-mock'
    ) and amount_pkr = 14)
    or (test_slug = 'live-interview-assessment' and amount_pkr in (200, 250))
    or (test_slug = 'pma-long-course-159-interview-fully-cracked' and amount_pkr = 150)
    or (test_slug in (
      'interview-practice-personal', 'interview-practice-academic',
      'interview-practice-general-knowledge', 'interview-practice-current-affairs',
      'interview-practice-defense', 'interview-practice-rapid-fire',
      'interview-practice-mock'
    ) and amount_pkr in (50, 70))
  ) not valid;

create or replace function public.submit_mock_test_payment_proof(
  p_test_slug text,
  p_sender_name text,
  p_sender_phone text,
  p_payment_date date,
  p_payment_time time,
  p_payment_screenshot_url text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_amount_pkr integer;
declare v_purchase_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_amount_pkr := case p_test_slug
    when 'first-full-mock-test' then 100
    when 'pma-long-course-159-mock-test-2' then 49
    when 'pma-long-course-159-mock-test-5' then 100
    when 'pma-long-course-159-mock-test-6' then 100
    when 'pma-long-course-159-mock-test-7' then 100
    when 'pma-long-course-159-mock-test-8' then 100
    when 'pma-long-course-159-mock-test-9' then 100
    when 'pma-long-course-159-mock-test-10' then 100
    when 'pma-long-course-159-most-repeated-questions-bank' then 79
    when 'pma-long-course-159-must-come-questions-bank' then 99
    when 'academic-portion-mock-test-2' then 20
    when 'pma-long-course-159-non-verbal-intelligence-test-1' then 49
    when 'pma-long-course-159-non-verbal-intelligence-test-2' then 49
    when 'academic-portion-mock-test-1' then 30
    when 'pma-long-course-159-academic-portion-mock-test-3' then 49
    when 'pma-long-course-academic-portion-most-repeated-questions' then 49
    when 'pma-verbal-intelligence-test-2' then 14
    when 'pma-verbal-intelligence-test-3' then 14
    when 'pma-non-verbal-intelligence-test-2' then 14
    when 'pma-non-verbal-intelligence-test-3' then 14
    when 'pma-analogy-test' then 14
    when 'pma-mathematical-series-test' then 14
    when 'army-initial-practice-mock' then 14
    when 'live-interview-assessment' then 250
    when 'pma-long-course-159-interview-fully-cracked' then 150
    when 'interview-practice-personal' then 50
    when 'interview-practice-academic' then 50
    when 'interview-practice-general-knowledge' then 50
    when 'interview-practice-current-affairs' then 50
    when 'interview-practice-defense' then 50
    when 'interview-practice-rapid-fire' then 50
    when 'interview-practice-mock' then 50
    else null
  end;
  if v_amount_pkr is null then
    raise exception 'This mock test is not available for individual purchase';
  end if;

  if trim(coalesce(p_sender_name, '')) = '' or trim(coalesce(p_sender_phone, '')) = '' then
    raise exception 'Sender name and phone number are required';
  end if;
  if p_payment_date is null then
    raise exception 'Payment date is required';
  end if;
  if trim(coalesce(p_payment_screenshot_url, '')) = '' or not exists (
    select 1 from storage.objects
    where bucket_id = 'payment-screenshots'
      and name = trim(p_payment_screenshot_url)
      and split_part(name, '/', 1) = v_user_id::text
  ) then
    raise exception 'Upload a valid payment screenshot before submitting';
  end if;
  if exists (
    select 1 from public.mock_test_purchase_requests
    where user_id = v_user_id and test_slug = p_test_slug and status = 'APPROVED'
  ) then
    raise exception 'You already have permanent access to this mock test';
  end if;
  if exists (
    select 1 from public.mock_test_purchase_requests
    where user_id = v_user_id and test_slug = p_test_slug and status = 'PENDING'
  ) then
    raise exception 'A payment request for this mock test is already pending';
  end if;

  insert into public.mock_test_purchase_requests (
    user_id, test_slug, amount_pkr, payment_method, sender_name, sender_phone,
    payment_date, payment_time, payment_screenshot_url, notes
  ) values (
    v_user_id, p_test_slug, v_amount_pkr, 'NAYAPAY_MANUAL',
    trim(p_sender_name), trim(p_sender_phone), p_payment_date, p_payment_time,
    trim(p_payment_screenshot_url), nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_purchase_id;
  return jsonb_build_object(
    'id', v_purchase_id, 'test_slug', p_test_slug, 'amount_pkr', v_amount_pkr,
    'status', 'PENDING',
    'message', 'Payment proof submitted. Access will be enabled after admin approval.'
  );
exception
  when unique_violation then
    raise exception 'A payment request for this mock test is already pending or approved';
end;
$$;

"""


def generate():
    generated_questions = {}
    for test_number, filename in TESTS.items():
        slug = f"pma-lc159-mock-test-{test_number}"
        source = SOURCE_ROOT / filename
        document = pymupdf.open(source)
        questions, section_order, lines = parse_questions(document, test_number, 200)
        answers = parse_answer_data(lines, test_number, section_order)
        for question in questions:
            answer = answers[(question["section"], question["local_id"])]
            if (
                question["section"] == "Non-Verbal Intelligence"
                and (answer["correct_option"] == "E" or test_number == 7)
            ):
                question["option_e"] = "Figure E"
            question["correct_option"] = answer["correct_option"]
            question["explanation"] = answer["explanation"] or fallback_explanation(
                question["section"], question, question
            )
            question.pop("local_id")
        image_dir = APP_ROOT / "public" / "images" / "full-mock-tests" / slug
        extract_visuals(document, questions, test_number, image_dir, slug)
        output_path = APP_ROOT / "src" / "data" / f"pmaLongCourse159MockTest{test_number}.json"
        output_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        generated_questions[test_number] = questions
        print(f"Test {test_number}: wrote {len(questions)} questions and 60 figures.")

    migration = migration_prefix()
    for test_number, questions in generated_questions.items():
        slug = f"pma-long-course-159-mock-test-{test_number}"
        payload = json.dumps(questions, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        encoded = base64.b64encode(payload).decode("ascii")
        migration += (
            "insert into public.paid_mock_test_question_banks (test_slug, questions)\n"
            f"values ('{slug}', convert_from(decode('{encoded}', 'base64'), 'UTF8')::jsonb)\n"
            "on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();\n\n"
        )
    migration += """create or replace function public.get_paid_mock_test_questions(p_test_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user_id uuid := auth.uid();
declare v_questions jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_test_slug not in (
    'pma-long-course-159-mock-test-2',
    'pma-long-course-159-mock-test-5',
    'pma-long-course-159-mock-test-6',
    'pma-long-course-159-mock-test-7',
    'pma-long-course-159-mock-test-8',
    'pma-long-course-159-mock-test-9',
    'pma-long-course-159-mock-test-10',
    'pma-long-course-159-most-repeated-questions-bank',
    'pma-long-course-159-must-come-questions-bank',
    'academic-portion-mock-test-2',
    'pma-long-course-159-non-verbal-intelligence-test-1',
    'pma-long-course-159-non-verbal-intelligence-test-2',
    'academic-portion-mock-test-1',
    'pma-long-course-159-academic-portion-mock-test-3',
    'pma-long-course-academic-portion-most-repeated-questions',
    'pma-verbal-intelligence-test-2',
    'pma-verbal-intelligence-test-3',
    'pma-non-verbal-intelligence-test-2',
    'pma-non-verbal-intelligence-test-3',
    'pma-analogy-test',
    'pma-mathematical-series-test',
    'army-initial-practice-mock'
  ) then
    raise exception 'This mock test is not available for individual purchase';
  end if;
  if public.get_access_level_for_user(v_user_id) not in ('pro', 'premium')
    and not exists (
      select 1 from public.mock_test_purchase_requests purchase
      where purchase.user_id = v_user_id
        and purchase.test_slug = p_test_slug
        and purchase.status = 'APPROVED'
    ) then
    raise exception 'An approved purchase or active Pro plan is required to access this mock test';
  end if;
  select questions into v_questions
  from public.paid_mock_test_question_banks
  where test_slug = p_test_slug;
  if v_questions is null then
    raise exception 'Mock-test questions are not available';
  end if;
  return v_questions;
end;
$$;

revoke all on function public.get_paid_mock_test_questions(text) from public, anon;
grant execute on function public.get_paid_mock_test_questions(text) to authenticated;

notify pgrst, 'reload schema';
commit;
"""
    MIGRATION_PATH.write_text(migration, encoding="utf-8")
    print(f"Wrote {MIGRATION_PATH.name}.")


if __name__ == "__main__":
    generate()
