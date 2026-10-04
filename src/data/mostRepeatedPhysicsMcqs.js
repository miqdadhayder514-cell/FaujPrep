const MOST_REPEATED_PHYSICS_MCQS = [
  {
    id: 1,
    question_text: "The dimensions of pressure are:",
    option_a: "[ML²T⁻²]",
    option_b: "[ML⁻²T⁻²]",
    option_c: "[ML⁻¹T⁻²]",
    option_d: "[MLT⁻²]",
    correct_option: "C",
    explanation: "Pressure is defined as force per unit area: P = F / A. The dimension of force is [MLT⁻²], while the dimension of area is [L²]. Dividing gives [MLT⁻²] / [L²] = [ML⁻¹T⁻²]. So the correct answer is (C) [ML⁻¹T⁻²]. This is also the same dimension as stress and energy density."
  },
  {
    id: 2,
    question_text: "The number of significant figures in the measurement 0.00450 m is:",
    option_a: "5",
    option_b: "3",
    option_c: "4",
    option_d: "2",
    correct_option: "B",
    explanation: "Leading zeros are never significant, but the trailing zero after the decimal point is significant. In 0.00450, the non-zero digits are 4 and 5, and the zero after 5 is also significant because it is after the decimal point. So the significant digits are 4, 5, 0, which gives 3 significant figures. The correct answer is (B) 3."
  },
  {
    id: 3,
    question_text: "If the scalar product A·B of two non-zero vectors is zero, the angle between them is:",
    option_a: "45°",
    option_b: "0°",
    option_c: "90°",
    option_d: "180°",
    correct_option: "C",
    explanation: "The scalar product is A·B = AB cosθ. If the product is zero and neither vector is zero, then cosθ = 0. This occurs when θ = 90°. Therefore the vectors are perpendicular. The correct answer is (C) 90°."
  },
  {
    id: 4,
    question_text: "A projectile is fired at 30° to the horizontal. The same range is obtained when it is fired (at the same speed) at:",
    option_a: "60°",
    option_b: "75°",
    option_c: "45°",
    option_d: "90°",
    correct_option: "A",
    explanation: "Range is given by R = v² sin(2θ) / g. For complementary angles, θ and (90° − θ), the values of sin 2θ are identical. Since 30° + 60° = 90°, the range at 30° is the same as at 60°. The correct answer is (A) 60°. A classic trick: equal ranges for complementary angles, with maximum range at 45°."
  },
  {
    id: 5,
    question_text: "A projectile is fired at 19.6 m s⁻¹ at 30° to the horizontal. The maximum height reached is (g = 9.8 m s⁻²):",
    option_a: "4.9 m",
    option_b: "9.8 m",
    option_c: "2.45 m",
    option_d: "19.6 m",
    correct_option: "A",
    explanation: "The vertical component of velocity is v sinθ = 19.6 × sin30° = 19.6 × 1/2 = 9.8 m/s. Maximum height is H = (v sinθ)² / 2g = 9.8² / (2 × 9.8) = 4.9 m. So the answer is (A) 4.9 m."
  },
  {
    id: 6,
    question_text: "A car moving at 10 m s⁻¹ accelerates uniformly at 2 m s⁻² over a distance of 75 m. Its final speed is:",
    option_a: "20 m s⁻¹",
    option_b: "25 m s⁻¹",
    option_c: "15 m s⁻¹",
    option_d: "40 m s⁻¹",
    correct_option: "A",
    explanation: "Use the equation v² = u² + 2as. Here u = 10, a = 2, s = 75. So v² = 100 + 2 × 2 × 75 = 100 + 300 = 400. Therefore v = 20 m/s. The correct answer is (A) 20 m s⁻¹. When time is not given, this is the most direct equation."
  },
  {
    id: 7,
    question_text: "A stone is dropped from a height of 19.6 m. The time taken to reach the ground is (g = 9.8 m s⁻²):",
    option_a: "4 s",
    option_b: "1 s",
    option_c: "3 s",
    option_d: "2 s",
    correct_option: "D",
    explanation: "For a freely falling body from rest: h = ½gt². So t = √(2h/g) = √(2 × 19.6 / 9.8) = √4 = 2 s. The correct answer is (D) 2 s. A quick shortcut is that 19.6 m corresponds to a fall time of 2 s when g = 9.8 m/s²."
  },
  {
    id: 8,
    question_text: "A force of 50 N acts for 0.2 s on a 2 kg body initially at rest. The speed gained is:",
    option_a: "2.5 m s⁻¹",
    option_b: "5 m s⁻¹",
    option_c: "10 m s⁻¹",
    option_d: "20 m s⁻¹",
    correct_option: "B",
    explanation: "Impulse equals change in momentum: Ft = mv. So v = Ft / m = (50 × 0.2) / 2 = 10 / 2 = 5 m/s. The body gains a speed of 5 m/s. The correct answer is (B) 5 m s⁻¹."
  },
  {
    id: 9,
    question_text: "A gun of mass 6 kg fires a 0.02 kg bullet at 300 m s⁻¹. The recoil speed of the gun is:",
    option_a: "0.5 m s⁻¹",
    option_b: "1 m s⁻¹",
    option_c: "50 m s⁻¹",
    option_d: "2 m s⁻¹",
    correct_option: "B",
    explanation: "Before firing, total momentum is zero. Conservation of momentum gives: 0 = m_bullet v_bullet + M_gun V_gun. So V_gun = −(0.02 × 300) / 6 = −1 m/s. The negative sign shows it recoils in the opposite direction. The magnitude is 1 m/s. Correct answer: (B) 1 m s⁻¹."
  },
  {
    id: 10,
    question_text: "A force of 10 N moves a body 5 m in a direction making 60° with the force. The work done is:",
    option_a: "43.3 J",
    option_b: "5 J",
    option_c: "50 J",
    option_d: "25 J",
    correct_option: "D",
    explanation: "Work done is W = Fd cosθ. Here F = 10 N, d = 5 m, θ = 60°. So W = 10 × 5 × cos60° = 50 × 0.5 = 25 J. The correct answer is (D) 25 J. Many students mistakenly use sin60°, which would give 43.3 J, but work uses cosine of the angle between force and displacement."
  },
  {
    id: 11,
    question_text: "If the speed of a moving body is doubled, its kinetic energy becomes:",
    option_a: "8 times",
    option_b: "Half",
    option_c: "2 times",
    option_d: "4 times",
    correct_option: "D",
    explanation: "Kinetic energy is K = ½mv². Since K is proportional to v², doubling speed multiplies K by 2² = 4. So the kinetic energy becomes 4 times. The correct answer is (D) 4 times."
  },
  {
    id: 12,
    question_text: "The escape velocity of a body from the earth's surface does NOT depend upon:",
    option_a: "The radius of the earth",
    option_b: "The mass of the earth",
    option_c: "The value of g",
    option_d: "The mass of the body",
    correct_option: "D",
    explanation: "Escape velocity is v_esc = √(2GM/R) = √(2gR). It depends on the mass and radius of the planet, and therefore on g, but not on the mass of the body escaping. A pebble and a rocket have the same escape velocity from the same planet. The correct answer is (D) The mass of the body."
  },
  {
    id: 13,
    question_text: "The time period of a geostationary satellite is:",
    option_a: "90 minutes",
    option_b: "12 hours",
    option_c: "24 hours",
    option_d: "1 hour",
    correct_option: "C",
    explanation: "A geostationary satellite stays above the same point on the equator, so its orbital period matches the Earth's rotation period. The Earth rotates once every 24 hours. Therefore the time period is 24 hours. Correct answer: (C) 24 hours. Low Earth orbit satellites take about 90 minutes."
  },
  {
    id: 14,
    question_text: "A body moves in a circle of radius 20 m with a constant speed of 10 m s⁻¹. Its centripetal acceleration is:",
    option_a: "5 m s⁻²",
    option_b: "0.5 m s⁻²",
    option_c: "200 m s⁻²",
    option_d: "2 m s⁻²",
    correct_option: "A",
    explanation: "Centripetal acceleration is a = v² / r = 10² / 20 = 100 / 20 = 5 m/s². The correct answer is (A) 5 m s⁻². A common mistake is to multiply v² and r by mistake, leading to 200."
  },
  {
    id: 15,
    question_text: "Water flows out of a small hole in a tank, 4.9 m below the water surface. The speed of efflux is (g = 9.8 m s⁻²):",
    option_a: "98 m s⁻¹",
    option_b: "9.8 m s⁻¹",
    option_c: "4.9 m s⁻¹",
    option_d: "19.6 m s⁻¹",
    correct_option: "B",
    explanation: "Torricelli's theorem states that v = √(2gh). So v = √(2 × 9.8 × 4.9) = √96.04 = 9.8 m/s. This is the same speed as a body falling freely through 4.9 m. The correct answer is (B) 9.8 m s⁻¹."
  },
  {
    id: 16,
    question_text: "The lift on the wing of an aeroplane is explained by:",
    option_a: "Archimedes' principle",
    option_b: "Stokes' law",
    option_c: "Pascal's law",
    option_d: "Bernoulli's principle",
    correct_option: "D",
    explanation: "The wing is shaped so that air flows faster over the upper curved surface than the lower surface. Bernoulli's principle states that faster-moving fluid has lower pressure. Thus pressure above the wing becomes lower than below it, producing an upward lift. The correct answer is (D) Bernoulli's principle."
  },
  {
    id: 17,
    question_text: "In simple harmonic motion the speed of the body is maximum at:",
    option_a: "The extreme position",
    option_b: "The mean (equilibrium) position",
    option_c: "Midway between mean and extreme",
    option_d: "Every point equally",
    correct_option: "B",
    explanation: "In SHM, the speed is maximum at the mean position where displacement is zero. At the extreme positions, the speed becomes zero and the acceleration is maximum. The relation v = ω√(A² − x²) shows that when x = 0, speed is maximum. So the correct answer is (B) The mean (equilibrium) position."
  },
  {
    id: 18,
    question_text: "The length of a simple pendulum is made four times. Its time period becomes:",
    option_a: "Four times",
    option_b: "Twice",
    option_c: "One quarter",
    option_d: "Half",
    correct_option: "B",
    explanation: "For a simple pendulum, T = 2π√(L/g). Therefore T is proportional to √L. If L becomes four times, then T becomes √4 = 2 times the original value. The correct answer is (B) Twice."
  },
  {
    id: 19,
    question_text: "A sound wave has frequency 500 Hz and wavelength 0.66 m. Its speed is:",
    option_a: "330 m s⁻¹",
    option_b: "757 m s⁻¹",
    option_c: "33 m s⁻¹",
    option_d: "0.0013 m s⁻¹",
    correct_option: "A",
    explanation: "Wave speed is v = fλ. So v = 500 × 0.66 = 330 m/s. The correct answer is (A) 330 m s⁻¹. Sound in air is about 330–340 m/s at normal conditions, which matches this value."
  },
  {
    id: 20,
    question_text: "Two tuning forks of frequencies 256 Hz and 260 Hz are sounded together. The number of beats heard per second is:",
    option_a: "2",
    option_b: "8",
    option_c: "516",
    option_d: "4",
    correct_option: "D",
    explanation: "Beat frequency is the difference between the two frequencies: |f₁ − f₂| = |256 − 260| = 4 beats per second. The correct answer is (D) 4. Beats are due to interference between slightly different frequencies, and the beat frequency equals the difference, not the sum."
  },
  {
    id: 21,
    question_text: "The fundamental frequency of a pipe closed at one end, of length 0.85 m, is (speed of sound = 340 m s⁻¹):",
    option_a: "200 Hz",
    option_b: "100 Hz",
    option_c: "400 Hz",
    option_d: "50 Hz",
    correct_option: "B",
    explanation: "For a pipe closed at one end, the fundamental frequency is f₁ = v / 4L. Substituting: f₁ = 340 / (4 × 0.85) = 340 / 3.4 = 100 Hz. Therefore, the correct answer is (B) 100 Hz. An open pipe would have f = v / 2L = 200 Hz in this case."
  },
  {
    id: 22,
    question_text: "In Young's double-slit experiment, λ = 500 nm, slit separation = 0.5 mm and screen distance = 1 m. The fringe spacing is:",
    option_a: "2 mm",
    option_b: "1 mm",
    option_c: "0.25 mm",
    option_d: "0.5 mm",
    correct_option: "B",
    explanation: "Fringe spacing is Δy = λL / d. Convert units carefully: λ = 500 nm = 500 × 10⁻⁹ m, d = 0.5 mm = 0.5 × 10⁻³ m. Then Δy = (500 × 10⁻⁹ × 1) / (0.5 × 10⁻³) = 1 × 10⁻³ m = 1 mm. The correct answer is (B) 1 mm."
  },
  {
    id: 23,
    question_text: "Light is completely plane-polarized on reflection from glass of refractive index √3. The angle of incidence (Brewster's angle) is:",
    option_a: "45°",
    option_b: "30°",
    option_c: "60°",
    option_d: "90°",
    correct_option: "C",
    explanation: "Brewster's law gives tanθ_B = n. Since n = √3, tanθ_B = √3. Therefore θ_B = 60°. The correct answer is (C) 60°. This is the angle at which reflected light is fully plane-polarized."
  },
  {
    id: 24,
    question_text: "An astronomical telescope has an objective of focal length 100 cm and an eyepiece of focal length 5 cm. Its magnifying power in normal adjustment is:",
    option_a: "105",
    option_b: "0.05",
    option_c: "20",
    option_d: "500",
    correct_option: "C",
    explanation: "Magnifying power in normal adjustment is M = f_o / f_e = 100 / 5 = 20. The tube length is 105 cm, but that is not the magnification. The correct answer is (C) 20."
  },
  {
    id: 25,
    question_text: "A gas absorbs 500 J of heat and does 200 J of work. The change in its internal energy is:",
    option_a: "300 J",
    option_b: "700 J",
    option_c: "−300 J",
    option_d: "100 000 J",
    correct_option: "A",
    explanation: "From the first law of thermodynamics: ΔU = Q − W. Here Q = 500 J and W = 200 J, so ΔU = 500 − 200 = 300 J. The internal energy increases by 300 J. The correct answer is (A) 300 J."
  },
  {
    id: 26,
    question_text: "A Carnot engine works between 500 K and 400 K. Its efficiency is:",
    option_a: "20%",
    option_b: "80%",
    option_c: "25%",
    option_d: "10%",
    correct_option: "A",
    explanation: "Efficiency of a Carnot engine is η = 1 − T₂/T₁ = 1 − 400/500 = 1 − 0.8 = 0.2 = 20%. The correct answer is (A) 20%. The temperatures must be in kelvin, not Celsius."
  },
  {
    id: 27,
    question_text: "The distance between two point charges is halved. The force between them becomes:",
    option_a: "One quarter",
    option_b: "2 times",
    option_c: "Half",
    option_d: "4 times",
    correct_option: "D",
    explanation: "Coulomb's law gives F ∝ 1/r². If the distance is halved, r becomes r/2, so F becomes 1 / (r/2)² = 4 / r², i.e. 4 times the original force. The correct answer is (D) 4 times."
  },
  {
    id: 28,
    question_text: "The electric field at 3 m from a point charge of 2 μC in air is (k = 9×10⁹ N m² C⁻²):",
    option_a: "2000 N C⁻¹",
    option_b: "18 000 N C⁻¹",
    option_c: "6000 N C⁻¹",
    option_d: "667 N C⁻¹",
    correct_option: "A",
    explanation: "Electric field due to a point charge is E = kq / r². Here k = 9×10⁹, q = 2 × 10⁻⁶ C, r = 3 m. So E = (9×10⁹ × 2×10⁻⁶) / 9 = 18×10³ / 9 = 2000 N/C. The correct answer is (A) 2000 N C⁻¹. Note that electric potential would use r in the denominator, not r²."
  },
  {
    id: 29,
    question_text: "Capacitors of 3 μF and 6 μF are connected in series. The equivalent capacitance is:",
    option_a: "2 μF",
    option_b: "4.5 μF",
    option_c: "9 μF",
    option_d: "18 μF",
    correct_option: "A",
    explanation: "For series combination, 1/C = 1/C₁ + 1/C₂ = 1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2. Therefore C = 2 μF. The correct answer is (A) 2 μF. Series capacitances are always smaller than the smallest capacitor."
  },
  {
    id: 30,
    question_text: "A wire is stretched to double its length (its volume stays constant). Its resistance becomes:",
    option_a: "8 times",
    option_b: "4 times",
    option_c: "Half",
    option_d: "2 times",
    correct_option: "B",
    explanation: "Resistance is R = ρL/A. When the length doubles and volume remains constant, area becomes half. So R' = ρ(2L)/(A/2) = 4ρL/A = 4R. Thus the resistance becomes 4 times. The correct answer is (B) 4 times."
  },
  {
    id: 31,
    question_text: "A battery of emf 12 V and internal resistance 1 Ω is connected to a 5 Ω resistor. The terminal voltage is:",
    option_a: "10 V",
    option_b: "12 V",
    option_c: "2 V",
    option_d: "6 V",
    correct_option: "A",
    explanation: "Current in the circuit is I = ε / (R + r) = 12 / (5 + 1) = 2 A. Terminal voltage across the external resistor is V = IR = 2 × 5 = 10 V. Equivalently, V = ε − Ir = 12 − 2 × 1 = 10 V. The correct answer is (A) 10 V."
  },
  {
    id: 32,
    question_text: "Kirchhoff's second law (loop rule) is based on the law of conservation of:",
    option_a: "Charge",
    option_b: "Momentum",
    option_c: "Energy",
    option_d: "Mass",
    correct_option: "C",
    explanation: "Kirchhoff's second law states that the algebraic sum of emfs in a closed loop equals the algebraic sum of potential drops; this is a statement of conservation of energy. The first law (junction law) is based on conservation of charge. The correct answer is (C) Energy."
  },
  {
    id: 33,
    question_text: "The resistance of the filament of a 100 W, 220 V bulb is:",
    option_a: "48.4 Ω",
    option_b: "2.2 Ω",
    option_c: "484 Ω",
    option_d: "22 000 Ω",
    correct_option: "C",
    explanation: "Using P = V² / R, we get R = V² / P = 220² / 100 = 48400 / 100 = 484 Ω. Correct answer: (C) 484 Ω. A 60 W bulb at the same voltage would have a larger resistance than a 100 W bulb."
  },
  {
    id: 34,
    question_text: "A charge of 2 μC moves at 10³ m s⁻¹ perpendicular to a magnetic field of 0.5 T. The force on it is:",
    option_a: "1×10⁻² N",
    option_b: "2×10⁻³ N",
    option_c: "1×10⁻³ N",
    option_d: "1×10⁻⁶ N",
    correct_option: "C",
    explanation: "Magnetic force is F = qvB sinθ. Here q = 2 × 10⁻⁶ C, v = 10³ m/s, B = 0.5 T, and θ = 90°, so sin90° = 1. Then F = 2×10⁻⁶ × 10³ × 0.5 = 1×10⁻³ N. So the correct answer is (C) 1×10⁻³ N."
  },
  {
    id: 35,
    question_text: "The magnetic field at 0.1 m from a long straight wire carrying 10 A is (μ₀ = 4π×10⁻⁷ Wb A⁻¹ m⁻¹):",
    option_a: "4π×10⁻⁶ T",
    option_b: "2×10⁻⁴ T",
    option_c: "2×10⁻⁵ T",
    option_d: "2×10⁻⁶ T",
    correct_option: "C",
    explanation: "For a long straight wire, B = μ₀I / (2πr) = (4π×10⁻⁷ × 10) / (2π × 0.1) = 2×10⁻⁵ T. The π terms cancel. The correct answer is (C) 2×10⁻⁵ T."
  },
  {
    id: 36,
    question_text: "A galvanometer is converted into an ammeter by connecting:",
    option_a: "A high resistance in parallel",
    option_b: "A high resistance in series",
    option_c: "A low resistance in parallel",
    option_d: "A low resistance in series",
    correct_option: "C",
    explanation: "An ammeter measures current and must have very low resistance, so a small shunt resistance is connected in parallel with the galvanometer. This bypasses most of the current and protects the meter. The correct answer is (C) A low resistance in parallel."
  },
  {
    id: 37,
    question_text: "The magnetic flux through a coil changes from 0.5 Wb to 0.1 Wb in 0.2 s. The magnitude of the induced emf is:",
    option_a: "3 V",
    option_b: "2 V",
    option_c: "0.08 V",
    option_d: "0.8 V",
    correct_option: "B",
    explanation: "Induced emf is ε = |ΔΦ / Δt| = |0.5 − 0.1| / 0.2 = 0.4 / 0.2 = 2 V. The minus sign of Lenz's law gives direction, but the magnitude is 2 V. So the correct answer is (B) 2 V."
  },
  {
    id: 38,
    question_text: "A rod 0.4 m long moves at 5 m s⁻¹ perpendicular to a magnetic field of 0.5 T. The motional emf is:",
    option_a: "2 V",
    option_b: "0.1 V",
    option_c: "1 V",
    option_d: "10 V",
    correct_option: "C",
    explanation: "Motional emf is ε = Bℓv = 0.5 × 0.4 × 5 = 1 V. The rod, magnetic field, and velocity are mutually perpendicular. Correct answer: (C) 1 V."
  },
  {
    id: 39,
    question_text: "A 2 H inductor carries a current of 3 A. The energy stored in its magnetic field is:",
    option_a: "9 J",
    option_b: "4.5 J",
    option_c: "6 J",
    option_d: "18 J",
    correct_option: "A",
    explanation: "Energy stored in an inductor is U = ½LI² = ½ × 2 × 3² = ½ × 2 × 9 = 9 J. The correct answer is (A) 9 J. This is analogous to ½mv² for kinetic energy and ½CV² for capacitors."
  },
  {
    id: 40,
    question_text: "In a series circuit the resistance is 30 Ω and the inductive reactance is 40 Ω. The impedance is:",
    option_a: "1200 Ω",
    option_b: "70 Ω",
    option_c: "10 Ω",
    option_d: "50 Ω",
    correct_option: "D",
    explanation: "In a series RL circuit, impedance is Z = √(R² + X_L²) = √(30² + 40²) = √(900 + 1600) = √2500 = 50 Ω. This is a 3-4-5 triangle in disguise. Correct answer: (D) 50 Ω."
  },
  {
    id: 41,
    question_text: "At resonance in a series R-L-C circuit, the impedance is:",
    option_a: "Zero",
    option_b: "Minimum and equal to R",
    option_c: "Maximum",
    option_d: "Equal to X_L + X_C",
    correct_option: "B",
    explanation: "At resonance, X_L = X_C, so the reactive effects cancel out and the net impedance is just the resistance: Z = R. This is the minimum possible impedance, and current is maximum. So the correct answer is (B) Minimum and equal to R."
  },
  {
    id: 42,
    question_text: "An n-type semiconductor is obtained by doping pure silicon with:",
    option_a: "A divalent impurity",
    option_b: "A tetravalent impurity",
    option_c: "A trivalent impurity (e.g. boron)",
    option_d: "A pentavalent impurity (e.g. phosphorus)",
    correct_option: "D",
    explanation: "An n-type semiconductor is made by adding a pentavalent impurity such as phosphorus, which has five valence electrons. Four form covalent bonds with silicon, and the fifth becomes a free electron — a negative charge carrier. Therefore the correct answer is (D) A pentavalent impurity (e.g. phosphorus)."
  },
  {
    id: 43,
    question_text: "In a transistor the collector current is 2 mA and the base current is 40 μA. The current gain β is:",
    option_a: "0.02",
    option_b: "80",
    option_c: "20",
    option_d: "50",
    correct_option: "D",
    explanation: "Current gain β = I_C / I_B. Convert 2 mA to microamps: 2 mA = 2000 μA. Then β = 2000 / 40 = 50. The correct answer is (D) 50."
  },
  {
    id: 44,
    question_text: "An inverting operational amplifier has R_f = 100 kΩ and R_in = 10 kΩ. Its voltage gain is:",
    option_a: "−10",
    option_b: "+10",
    option_c: "−0.1",
    option_d: "−11",
    correct_option: "A",
    explanation: "For an inverting op-amp, the gain is A_v = −R_f / R_in = −100 kΩ / 10 kΩ = −10. The negative sign shows 180° phase reversal. The correct answer is (A) −10."
  },
  {
    id: 45,
    question_text: "The Lyman series of the hydrogen spectrum lies in the:",
    option_a: "X-ray region",
    option_b: "Ultraviolet region",
    option_c: "Visible region",
    option_d: "Infrared region",
    correct_option: "B",
    explanation: "The Lyman series corresponds to electron transitions to the n = 1 level. These are high-energy transitions, and the emitted wavelengths lie in the ultraviolet region. Balmer is visible; Paschen and later are infrared. So the correct answer is (B) Ultraviolet region."
  },
  {
    id: 46,
    question_text: "Photons of energy 4.5 eV fall on a metal of work function 2.3 eV. The stopping potential is:",
    option_a: "2.3 V",
    option_b: "6.8 V",
    option_c: "4.5 V",
    option_d: "2.2 V",
    correct_option: "D",
    explanation: "The maximum kinetic energy of emitted electrons is K.E.max = hf − φ = 4.5 − 2.3 = 2.2 eV. Stopping potential V₀ is numerically equal to this energy in electron-volts, so V₀ = 2.2 V. The correct answer is (D) 2.2 V."
  },
  {
    id: 47,
    question_text: "The de Broglie wavelength of an electron accelerated through 100 V is approximately:",
    option_a: "0.123 nm",
    option_b: "1.23 nm",
    option_c: "12.3 nm",
    option_d: "0.0123 nm",
    correct_option: "A",
    explanation: "For an electron accelerated through voltage V, de Broglie wavelength is λ = 1.226 / √V nm. For V = 100 V, λ = 1.226 / 10 = 0.1226 nm ≈ 0.123 nm. The correct answer is (A) 0.123 nm. This is the standard shortcut for electrons."
  },
  {
    id: 48,
    question_text: "X-rays are produced by electrons accelerated through 31 kV. The minimum (cut-off) wavelength is (hc = 1240 eV nm):",
    option_a: "0.4 nm",
    option_b: "0.004 nm",
    option_c: "4 nm",
    option_d: "0.04 nm",
    correct_option: "D",
    explanation: "The shortest wavelength in X-ray production is λ_min = hc / eV = 1240 / 31000 = 0.04 nm. Here 31 kV = 31,000 V. Therefore the minimum wavelength is 0.04 nm. Correct answer: (D) 0.04 nm."
  },
  {
    id: 49,
    question_text: "Uranium-238 (Z = 92) emits an alpha particle. The daughter nucleus has mass number and atomic number:",
    option_a: "A = 236, Z = 90",
    option_b: "A = 238, Z = 91",
    option_c: "A = 234, Z = 90",
    option_d: "A = 234, Z = 91",
    correct_option: "C",
    explanation: "An alpha particle is ⁴₂He, which has mass number 4 and atomic number 2. When uranium-238 emits an alpha particle, its mass number decreases by 4 and atomic number decreases by 2: 238 − 4 = 234; 92 − 2 = 90. So the daughter nucleus is ²³⁴₉₀X, and the correct answer is (C) A = 234, Z = 90."
  },
  {
    id: 50,
    question_text: "A radioactive sample of 800 g has a half-life of 5 days. The mass remaining after 15 days is:",
    option_a: "400 g",
    option_b: "100 g",
    option_c: "266.7 g",
    option_d: "200 g",
    correct_option: "B",
    explanation: "15 days is three half-lives (15 / 5 = 3). Each half-life halves the mass: 800 → 400 → 200 → 100 g. So after 15 days, 100 g remains. The correct answer is (B) 100 g. A quick method is to use (1/2)³ = 1/8 and 800 × 1/8 = 100 g."
  }
];

export const MOST_REPEATED_PHYSICS_PRACTICE = {
  id: 'most-repeated-physics-mcqs',
  title: 'Most Repeated Physics MCQS',
  force: 'Pakistan Army',
  category: 'Physics',
  difficulty: 'Medium',
  questionsCount: 50,
  duration: '35 mins',
  questions: MOST_REPEATED_PHYSICS_MCQS
};

export default MOST_REPEATED_PHYSICS_MCQS;
