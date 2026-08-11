package com.ese2027.studyos.data.schedule

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

object ScheduleData {

    private val WD = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
    private val MON = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

    private fun dLabel(date: LocalDate): String {
        return "${MON[date.monthValue - 1]} ${date.dayOfMonth}"
    }

    private fun getDayOfWeekStr(date: LocalDate): String {
        // LocalDate dayOfWeek: 1=Mon .. 7=Sun -> WD has Sun at 0
        return when (date.dayOfWeek) {
            java.time.DayOfWeek.SUNDAY -> "Sun"
            java.time.DayOfWeek.MONDAY -> "Mon"
            java.time.DayOfWeek.TUESDAY -> "Tue"
            java.time.DayOfWeek.WEDNESDAY -> "Wed"
            java.time.DayOfWeek.THURSDAY -> "Thu"
            java.time.DayOfWeek.FRIDAY -> "Fri"
            java.time.DayOfWeek.SATURDAY -> "Sat"
        }
    }

    private fun eachDay(startIso: String, endIso: String, action: (LocalDate) -> Unit) {
        var curr = LocalDate.parse(startIso)
        val end = LocalDate.parse(endIso)
        while (!curr.isAfter(end)) {
            action(curr)
            curr = curr.plusDays(1)
        }
    }

    data class TopicPlan(val title: String, val pts: List<String>)

    private val ANALOGS = listOf(
        TopicPlan("Op-Amp Fundamentals", listOf("Ideal vs non-ideal op-amp characteristics", "CMRR, slew rate, offset voltage, bias current", "Open loop vs closed loop gain", "Gain-bandwidth product and frequency response")),
        TopicPlan("Linear Applications I", listOf("Inverting and non-inverting amplifier", "Voltage follower and summing amplifier", "Difference and instrumentation amplifier", "Solve gain and impedance problems")),
        TopicPlan("Linear Applications II", listOf("Integrator and differentiator circuits", "Log and antilog amplifiers", "V-to-I and I-to-V converters", "Frequency response of integrator/differentiator")),
        TopicPlan("Non-Linear Applications", listOf("Comparator and zero crossing detector", "Schmitt trigger — hysteresis and thresholds", "Precision rectifier — half and full wave", "Peak detector and clamper circuits")),
        TopicPlan("Active Filters", listOf("Butterworth filter design basics", "Low pass, high pass, band pass active filters", "First and second order filter response", "Filter Q factor and cutoff frequency")),
        TopicPlan("Waveform Generators", listOf("Triangle and square wave generators", "Wien bridge sine oscillator", "Astable and monostable using op-amp", "Frequency and duty cycle calculations")),
        TopicPlan("555 Timer", listOf("555 internal architecture", "Astable mode — frequency and duty cycle", "Monostable mode — pulse width", "Applications of the 555 timer")),
        TopicPlan("Voltage Regulators", listOf("Series and shunt regulators", "IC regulators — 78xx, 79xx, 723", "Line and load regulation", "Switching regulator basics")),
        TopicPlan("Sample & Hold + Converters", listOf("Sample and hold circuit operation", "DAC — weighted resistor and R-2R ladder", "ADC — flash, SAR, dual slope", "Resolution and conversion time")),
        TopicPlan("Analogs Full Revision", listOf("Rapid revision of all op-amp applications", "Solve 2 problems from each topic", "Cross check with formula sheet", "Mark remaining weak areas"))
    )

    private val COA = listOf(
        TopicPlan("Number Representation", listOf("Fixed and floating point (IEEE 754)", "Signed number formats — 1s, 2s complement", "Overflow, rounding, normalisation", "Solve 5 representation problems")),
        TopicPlan("ALU Design", listOf("Adders — ripple carry, carry lookahead", "Booth's multiplication algorithm", "Restoring and non-restoring division", "ALU control and flags")),
        TopicPlan("CPU Organization", listOf("Register organisation and datapath", "Bus structure and micro-operations", "Instruction cycle — fetch, decode, execute", "Solve datapath timing problems")),
        TopicPlan("Instruction Formats + Addressing", listOf("Instruction formats and opcodes", "Addressing modes — all types", "Effective address calculation", "RISC vs CISC comparison")),
        TopicPlan("Control Unit Design", listOf("Hardwired control unit", "Microprogrammed control", "Horizontal vs vertical microprogramming", "Control signal sequencing")),
        TopicPlan("Pipelining", listOf("Pipeline stages and speedup", "Structural, data, control hazards", "Data forwarding and stalls", "Branch prediction basics")),
        TopicPlan("Memory Hierarchy", listOf("Registers → cache → RAM → secondary", "Memory access time and bandwidth", "Interleaved memory", "Solve memory hierarchy problems")),
        TopicPlan("Cache Mapping", listOf("Direct, associative, set-associative mapping", "Hit ratio and average access time", "Write policies — write back / write through", "Replacement policies — LRU, FIFO")),
        TopicPlan("Virtual Memory + I/O", listOf("Paging, page table, TLB, page faults", "Segmentation basics", "I/O — programmed, interrupt-driven, DMA", "Memory-mapped vs isolated I/O")),
        TopicPlan("COA Full Revision", listOf("Rapid revision of all COA topics", "Solve 2 problems from each topic", "Cross check with formula sheet", "Mark remaining weak areas"))
    )

    private val MEAS = listOf(
        TopicPlan("Error Analysis", listOf("Accuracy, precision, resolution", "Types of errors — gross, systematic, random", "Statistical analysis — mean, std deviation", "Propagation of errors")),
        TopicPlan("PMMC & MI Instruments", listOf("PMMC construction and working", "Moving iron instruments", "Shunts and multipliers — range extension", "Solve range extension problems")),
        TopicPlan("Dynamometer + Wattmeters", listOf("Dynamometer construction", "Wattmeter — power measurement", "Energy meter — induction type", "Errors and compensation")),
        TopicPlan("DC/AC Bridges I", listOf("Wheatstone bridge — sensitivity", "Kelvin double bridge", "Maxwell's inductance bridge", "Solve bridge balance problems")),
        TopicPlan("AC Bridges II", listOf("Hay's bridge", "Schering bridge — capacitance", "Wien bridge — frequency", "Anderson bridge")),
        TopicPlan("Potentiometers", listOf("DC potentiometer — Crompton", "AC potentiometer", "Standardisation and applications", "Solve potentiometer problems")),
        TopicPlan("CRO", listOf("CRT construction and deflection", "Time base and triggering", "Lissajous patterns — frequency, phase", "Measurements using CRO")),
        TopicPlan("Digital Instruments", listOf("Digital voltmeter types", "Digital multimeter", "Q-meter — Q factor measurement", "Frequency counters")),
        TopicPlan("Transducers", listOf("Strain gauge and gauge factor", "LVDT — displacement", "Thermocouple, RTD, thermistor", "Piezoelectric and capacitive transducers")),
        TopicPlan("Measurements Full Revision", listOf("Rapid revision of all Measurements topics", "Solve 2 problems from each topic", "Cross check with formula sheet", "Mark remaining weak areas"))
    )

    private val MATSCI = listOf(
        TopicPlan("Crystal Structure + Band Theory", listOf("Unit cell and Miller indices", "Band theory — conductor/semiconductor/insulator", "Effective mass concept", "Solve 5 crystal structure problems")),
        TopicPlan("Dielectric Materials", listOf("Polarization types", "Permittivity and dielectric constant", "Dielectric loss and loss tangent", "Breakdown mechanisms")),
        TopicPlan("Magnetic Materials", listOf("Dia, para, ferro, ferri magnetism", "Hysteresis — coercivity, retentivity", "Soft vs hard magnetic materials", "Applications and losses")),
        TopicPlan("Semiconductors + Superconductivity", listOf("Intrinsic vs extrinsic carriers", "Compound semiconductors — GaAs, InP", "Meissner effect, critical temperature", "Type I vs Type II superconductors")),
        TopicPlan("Nano Materials", listOf("Quantum dots and confinement", "Carbon nanotubes", "Graphene properties", "MEMS / NEMS basics")),
        TopicPlan("Material Science Full Revision", listOf("Rapid revision of all topics", "Solve 2 problems from each topic", "Cross check with formula sheet", "Mark remaining weak areas"))
    )

    private val ESE14 = listOf("Networks", "Controls", "EDC", "Digital", "EMFT", "Signals", "Communication", "MPMC", "COA", "Analogs", "Measurements", "Material Science")

    private fun studyDay(date: LocalDate, subject: String, tag: String, plan: TopicPlan, badge: String): DaySchedule {
        return DaySchedule(
            dayIndex = 0, // Assigned later
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = subject,
            badge = badge,
            sessions = listOf(
                SessionItem(tag, plan.title, plan.pts),
                SessionItem(tag, "Problem Solving — ${plan.title}", listOf("Solve 8 problems / numericals on ${plan.title}", "Redo 3 solved examples from Made Easy", "Attempt tricky variations and edge cases")),
                SessionItem(tag, "Lecture Revision — ${plan.title}", listOf("Revise Made Easy notes on ${plan.title}", "Redo all solved examples for the topic", "Make one-page short notes")),
                SessionItem("pyq", "PYQ + Statement Questions", listOf("Solve 10 ESE PYQs on ${plan.title}", "Attempt 5 assert-reason Qs (ask Claude)", "Note every wrong answer with reason")),
                SessionItem(tag, "Formula Sheet — $subject", listOf("Add key formulas for ${plan.title}", "Note important results and definitions", "Read the full $subject formula sheet once"))
            )
        )
    }

    private fun mockDay(date: LocalDate, subject: String, tag: String, testName: String, badge: String = "MOCK"): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "$subject — Mock Day",
            badge = badge,
            sessions = listOf(
                SessionItem("mock", testName, listOf("Attempt full test under strict timing", "No reference material during test", "Note raw score honestly")),
                SessionItem("mock", "Full Test Analysis", listOf("Go through every wrong answer — root cause", "Categorise: concept / calculation / careless", "List top 3 weak topics from this test")),
                SessionItem(tag, "Weak Topic Revision", listOf("Revise top 3 weak topics from the mock", "Redo all wrong questions from scratch", "Make notes on weak areas")),
                SessionItem("pyq", "PYQ + Statement Questions", listOf("Solve 10 mixed $subject PYQs", "Attempt 5 assert-reason Qs (ask Claude)", "Note all wrong ones")),
                SessionItem(tag, "$subject Formula Sheet", listOf("Update and finalise $subject formula sheet", "Read all entries once", "Keep the momentum going"))
            )
        )
    }

    private fun examDay(date: LocalDate, n: Int): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "APTRANSCO Exam Window — Day $n",
            badge = "APTRANSCO EXAM",
            sessions = listOf(
                SessionItem("rev", "Pre-Paper Warm-up", listOf("Light formula sheet glance — 20 min max", "No new problems, stay calm", "Reach centre 1 hour early with hall ticket + ID")),
                SessionItem("mock", "🎯 Attempt the Paper", listOf("Read every question carefully", "No negative marking — attempt all questions", "Manage time: flag and move on when stuck")),
                SessionItem("rev", "Post-Paper Recovery", listOf("No post-mortem of the paper", "Eat well, hydrate, rest fully", "Sleep 8 hrs — reset for the next slot"))
            )
        )
    }

    private fun restDay(date: LocalDate, label: String, note: String): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = label,
            badge = "RECOVERY",
            sessions = listOf(
                SessionItem("rev", "Full Rest", listOf(note, "Sleep 8 hrs, eat well, light walk", "Reset mentally for the next phase")),
                SessionItem("rev", "Light Housekeeping", listOf("Tidy notes and formula sheets", "Plan the upcoming week", "Optional: 20 min light reading only"))
            )
        )
    }

    private fun revDay(date: LocalDate, pair: List<String>, badge: String): DaySchedule {
        val a = pair[0]
        val b = pair[1]
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "Revision — $a + $b",
            badge = badge,
            sessions = listOf(
                SessionItem("rev", "$a — Rapid Revision", listOf("Short notes read for all $a topics", "Solve 10 PYQs — $a", "Redo previously wrong questions")),
                SessionItem("rev", "$b — Rapid Revision", listOf("Short notes read for all $b topics", "Solve 10 PYQs — $b", "Redo previously wrong questions")),
                SessionItem("rev", "Formula Sheet Cross-check", listOf("Read $a + $b formula sheets", "Fix any gaps found while solving", "Highlight 3 key formulas per subject")),
                SessionItem("pyq", "PYQ + Statement Questions", listOf("10 mixed statement Qs — $a + $b (ask Claude)", "Focus on tricky assertions", "Note all wrong ones")),
                SessionItem("rev", "Weak Area Notes", listOf("Log today's weak spots in one place", "Plan tomorrow's targeted fixes", "Quick self-rating per topic"))
            )
        )
    }

    private fun grandTestDay(date: LocalDate, name: String, badge: String = "GRAND TEST"): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "Grand Test — Mixed",
            badge = badge,
            sessions = listOf(
                SessionItem("mock", name, listOf("Attempt mixed grand test under strict timing", "Full exam simulation — no breaks", "Note raw score and track vs last week")),
                SessionItem("mock", "Test Analysis", listOf("Go through every wrong answer", "Identify top 5 weak areas across subjects", "Categorise: concept / calculation / careless")),
                SessionItem("rev", "Weak Subject Revision", listOf("Revise top 3 weak subjects from the test", "Redo all wrong questions from scratch", "Make targeted notes")),
                SessionItem("pyq", "PYQ + Statement Questions", listOf("15 mixed statement Qs on weak areas (ask Claude)", "Focus on repeat ESE patterns", "Note all wrong ones")),
                SessionItem("rev", "Formula Sheet Read", listOf("Read weak-subject formula sheets", "Highlight repeatedly-missed formulas", "Plan next week's focus"))
            )
        )
    }

    private fun subjectMockMarathonDay(date: LocalDate, subj: String): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "$subj — Mock Marathon",
            badge = "MOCK MARATHON",
            sessions = listOf(
                SessionItem("mock", "$subj Subject Mock — 30 Qs Timed", listOf("Attempt full subject mock — strict timing", "No reference material", "Note raw score")),
                SessionItem("mock", "Same-Day Analysis", listOf("Analyse every wrong answer immediately", "Compare score vs first attempt on $subj", "List remaining weak topics")),
                SessionItem("rev", "$subj Weak Topic Fix", listOf("Revise weak topics from the mock", "Redo wrong questions from scratch", "Update short notes")),
                SessionItem("pyq", "PYQ Booster", listOf("Solve 10 more $subj PYQs", "Focus on statement-type questions", "Note all wrong ones")),
                SessionItem("rev", "Formula Sheet Touch-up", listOf("Read $subj formula sheet", "Fix any gaps found today", "$subj ✅ for this pass"))
            )
        )
    }

    private fun pyqSprintDay(date: LocalDate, subj: String): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "Final Sprint — $subj",
            badge = "PYQ SPRINT",
            sessions = listOf(
                SessionItem("rev", "Morning Formula Read", listOf("Read $subj formula sheet first thing", "Highlight the 5 most important formulas", "No new content")),
                SessionItem("pyq", "$subj — 40 PYQs", listOf("Solve 40 previous-year questions on $subj", "Identify repeat patterns", "Time yourself — 1 Q per 1.5 min")),
                SessionItem("rev", "Wrong-Answer Rework", listOf("Redo every wrong PYQ from scratch", "Understand why the right option is right", "Log recurring traps")),
                SessionItem("pyq", "Statement Question Set", listOf("10 assert-reason Qs — $subj (ask Claude)", "Focus on ESE-style tricky statements", "Note all wrong ones")),
                SessionItem("rev", "Evening Consolidation", listOf("Quick short-notes read for $subj", "Self-rate confidence on each topic", "Plan tomorrow's subject"))
            )
        )
    }

    private fun taperDay(date: LocalDate, subj: String): DaySchedule {
        return DaySchedule(
            dayIndex = 0,
            date = dLabel(date),
            day = getDayOfWeekStr(date),
            subject = "Last 10 Days — $subj",
            badge = "TAPER",
            sessions = listOf(
                SessionItem("rev", "Light Revision — $subj", listOf("Read short notes for $subj only", "No heavy problem solving", "Glance at formula sheet")),
                SessionItem("rev", "Key Formulas Glance", listOf("Revise the most important $subj formulas", "Read, don't solve", "Keep it calm and light")),
                SessionItem("rev", "Wellbeing", listOf("Sleep 8 hrs, eat well", "Light walk, no screens late", "Full confidence mode — trust the prep"))
            )
        )
    }

    private fun subjectBlock(start: String, end: String, subject: String, tag: String, plans: List<TopicPlan>, testName: String, badge: String): List<DaySchedule> {
        val out = mutableListOf<DaySchedule>()
        var p = 0
        eachDay(start, end) { dt ->
            if (dt.dayOfWeek == java.time.DayOfWeek.SUNDAY) {
                out.add(mockDay(dt, subject, tag, testName, badge))
            } else {
                val plan = plans[p.coerceAtMost(plans.size - 1)]
                out.add(studyDay(dt, subject, tag, plan, badge))
                p++
            }
        }
        return out
    }

    private fun rotatingRevision(start: String, end: String, rotation: List<String>, badge: String, gtName: String): List<DaySchedule> {
        val out = mutableListOf<DaySchedule>()
        var r = 0
        eachDay(start, end) { dt ->
            if (dt.dayOfWeek == java.time.DayOfWeek.SUNDAY) {
                out.add(grandTestDay(dt, gtName, if (badge == "REVISION") "GRAND TEST" else badge))
            } else {
                val pair = listOf(rotation[r % rotation.size], rotation[(r + 1) % rotation.size])
                r += 2
                out.add(revDay(dt, pair, badge))
            }
        }
        return out
    }

    // Cached singleton list of all 208 days
    val allDays: List<DaySchedule> by lazy {
        generateSchedule()
    }

    private fun generateSchedule(): List<DaySchedule> {
        val list = mutableListOf<DaySchedule>()

        // 1. Controls Day 1-7 (Jul 8 - Jul 14)
        list.add(studyDay(LocalDate.of(2026, 7, 8), "Controls", "ctrl", TopicPlan("Open & Closed Loop + Transfer Functions", listOf("Open loop vs closed loop — differences, examples", "Transfer function derivation from differential equations", "Standard 1st and 2nd order systems — poles and zeros", "Derive TF for electrical and mechanical systems")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 9), "Controls", "ctrl", TopicPlan("Time Response Analysis", listOf("Step response of 1st and 2nd order systems", "Derive rise time, peak time, settling time, overshoot", "Solve 5 time response numericals", "Overdamped / underdamped / critically damped comparison")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 10), "Controls", "ctrl", TopicPlan("Routh-Hurwitz Stability", listOf("Routh array construction — all special cases", "Find range of K for stability", "Solve 8 Routh-Hurwitz problems", "Concept of absolute and marginal stability")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 11), "Controls", "ctrl", TopicPlan("Bode Plots", listOf("Magnitude and phase plot construction rules", "Gain crossover and phase crossover frequencies", "Gain margin and phase margin from Bode plot", "Sketch Bode plot for given TF — 3 problems")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 12), "Controls", "ctrl", TopicPlan("Compensators — Lead, Lag, Lead-Lag", listOf("Lead compensator — purpose, TF, effect", "Lag compensator — purpose, TF, effect", "Lead-lag combined effect", "Design simple lead compensator for given specs")), "APTRANSCO + ESE"))
        list.add(mockDay(LocalDate.of(2026, 7, 13), "Controls", "ctrl", "Made Easy Test 3 — Control Systems"))
        list.add(studyDay(LocalDate.of(2026, 7, 14), "Controls", "ctrl", TopicPlan("Controls Full Revision", listOf("Rapid revision: TF → Block diagrams → SFG → Time response", "Solve 2 problems from each topic", "Mark remaining weak areas", "Cross check with formula sheet")), "APTRANSCO + ESE"))

        // 2. EDC Day 8-14 (Jul 15 - Jul 18)
        list.add(studyDay(LocalDate.of(2026, 7, 15), "EDC", "edc", TopicPlan("Semiconductor Physics + Junctions", listOf("Energy bands, intrinsic/extrinsic semiconductors", "Drift & diffusion currents, Einstein relation", "PN junction — depletion width, built-in potential, I-V", "Zener breakdown — avalanche vs Zener")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 16), "EDC", "edc", TopicPlan("BJT — Characteristics and Biasing", listOf("CB, CE, CC configurations — characteristics", "Operating point, load line analysis", "Fixed bias, voltage divider bias, self bias", "DC analysis of biasing circuits")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 17), "EDC", "edc", TopicPlan("FET — JFET and MOSFET", listOf("JFET characteristics — pinch-off, IDSS, VP", "MOSFET — enhancement and depletion types", "FET biasing — self bias, voltage divider", "FET small signal model — gm, rd")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 18), "EDC", "edc", TopicPlan("Power Amplifiers + Op-Amp Basics", listOf("Class A, B, AB, C — efficiency comparison", "Push-pull amplifier — crossover distortion", "Op-Amp — ideal characteristics, CMRR, slew rate", "Op-Amp applications: inverting, non-inverting, summing")), "APTRANSCO + ESE"))

        // 3. Digital (Jul 19 - Jul 21)
        list.add(studyDay(LocalDate.of(2026, 7, 19), "Digital", "dig", TopicPlan("Number Systems + Boolean + Combinational", listOf("Number systems conversions: binary, octal, hex", "K-map simplification — 3 and 4 variable", "Combinational: MUX, DEMUX, encoder, decoder, adder", "Boolean algebra theorems, De Morgan's law")), "APTRANSCO + ESE"))
        list.add(mockDay(LocalDate.of(2026, 7, 20), "Digital", "dig", "Made Easy Test 7 — Analog & Digital Circuits"))
        list.add(studyDay(LocalDate.of(2026, 7, 21), "Digital", "dig", TopicPlan("Digital + EDC Full Revision", listOf("Rapid revision: number systems → Boolean → K-map → combinational", "Rapid revision: sequential → counters → registers", "Cross-check all topics with Made Easy checklist", "Wrap up EDC & Digital")), "APTRANSCO + ESE"))

        // 4. EMFT (Jul 22 - Jul 28)
        list.add(studyDay(LocalDate.of(2026, 7, 22), "EMFT", "emft", TopicPlan("Vector Calculus + Electrostatics", listOf("Gradient, divergence, curl — physical meaning", "Gauss's law, Coulomb's law, Electric potential", "Boundary conditions for E field", "Solve 5 electrostatics problems")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 23), "EMFT", "emft", TopicPlan("Maxwell's Equations + Plane Waves", listOf("Maxwell's equations — integral and differential form", "Plane wave propagation in lossless and lossy medium", "Intrinsic impedance, phase velocity, skin depth", "Poynting theorem — power flow")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 24), "EMFT", "emft", TopicPlan("Standing Waves + Impedance Matching", listOf("VSWR — definition and formula", "Reflection coefficient Γ — magnitude and phase", "Quarter wave transformer — impedance matching", "Single stub matching — concept")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 25), "EMFT", "emft", TopicPlan("Antennas", listOf("Hertz dipole — radiation pattern, directivity", "Half wave dipole — input impedance, gain", "Antenna parameters: EIRP, beam width, radiation resistance", "Antenna arrays — broadside and end-fire")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 26), "EMFT", "emft", TopicPlan("EMFT Full Revision", listOf("Rapid revision: Vector calc → Electrostatics → Magnetostatics → Maxwell", "Rapid revision: Plane waves → TL → Waveguides → Antennas", "Solve 2 problems from each topic", "Cross check with formula sheet")), "APTRANSCO + ESE"))
        list.add(mockDay(LocalDate.of(2026, 7, 27), "EMFT", "emft", "Made Easy Test 9 — Electro Magnetics"))
        list.add(studyDay(LocalDate.of(2026, 7, 28), "EMFT", "emft", TopicPlan("EMFT Buffer — Remaining Weak Areas", listOf("Address any remaining EMFT doubts", "Solve 5 problems on weakest topic", "Cross-verify formula sheet with notes", "EMFT Complete")), "APTRANSCO + ESE"))

        // 5. Material Science (Jul 29 - Jul 31)
        list.add(studyDay(LocalDate.of(2026, 7, 29), "Material Science", "mat", TopicPlan("Crystal Structure + Band Theory", listOf("Crystal structure — unit cell, Miller indices", "Band theory — conductor, semiconductor, insulator", "Effective mass concept", "Solve 5 crystal structure problems")), "ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 30), "Material Science", "mat", TopicPlan("Semiconductor Materials + Superconductivity", listOf("Intrinsic vs extrinsic — carrier concentration", "Compound semiconductors: GaAs, InP properties", "Superconductivity — Meissner effect, critical temperature", "Type I and Type II superconductors")), "ESE"))
        list.add(studyDay(LocalDate.of(2026, 7, 31), "Material Science", "mat", TopicPlan("Material Science Full Revision", listOf("Rapid revision: Crystal → Band theory → Dielectric → Magnetic", "Rapid revision: Semiconductors → Superconductivity → Nano", "Solve 5 mixed problems", "Material Science Complete")), "ESE"))

        // 6. MPMC (Aug 1 - Aug 3)
        list.add(studyDay(LocalDate.of(2026, 8, 1), "MPMC", "mpmc", TopicPlan("8085 Architecture + Instruction Set", listOf("8085 internal architecture — registers, ALU, buses", "Instruction set: data transfer, arithmetic, logical, branch", "Addressing modes in 8085", "Write and trace 5 assembly programs")), "APTRANSCO + ESE"))
        list.add(mockDay(LocalDate.of(2026, 8, 2), "MPMC", "mpmc", "Made Easy Test 14 — Info & Comm Technologies"))
        list.add(studyDay(LocalDate.of(2026, 8, 3), "MPMC", "mpmc", TopicPlan("Memory Interfacing + Microcontrollers", listOf("Memory interfacing — address decoding, chip select logic", "Memory map design for 8085/8086", "Microcontroller basics — 8051 architecture overview", "Compare microprocessor vs microcontroller")), "APTRANSCO + ESE"))

        // 7. Communication (Aug 4 - Aug 10)
        list.add(studyDay(LocalDate.of(2026, 8, 4), "Communication", "comm", TopicPlan("AM Modulation — DSB, SSB, VSB", listOf("AM — modulation index, power, bandwidth", "DSB-SC generation using balanced modulator", "SSB — filter and phase shift method", "VSB — characteristics and usage in TV")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 5), "Communication", "comm", TopicPlan("Noise in Communication Systems", listOf("Thermal noise, shot noise, flicker noise", "Noise figure, noise temperature, Friis formula", "SNR for AM, DSB-SC, SSB receivers", "FM vs AM noise performance comparison")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 6), "Communication", "comm", TopicPlan("Sampling + Pulse Modulation + PCM", listOf("Sampling theorem, Nyquist rate, aliasing", "PAM, PWM, PPM — generation and comparison", "PCM — quantization, quantization noise, SQNR", "Bit rate and bandwidth calculations for PCM")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 7), "Communication", "comm", TopicPlan("Information Theory", listOf("Entropy — definition, properties, joint and conditional", "Mutual information, channel capacity", "Shannon-Hartley theorem: C = B log2(1 + S/N)", "Source coding theorem, Huffman coding")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 8), "Communication", "comm", TopicPlan("Fiber Optics + Satellite Communication", listOf("Fiber types: single mode, multimode — attenuation, dispersion", "Numerical aperture, acceptance angle", "Satellite communication — link budget basics, transponder", "VSAT, GPS basic concepts")), "APTRANSCO + ESE"))
        list.add(mockDay(LocalDate.of(2026, 8, 9), "Communication", "comm", "Made Easy Test 15 — Analog & Digital Comm"))
        list.add(studyDay(LocalDate.of(2026, 8, 10), "Communication", "comm", TopicPlan("Communication Buffer — Weak Areas", listOf("Address any remaining Communication doubts", "Solve 5 problems on weakest topic", "Cross-verify formula sheet entries", "Communication Complete")), "APTRANSCO + ESE"))

        // 8. Signals (Aug 11 - Aug 17)
        list.add(studyDay(LocalDate.of(2026, 8, 11), "Signals", "sig", TopicPlan("LTI Systems + Convolution", listOf("Signal classification: continuous, discrete, energy, power", "LTI system properties: linearity, causality, stability", "Convolution integral and sum — solve 6 problems", "Impulse response and system characterization")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 12), "Signals", "sig", TopicPlan("Fourier Transform", listOf("FT definition, inverse transform", "FT properties: linearity, time shift, frequency shift, scaling, duality", "Standard FT pairs — rect, sinc, impulse, exponential", "Solve 8 Fourier transform problems")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 13), "Signals", "sig", TopicPlan("Z-Transform", listOf("Z-transform — definition, ROC for sequences", "Z-transform properties: linearity, time shifting, convolution", "Standard Z-transform pairs", "Inverse Z-transform — partial fraction and power series")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 14), "Signals", "sig", TopicPlan("Signals Full Revision — All Topics", listOf("Rapid revision: LTI → Fourier Series → FT → Laplace → Z → DFT", "Solve 2 problems from each topic", "Mark remaining weak areas", "Signals Complete")), "APTRANSCO + ESE"))
        list.add(studyDay(LocalDate.of(2026, 8, 15), "Signals", "sig", TopicPlan("Signals Buffer + Extra Practice", listOf("Address any remaining Signals doubts", "Solve 5 problems on weakest topic", "Verify all formula sheet entries", "APTRANSCO Quick Revision")), "APTRANSCO + ESE"))
        list.add(grandTestDay(LocalDate.of(2026, 8, 16), "Full APTRANSCO Pattern Mock — 100 Qs"))
        list.add(studyDay(LocalDate.of(2026, 8, 17), "Signals", "sig", TopicPlan("Signals Final Revision", listOf("Final rapid revision of all Signals topics", "Solve 5 tricky PYQs on transforms", "Verify formula sheet — no gaps", "Sprint — EMFT + MPMC")), "APTRANSCO SPRINT"))

        // 9. COA & Final Sprint (Aug 18 - Aug 21)
        list.add(studyDay(LocalDate.of(2026, 8, 18), "COA", "coa", TopicPlan("COA — Architecture + Pipelining", listOf("Number representation: fixed point, floating point IEEE 754", "ALU design — carry lookahead adder, booth multiplier", "CPU organization — hardwired vs microprogrammed control", "Pipelining — stages, hazards, forwarding")), "APTRANSCO SPRINT"))
        list.add(studyDay(LocalDate.of(2026, 8, 19), "APTRANSCO Sprint", "rev", TopicPlan("Sprint — Networks + Controls + EDC", listOf("Networks: 10 PYQs — theorems, two port, transients", "Controls: 10 PYQs — Bode, Nyquist, Routh, root locus", "EDC: 10 PYQs — BJT, FET, feedback, oscillators", "General Ability Quick Revision")), "APTRANSCO SPRINT"))
        list.add(mockDay(LocalDate.of(2026, 8, 20), "APTRANSCO Final Mock", "mock", "APTRANSCO Final Mock — 100 Qs, 3 hrs", "EXAM PREP"))
        list.add(studyDay(LocalDate.of(2026, 8, 21), "Exam Prep Day", "rev", TopicPlan("Morning Light Revision Only", listOf("Read formula sheets lightly — 30 min max", "Key Formulas Quick Glance", "Mental Preparation & Logistics Check", "Ready for APTRANSCO Exam")), "EXAM PREP"))

        // 10. Aug 22 - Aug 29: APTRANSCO Exam Window (8 days)
        var examN = 1
        eachDay("2026-08-22", "2026-08-29") { dt ->
            list.add(examDay(dt, examN))
            examN++
        }

        // 11. Aug 30 - Aug 31: Post-Exam Recovery (2 days)
        eachDay("2026-08-30", "2026-08-31") { dt ->
            list.add(restDay(dt, "Post-Exam Recovery", "Complete rest after APTRANSCO — recharge fully"))
        }

        // 12. Sep 1 - Sep 13: Analogs (13 days)
        list.addAll(subjectBlock("2026-09-01", "2026-09-13", "Analogs", "ana", ANALOGS, "Analogs Mock — 30 Qs", "ESE ONLY"))

        // 13. Sep 14 - Sep 27: COA (14 days)
        list.addAll(subjectBlock("2026-09-14", "2026-09-27", "COA", "coa", COA, "COA Mock — 25 Qs", "ESE ONLY"))

        // 14. Sep 28 - Oct 11: Measurements (14 days)
        list.addAll(subjectBlock("2026-09-28", "2026-10-11", "Measurements", "meas", MEAS, "Measurements Mock — 25 Qs", "ESE ONLY"))

        // 15. Oct 12 - Oct 31: Rotating Revision (20 days)
        list.addAll(rotatingRevision("2026-10-12", "2026-10-31", listOf("Analogs", "COA", "Measurements", "EDC", "Digital"), "REVISION", "Grand Test — ESE-only subjects (40 Qs)"))

        // 16. Nov 1 - Nov 8: Material Science (8 days)
        list.addAll(subjectBlock("2026-11-01", "2026-11-08", "Material Science", "mat", MATSCI, "Material Science Mock — 20 Qs", "ESE ONLY"))

        // 17. Nov 9 - Nov 30: Revision Pass 1 (22 days)
        list.addAll(rotatingRevision("2026-11-09", "2026-11-30", ESE14, "REVISION PASS 1", "Weekly Grand Test — mixed 40 Qs"))

        // 18. Dec 1 - Dec 14: Revision Pass 2 (14 days)
        list.addAll(rotatingRevision("2026-12-01", "2026-12-14", ESE14, "REVISION PASS 2", "Full ESE Pattern Paper — mixed"))

        // 19. Dec 15 - Dec 31: Subject Mock Marathon (17 days)
        var smIdx = 0
        eachDay("2026-12-15", "2026-12-31") { dt ->
            list.add(subjectMockMarathonDay(dt, ESE14[smIdx % ESE14.size]))
            smIdx++
        }

        // 20. Jan 1 - Jan 20: PYQ Sprint (20 days)
        var pyqIdx = 0
        eachDay("2027-01-01", "2027-01-20") { dt ->
            list.add(pyqSprintDay(dt, ESE14[pyqIdx % ESE14.size]))
            pyqIdx++
        }

        // 21. Jan 21 - Jan 30: Taper (10 days)
        var tpIdx = 0
        eachDay("2027-01-21", "2027-01-30") { dt ->
            list.add(taperDay(dt, ESE14[tpIdx % ESE14.size]))
            tpIdx++
        }

        // 22. Jan 31: ESE 2027 Exam Day (Day 208)
        list.add(
            DaySchedule(
                dayIndex = 0,
                date = "Jan 31",
                day = "Sun",
                subject = "🎯 ESE 2027 EXAM DAY",
                badge = "ESE EXAM DAY",
                sessions = listOf(
                    SessionItem("rev", "Morning — Calm & Ready", listOf("Light formula glance only — 15 min", "Good breakfast, hydrate", "Reach centre early with all documents")),
                    SessionItem("mock", "🎯 The Exam", listOf("Read each question carefully", "Trust 7 months of consistent work", "Stay calm, manage time, finish strong")),
                    SessionItem("rev", "You Are Ready", listOf("This is what all the prep was for", "Give it everything", "Then rest — you earned it"))
                )
            )
        )

        // Assign zero-based dayIndex across all generated days
        return list.mapIndexed { index, daySchedule ->
            daySchedule.copy(dayIndex = index)
        }
    }
}
