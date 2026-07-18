const SLOTS = [
{ icon: "📖", label: "Slot 1", time: "8:30–10:30", desc: "New / Hard Topics" },
{ icon: "✏️", label: "Slot 2", time: "11:00–1:00", desc: "Problem Solving" },
{ icon: "📚", label: "Slot 3", time: "3:00–6:00", desc: "Lecture Revision" },
{ icon: "✍️", label: "Slot 4", time: "6:30–8:30", desc: "PYQ + Statement Qs" },
{ icon: "📝", label: "Slot 5", time: "9:30–10:30", desc: "Formula Revision" },
];
const DATA = [
{ date: "Jul 8", day: "Tue", subject: "Controls", badge:"APTRANSCO + ESE", sessions: [
{ tag: "ctrl", title: "Open & Closed Loop + Transfer Functions", tasks: ["Open loop vs closed loop — differences, examples","Transfer function derivation from differential equations","Standard 1st and 2nd order systems — poles and zeros","Derive TF for electrical and mechanical systems"] },
{ tag: "ctrl", title: "Block Diagram + Signal Flow Graphs", tasks: ["Series, parallel, feedback reduction rules","Solve 5 block diagram reduction problems","Mason's gain formula — derive and apply","Solve 3 SFG problems using Mason's formula"] },
{ tag: "ctrl", title: "Lecture Revision — TF + Block Diagrams", tasks: ["Revise Made Easy notes on TF concepts","Redo 3 solved examples from notes","Make short notes — key reduction rules on one page"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Block diagrams + TF","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer with reason"] },
{ tag: "ctrl", title: "Formula Sheet — Controls Day 1", tasks: ["Write standard TF forms for 1st and 2nd order","Note Mason's gain formula","Add 3 key reduction rules to formula sheet"] },
]},
{ date: "Jul 9", day: "Wed", subject: "Controls", badge:"APTRANSCO + ESE", sessions: [
{ tag: "ctrl", title: "Time Response Analysis", tasks: ["Step response of 1st and 2nd order systems","Derive rise time, peak time, settling time, overshoot","Solve 5 time response numericals","Overdamped / underdamped / critically damped comparison"] },
{ tag: "ctrl", title: "Steady State Error", tasks: ["Error constants: Kp, Kv, Ka for type 0,1,2","Steady state error for step, ramp, parabolic inputs","Solve 8 steady state error problems","Identify system type from open loop TF"] },
{ tag: "ctrl", title: "Lecture Revision — Time Response", tasks: ["Revise 2nd order system response from Made Easy","Redo all solved examples on time response","Make table: system type vs error for each input"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on time response and SSE","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer with reason"] },
{ tag: "ctrl", title: "Formula Sheet — Time Response", tasks: ["Write all performance spec formulas (tr, tp, ts, Mp)","Add error constant table","Note standard 2nd order TF form"] },
]},
{ date: "Jul 10", day: "Thu", subject: "Controls", badge:"APTRANSCO + ESE", sessions: [
{ tag: "ctrl", title: "Routh-Hurwitz Stability", tasks: ["Routh array construction — all special cases","Find range of K for stability","Solve 8 Routh-Hurwitz problems","Concept of absolute and marginal stability"] },
{ tag: "ctrl", title: "Root Locus", tasks: ["All 8 root locus construction rules","Sketch root locus for given characteristic equation","Find breakaway/break-in points","Solve 5 root locus problems"] },
{ tag: "ctrl", title: "Lecture Revision — Stability", tasks: ["Revise Routh-Hurwitz from Made Easy notes","Revise root locus rules — redo one full example","Make cheat sheet: root locus rules summary"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Routh + Root Locus","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "ctrl", title: "Formula Sheet — Stability", tasks: ["Write Routh array with special case rules","List all root locus construction rules (1-8)","Note breakaway point formula"] },
]},
{ date: "Jul 11", day: "Fri", subject: "Controls", badge:"APTRANSCO + ESE", sessions: [
{ tag: "ctrl", title: "Bode Plots", tasks: ["Magnitude and phase plot construction rules","Gain crossover and phase crossover frequencies","Gain margin and phase margin from Bode plot","Sketch Bode plot for given TF — 3 problems"] },
{ tag: "ctrl", title: "Nyquist Criterion", tasks: ["Nyquist stability criterion — N, P, Z relationship","Nyquist plot construction for simple TF","Identify stability from Nyquist plot","Solve 5 Nyquist problems"] },
{ tag: "ctrl", title: "Lecture Revision — Frequency Domain", tasks: ["Revise Bode plot construction from Made Easy","Revise Nyquist criterion — redo solved examples","Make comparison table: Bode vs Nyquist"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Bode + Nyquist","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "ctrl", title: "Formula Sheet — Frequency Domain", tasks: ["Write GM and PM definitions with formulas","Note slope rules for Bode magnitude plot","Add Nyquist stability condition Z = N + P"] },
]},
{ date: "Jul 12", day: "Sat", subject: "Controls", badge:"APTRANSCO + ESE", sessions: [
{ tag: "ctrl", title: "Compensators — Lead, Lag, Lead-Lag", tasks: ["Lead compensator — purpose, TF, effect","Lag compensator — purpose, TF, effect","Lead-lag combined effect","Design simple lead compensator for given specs"] },
{ tag: "ctrl", title: "State Space Analysis", tasks: ["State variable representation — A, B, C, D matrices","Controllability and observability — Kalman's test","State transition matrix properties","Solve 4 state space problems"] },
{ tag: "ctrl", title: "Lecture Revision — Compensators + State Space", tasks: ["Revise compensator design from Made Easy","Revise state space — redo examples","Summary: when to use lead vs lag compensator"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on compensators + state space","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "ctrl", title: "Formula Sheet — Compensators", tasks: ["Write lead/lag compensator TF standard forms","Note controllability and observability matrix forms","Add state transition matrix properties"] },
]},
{ date: "Jul 13", day: "Sun", subject: "Controls — Mock Day", badge:"MOCK", sessions: [
{ tag: "mock", title: "Made Easy Test 3 — Control Systems", tasks: ["Attempt full test — 38 Qs, 45 min, strict timing","No reference material during test","Note raw score"] },
{ tag: "mock", title: "Full Test Analysis", tasks: ["Go through every wrong answer — find root cause","Categorise errors: concept / calculation / careless","List top 3 weak topics from this test"] },
{ tag: "ctrl", title: "Weak Topic Revision", tasks: ["Revise top 3 weak topics from mock","Redo wrong questions from scratch","Make additional notes on weak areas"] },
{ tag: "pyq", title: "Controls PYQ Sprint", tasks: ["Solve 15 mixed ESE PYQs — all Controls topics","Focus on statement-type questions","Review all answers carefully"] },
{ tag: "ctrl", title: "Controls Formula Sheet — Final", tasks: ["Complete and finalise Controls formula sheet","Read all entries once","Controls ✅ — Ready for EDC"] },
]},
{ date: "Jul 14", day: "Mon", subject: "Controls", badge:"APTRANSCO + ESE", sessions: [
{ tag: "ctrl", title: "Controls Full Revision — Part 1", tasks: ["Rapid revision: TF → Block diagrams → SFG → Time response","Solve 2 problems from each topic","Mark remaining weak areas"] },
{ tag: "ctrl", title: "Controls Full Revision — Part 2", tasks: ["Rapid revision: Routh → Root locus → Bode → Nyquist → Compensators","Solve 2 problems from each topic","Cross-check with formula sheet"] },
{ tag: "ctrl", title: "Controls — All PYQ Weak Areas", tasks: ["Redo all previously wrong PYQs from this week","Solve 10 new mixed PYQs","Ensure no pending doubts"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — Controls (ask Claude)","Focus on tricky statement questions","Note all wrong ones"] },
{ tag: "ctrl", title: "Controls Wrap-up", tasks: ["Final read of Controls formula sheet","Write 5 most important concepts in own words","Controls ✅ — Ready for EDC tomorrow"] },
]},
{ date: "Jul 15", day: "Tue", subject: "EDC", badge:"APTRANSCO + ESE", sessions: [
{ tag: "edc", title: "Semiconductor Physics + Junctions", tasks: ["Energy bands, intrinsic/extrinsic semiconductors","Drift & diffusion currents, Einstein relation","PN junction — depletion width, built-in potential, I-V","Zener breakdown — avalanche vs Zener"] },
{ tag: "edc", title: "Optoelectronics + Special Devices", tasks: ["LED, photodiode, solar cell characteristics","Tunnel diode, UJT, SCR — V-I characteristics","Solve 8 numericals on junction devices","Clipping and clamping circuits"] },
{ tag: "edc", title: "Lecture Revision — Semiconductor + Junctions", tasks: ["Revise Made Easy notes on semiconductor physics","Redo all solved examples on junction diode","Make short notes — key formulas one page"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Semiconductor + Junctions","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "edc", title: "Formula Sheet — EDC Day 1", tasks: ["Write diode I-V equation and approximations","Note depletion width formula","Add Einstein relation: D/μ = kT/q"] },
]},
{ date: "Jul 16", day: "Wed", subject: "EDC", badge:"APTRANSCO + ESE", sessions: [
{ tag: "edc", title: "BJT — Characteristics and Biasing", tasks: ["CB, CE, CC configurations — characteristics","Operating point, load line analysis","Fixed bias, voltage divider bias, self bias","DC analysis of biasing circuits"] },
{ tag: "edc", title: "BJT — Small Signal + Amplifiers", tasks: ["h-parameter equivalent circuit — CE configuration","CE amplifier: voltage gain, input/output impedance","CB and CC amplifiers comparison","Solve 8 small signal BJT problems"] },
{ tag: "edc", title: "Lecture Revision — BJT", tasks: ["Revise Made Easy BJT notes completely","Redo solved examples on biasing and small signal","Make table: CE vs CB vs CC comparison"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on BJT","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "edc", title: "Formula Sheet — BJT", tasks: ["Write h-parameter relations for CE","Note gain formulas for all three configurations","Add biasing stability factor formula"] },
]},
{ date: "Jul 17", day: "Thu", subject: "EDC", badge:"APTRANSCO + ESE", sessions: [
{ tag: "edc", title: "FET — JFET and MOSFET", tasks: ["JFET characteristics — pinch-off, IDSS, VP","MOSFET — enhancement and depletion types","FET biasing — self bias, voltage divider","FET small signal model — gm, rd"] },
{ tag: "edc", title: "Feedback Amplifiers + Oscillators", tasks: ["Feedback types and effects on gain/BW/impedance","Barkhausen criterion — oscillation condition","RC oscillators: phase shift, Wien bridge","LC oscillators: Colpitts, Hartley"] },
{ tag: "edc", title: "Lecture Revision — FET + Feedback", tasks: ["Revise FET characteristics from Made Easy notes","Revise feedback amplifier theory — redo examples","Make comparison table: BJT vs FET parameters"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on FET + Feedback + Oscillators","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "edc", title: "Formula Sheet — FET + Feedback", tasks: ["Write JFET drain current equation","Note feedback gain formula — all 4 topologies","Add Barkhausen criterion statement"] },
]},
{ date: "Jul 18", day: "Fri", subject: "EDC", badge:"APTRANSCO + ESE", sessions: [
{ tag: "edc", title: "Power Amplifiers + Op-Amp Basics", tasks: ["Class A, B, AB, C — efficiency comparison","Push-pull amplifier — crossover distortion","Op-Amp — ideal characteristics, CMRR, slew rate","Op-Amp applications: inverting, non-inverting, summing"] },
{ tag: "edc", title: "EDC Problems Sprint", tasks: ["Solve 5 numericals on power amplifier efficiency","Solve 5 Op-Amp circuit problems","Solve 5 mixed EDC numericals from PYQ","Address remaining weak topics"] },
{ tag: "edc", title: "Lecture Revision — Power Amps + Op-Amp", tasks: ["Revise power amplifier classes from Made Easy","Revise Op-Amp basics — redo solved examples","Efficiency comparison table for all classes"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Power Amps + Op-Amp","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "edc", title: "EDC Formula Sheet — Complete", tasks: ["Finalise entire EDC formula sheet","Add efficiency formulas for Class A/B/AB/C","EDC ✅ — Ready for Digital"] },
]},
{ date: "Jul 19", day: "Sat", subject: "Digital", badge:"APTRANSCO + ESE", sessions: [
{ tag: "dig", title: "Number Systems + Boolean + Combinational", tasks: ["Number systems conversions: binary, octal, hex","K-map simplification — 3 and 4 variable","Combinational: MUX, DEMUX, encoder, decoder, adder","Boolean algebra theorems, De Morgan's law"] },
{ tag: "dig", title: "Sequential Circuits", tasks: ["Flip-flops: SR, JK, D, T — truth and excitation tables","Counters: synchronous, asynchronous, mod-N design","Shift registers — SISO, SIPO, PISO, PIPO","Solve 8 sequential circuit problems"] },
{ tag: "dig", title: "Lecture Revision — Combinational + Sequential", tasks: ["Revise Made Easy Digital notes","Revise FF and counter design — redo examples","Make table: FF types, excitation inputs, usage"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Digital circuits","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "dig", title: "Formula Sheet — Digital Day 1", tasks: ["Write K-map grouping rules","Note excitation table for all FF types","Add MUX/DEMUX formula"] },
]},
{ date: "Jul 20", day: "Sun", subject: "Digital — Mock Day", badge:"MOCK", sessions: [
{ tag: "mock", title: "Made Easy Test 7 — Analog & Digital Circuits", tasks: ["Attempt full test — 38 Qs, 45 min, strict timing","No reference material during test","Note raw score"] },
{ tag: "mock", title: "Full Test Analysis", tasks: ["Go through every wrong answer — root cause","Categorise errors: concept / calculation / careless","List top 3 weak topics from EDC + Digital"] },
{ tag: "dig", title: "ADC/DAC + Memory + Wave Shaping", tasks: ["ADC types: flash, successive approximation, dual slope","DAC types: binary weighted, R-2R ladder","Memory: ROM, RAM, EPROM, EEPROM, Flash","Wave shaping: multivibrators, sweep generators"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on ADC/DAC + Memory","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "dig", title: "Digital Formula Sheet — Complete", tasks: ["Finalise Digital formula sheet","Add ADC resolution and DAC output formulas","Digital ✅ — Ready for EMFT"] },
]},
{ date: "Jul 21", day: "Mon", subject: "Digital", badge:"APTRANSCO + ESE", sessions: [
{ tag: "dig", title: "Digital + EDC Full Revision", tasks: ["Rapid revision: number systems → Boolean → K-map → combinational","Rapid revision: sequential → counters → registers","Cross-check all topics with Made Easy checklist"] },
{ tag: "dig", title: "Digital PYQ Sprint", tasks: ["Solve 15 mixed ESE PYQs — all Digital topics","Focus on tricky statement questions","Redo all previously wrong Digital questions"] },
{ tag: "edc", title: "EDC + Digital Weak Area Revision", tasks: ["Revise all weak areas from Test 7 analysis","Redo wrong test questions from scratch","Ensure no pending doubts in EDC or Digital"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — EDC + Digital mixed (ask Claude)","Focus on ESE pattern tricky statements","Note all wrong ones"] },
{ tag: "dig", title: "EDC + Digital Wrap-up", tasks: ["Final read of both formula sheets","EDC ✅ Digital ✅ — Ready for EMFT tomorrow"] },
]},
{ date: "Jul 22", day: "Tue", subject: "EMFT", badge:"APTRANSCO + ESE", sessions: [
{ tag: "emft", title: "Vector Calculus + Electrostatics", tasks: ["Gradient, divergence, curl — physical meaning","Gauss's law, Coulomb's law, Electric potential","Boundary conditions for E field","Solve 5 electrostatics problems"] },
{ tag: "emft", title: "Magnetostatics", tasks: ["Biot-Savart law, Ampere's law","Magnetic flux density B, H — relationship with μ","Boundary conditions for H and B","Solve 5 magnetostatics problems"] },
{ tag: "emft", title: "Lecture Revision — Electrostatics", tasks: ["Revise Made Easy EMFT notes on vector calculus","Redo all electrostatics solved examples","Make table: del operations and their meanings"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Electrostatics + Magnetostatics","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "emft", title: "Formula Sheet — EMFT Day 1", tasks: ["Write Maxwell's 4 equations in differential form","Note boundary conditions for E and H","Add Coulomb's law and Biot-Savart law"] },
]},
{ date: "Jul 23", day: "Wed", subject: "EMFT", badge:"APTRANSCO + ESE", sessions: [
{ tag: "emft", title: "Maxwell's Equations + Plane Waves", tasks: ["Maxwell's equations — integral and differential form","Plane wave propagation in lossless and lossy medium","Intrinsic impedance, phase velocity, skin depth","Poynting theorem — power flow"] },
{ tag: "emft", title: "Transmission Lines", tasks: ["TL equations — voltage and current","Primary parameters: R, L, G, C per unit length","Propagation constant, characteristic impedance Z0","Open and short circuited lines — input impedance"] },
{ tag: "emft", title: "Lecture Revision — Plane Waves + TL", tasks: ["Revise plane wave propagation from Made Easy","Revise transmission line theory — redo examples","Comparison: lossless vs lossy TL"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Plane Waves + TL","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "emft", title: "Formula Sheet — Plane Waves + TL", tasks: ["Write propagation constant γ = α + jβ","Note reflection coefficient and VSWR formulas","Add skin depth formula δ = 1/√(πfμσ)"] },
]},
{ date: "Jul 24", day: "Thu", subject: "EMFT", badge:"APTRANSCO + ESE", sessions: [
{ tag: "emft", title: "Standing Waves + Impedance Matching", tasks: ["VSWR — definition and formula","Reflection coefficient Γ — magnitude and phase","Quarter wave transformer — impedance matching","Single stub matching — concept"] },
{ tag: "emft", title: "Waveguides", tasks: ["Rectangular waveguide — TE and TM modes","Cutoff frequency, guide wavelength, phase velocity","TE10 dominant mode — field expressions","Solve 5 waveguide problems"] },
{ tag: "emft", title: "Lecture Revision — Waveguides", tasks: ["Revise waveguide theory from Made Easy notes","Revise impedance matching — redo examples","Make table: TE vs TM modes comparison"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Waveguides + VSWR","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "emft", title: "Formula Sheet — Waveguides", tasks: ["Write cutoff frequency for rectangular WG","Note TE10 mode — field components present","Add quarter wave transformer formula"] },
]},
{ date: "Jul 25", day: "Fri", subject: "EMFT", badge:"APTRANSCO + ESE", sessions: [
{ tag: "emft", title: "Antennas", tasks: ["Hertz dipole — radiation pattern, directivity","Half wave dipole — input impedance, gain","Antenna parameters: EIRP, beam width, radiation resistance","Antenna arrays — broadside and end-fire"] },
{ tag: "emft", title: "Microwave Components", tasks: ["Reciprocal components: magic tee, directional coupler","Non-reciprocal: isolator, circulator","Microwave sources: klystron, magnetron, Gunn, IMPATT","Solve 5 microwave problems"] },
{ tag: "emft", title: "Lecture Revision — Antennas + Microwave", tasks: ["Revise antenna fundamentals from Made Easy","Revise microwave components — redo examples","Make table: antenna types vs impedance and gain"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Antennas + Microwave","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "emft", title: "Formula Sheet — Antennas", tasks: ["Write half wave dipole Rrad = 73.2Ω","Note directivity formula D = 4π/ΩA","Add effective aperture formula"] },
]},
{ date: "Jul 26", day: "Sat", subject: "EMFT", badge:"APTRANSCO + ESE", sessions: [
{ tag: "emft", title: "EMFT Full Revision — Part 1", tasks: ["Rapid revision: Vector calc → Electrostatics → Magnetostatics → Maxwell","Solve 2 problems from each topic","Mark remaining weak areas"] },
{ tag: "emft", title: "EMFT Full Revision — Part 2", tasks: ["Rapid revision: Plane waves → TL → Waveguides → Antennas","Solve 2 problems from each topic","Cross check with formula sheet"] },
{ tag: "emft", title: "EMFT Lecture Revision — All Topics", tasks: ["Rapid read of all Made Easy EMFT notes","Focus on solved examples","Complete any pending short notes"] },
{ tag: "pyq", title: "PYQ Sprint — EMFT All Topics", tasks: ["Solve 20 mixed ESE PYQs on EMFT","Focus on statement-type questions","Note all wrong answers with reasons"] },
{ tag: "emft", title: "EMFT Formula Sheet — Final", tasks: ["Finalise complete EMFT formula sheet","Read all entries once carefully","EMFT ✅ — Mock test tomorrow"] },
]},
{ date: "Jul 27", day: "Sun", subject: "EMFT — Mock Day", badge:"MOCK", sessions: [
{ tag: "mock", title: "Made Easy Test 9 — Electro Magnetics", tasks: ["Attempt full test — 38 Qs, 45 min, strict timing","No reference material during test","Note raw score"] },
{ tag: "mock", title: "Full Test Analysis", tasks: ["Go through every wrong answer — root cause","Categorise errors: concept / calculation / careless","List top 3 weak EMFT topics"] },
{ tag: "emft", title: "Weak Topic Revision", tasks: ["Revise top 3 weak topics from mock","Redo all wrong test questions from scratch","Make additional notes on weak areas"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — EMFT (ask Claude)","Focus on waveguide and antenna statements","Note all wrong ones"] },
{ tag: "emft", title: "EMFT Wrap-up", tasks: ["Final read of EMFT formula sheet","EMFT ✅ — Ready for Material Science"] },
]},
{ date: "Jul 28", day: "Mon", subject: "EMFT", badge:"APTRANSCO + ESE", sessions: [
{ tag: "emft", title: "EMFT Buffer — Remaining Weak Areas", tasks: ["Address any remaining EMFT doubts","Solve 5 problems on weakest topic","Cross-verify formula sheet with notes"] },
{ tag: "emft", title: "EMFT Extra PYQ Practice", tasks: ["Solve 15 more mixed EMFT PYQs","Time yourself — 1 Q per 2 min","Note patterns in question types"] },
{ tag: "emft", title: "Lecture Re-revision — Weakest Topic", tasks: ["Pick weakest EMFT topic and revise lecture","Redo all examples for that topic","Make clean notes for that topic only"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — EMFT weak topics (ask Claude)","Target your specific weak areas","Note all wrong ones"] },
{ tag: "emft", title: "EMFT Complete", tasks: ["EMFT ✅ confirmed","Ready for Material Science tomorrow"] },
]},
{ date: "Jul 29", day: "Tue", subject: "Material Science", badge:"ESE", sessions: [
{ tag: "mat", title: "Crystal Structure + Band Theory", tasks: ["Crystal structure — unit cell, Miller indices","Band theory — conductor, semiconductor, insulator","Effective mass concept","Solve 5 crystal structure problems"] },
{ tag: "mat", title: "Dielectric + Magnetic Materials", tasks: ["Dielectric polarization types, permittivity, dielectric loss","Magnetic materials — diamagnetic, paramagnetic, ferromagnetic","Hysteresis loop — coercivity, retentivity, saturation","Applications of magnetic materials"] },
{ tag: "mat", title: "Lecture Revision — Crystal + Dielectric + Magnetic", tasks: ["Revise Made Easy Material Science notes","Redo solved examples on crystal structure","Make table: magnetic material types and properties"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Crystal + Dielectric + Magnetic","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "mat", title: "Formula Sheet — Material Science Day 1", tasks: ["Write Bragg's law: nλ = 2d sinθ","Note hysteresis loss formula","Add dielectric loss tangent definition"] },
]},
{ date: "Jul 30", day: "Wed", subject: "Material Science", badge:"ESE", sessions: [
{ tag: "mat", title: "Semiconductor Materials + Superconductivity", tasks: ["Intrinsic vs extrinsic — carrier concentration","Compound semiconductors: GaAs, InP properties","Superconductivity — Meissner effect, critical temperature","Type I and Type II superconductors"] },
{ tag: "mat", title: "Nano Materials + Modern Materials", tasks: ["Quantum dots — quantum confinement effect","Carbon nanotubes — properties and applications","Graphene — structure and properties","MEMS and NEMS — basic concepts"] },
{ tag: "mat", title: "Lecture Revision — Semiconductors + Nano", tasks: ["Revise semiconductor materials from Made Easy","Revise nano materials — redo examples","Make table: GaAs vs Si key property differences"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Semiconductors + Superconductivity","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "mat", title: "Formula Sheet — Material Science Day 2", tasks: ["Write intrinsic carrier concentration formula","Note superconductivity critical field formula","Add quantum confinement energy formula"] },
]},
{ date: "Jul 31", day: "Thu", subject: "Material Science", badge:"ESE", sessions: [
{ tag: "mat", title: "Material Science Full Revision", tasks: ["Rapid revision: Crystal → Band theory → Dielectric → Magnetic","Rapid revision: Semiconductors → Superconductivity → Nano","Solve 5 mixed problems"] },
{ tag: "mat", title: "Material Science PYQ Sprint", tasks: ["Solve 20 mixed ESE PYQs — all Material Science topics","Focus on statement-type questions","Note all wrong answers"] },
{ tag: "mat", title: "Lecture Revision — Weak Areas", tasks: ["Revise weakest 2 topics from PYQ sprint","Redo examples for weak topics","Complete short notes"] },
{ tag: "mock", title: "Made Easy Test 11 — Material Science", tasks: ["Attempt full test — 38 Qs, 45 min, strict timing","No reference material during test","Note raw score + analyse immediately"] },
{ tag: "mat", title: "Material Science Formula Sheet — Final", tasks: ["Finalise complete Material Science formula sheet","Material Science ✅ — Ready for MPMC August 1"] },
]},
{ date: "Aug 1", day: "Sat", subject: "MPMC", badge:"APTRANSCO + ESE", sessions: [
{ tag: "mpmc", title: "8085 Architecture + Instruction Set", tasks: ["8085 internal architecture — registers, ALU, buses","Instruction set: data transfer, arithmetic, logical, branch","Addressing modes in 8085","Write and trace 5 assembly programs"] },
{ tag: "mpmc", title: "8085 Interrupts + 8086 Architecture", tasks: ["8085 interrupts — TRAP, RST, INTR — priority and masking","8086 architecture — segment registers, BIU, EU","8086 memory segmentation and addressing","Compare 8085 vs 8086 key differences"] },
{ tag: "mpmc", title: "Lecture Revision — 8085 + 8086", tasks: ["Revise Made Easy MPMC notes on 8085","Revise 8086 architecture — redo examples","Make comparison table: 8085 vs 8086"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on 8085 + 8086","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "mpmc", title: "Formula Sheet — MPMC Day 1", tasks: ["Write 8085 register names and sizes","Note interrupt priority order for 8085","Add 8086 segment registers: CS, DS, SS, ES"] },
]},
{ date: "Aug 2", day: "Sun", subject: "MPMC — Mock Day", badge:"MOCK", sessions: [
{ tag: "mock", title: "Made Easy Test 14 — Info & Comm Technologies", tasks: ["Attempt full test — 25 Qs, 30 min, strict timing","No reference material during test","Note raw score"] },
{ tag: "mock", title: "Full Test Analysis", tasks: ["Go through every wrong answer","Categorise errors: concept / calculation / careless","List weak areas"] },
{ tag: "mpmc", title: "Interfacing — 8255, 8253, 8251", tasks: ["8255 PPI — modes 0, 1, 2 and control word format","8253 timer — operating modes, control word","8251 USART — serial communication basics","Solve 4 interfacing problems"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Interfacing ICs","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "mpmc", title: "MPMC Formula Sheet + Wrap-up", tasks: ["Write 8255 control word format","Note 8253 mode definitions (0-5)","MPMC ✅ — 3-day sprint done"] },
]},
{ date: "Aug 3", day: "Mon", subject: "MPMC", badge:"APTRANSCO + ESE", sessions: [
{ tag: "mpmc", title: "Memory Interfacing + Microcontrollers", tasks: ["Memory interfacing — address decoding, chip select logic","Memory map design for 8085/8086","Microcontroller basics — 8051 architecture overview","Compare microprocessor vs microcontroller"] },
{ tag: "mpmc", title: "MPMC PYQ Sprint", tasks: ["Solve 15 mixed ESE PYQs — all MPMC topics","Focus on statement-type questions","Note all wrong answers with reasons"] },
{ tag: "mpmc", title: "MPMC Full Revision", tasks: ["Rapid revision: 8085 → 8086 → Interrupts → Interfacing → Memory","Cross check with formula sheet","Address remaining weak areas"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — MPMC (ask Claude)","Target weak areas from this week","Note all wrong ones"] },
{ tag: "mpmc", title: "MPMC Final Formula Sheet", tasks: ["Finalise MPMC formula sheet","MPMC ✅ — Ready for Communication"] },
]},
{ date: "Aug 4", day: "Tue", subject: "Communication", badge:"APTRANSCO + ESE", sessions: [
{ tag: "comm", title: "AM Modulation — DSB, SSB, VSB", tasks: ["AM — modulation index, power, bandwidth","DSB-SC generation using balanced modulator","SSB — filter and phase shift method","VSB — characteristics and usage in TV"] },
{ tag: "comm", title: "FM and PM Modulation", tasks: ["FM — modulation index, Carson's rule, BW","Narrowband vs wideband FM","FM generation: direct (VCO) and indirect methods","FM detection: limiter-discriminator, PLL, ratio detector"] },
{ tag: "comm", title: "Lecture Revision — AM + FM", tasks: ["Revise Made Easy Communication notes on AM/FM","Redo solved examples on AM power and FM BW","Comparison table: AM vs FM noise performance"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on AM + FM + PM","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "comm", title: "Formula Sheet — Communication Day 1", tasks: ["Write AM modulation index and power formulas","Note Carson's rule: BW = 2(Δf + fm)","Add FM modulation index β = Δf/fm"] },
]},
{ date: "Aug 5", day: "Wed", subject: "Communication", badge:"APTRANSCO + ESE", sessions: [
{ tag: "comm", title: "Noise in Communication Systems", tasks: ["Thermal noise, shot noise, flicker noise","Noise figure, noise temperature, Friis formula","SNR for AM, DSB-SC, SSB receivers","FM vs AM noise performance comparison"] },
{ tag: "comm", title: "Superheterodyne Receiver", tasks: ["Superheterodyne receiver — block diagram and operation","Image frequency and image rejection ratio","Selectivity, sensitivity, fidelity","Solve 5 receiver problems"] },
{ tag: "comm", title: "Lecture Revision — Noise + Receivers", tasks: ["Revise noise analysis from Made Easy notes","Revise superheterodyne receiver — redo examples","Make table: SNR formulas for different modulation types"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Noise + Receivers","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "comm", title: "Formula Sheet — Noise", tasks: ["Write Friis noise figure formula","Note SNR formulas for AM, FM, SSB","Add image rejection ratio formula"] },
]},
{ date: "Aug 6", day: "Thu", subject: "Communication", badge:"APTRANSCO + ESE", sessions: [
{ tag: "comm", title: "Sampling + Pulse Modulation + PCM", tasks: ["Sampling theorem, Nyquist rate, aliasing","PAM, PWM, PPM — generation and comparison","PCM — quantization, quantization noise, SQNR","Bit rate and bandwidth calculations for PCM"] },
{ tag: "comm", title: "Digital Modulation — ASK, FSK, PSK, QAM", tasks: ["ASK, FSK, BPSK, QPSK — constellation diagrams","Bandwidth efficiency comparison","BER formulas for each modulation scheme","Solve 8 digital modulation problems"] },
{ tag: "comm", title: "Lecture Revision — Sampling + Digital Modulation", tasks: ["Revise PCM and quantization from Made Easy","Revise digital modulation — redo constellation problems","Table: modulation type vs BER vs BW efficiency"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on PCM + Digital Modulation","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "comm", title: "Formula Sheet — Digital Comm", tasks: ["Write SQNR formula: 6.02n + 1.76 dB","Note BER formulas for BPSK, QPSK, FSK","Add Nyquist bandwidth formula"] },
]},
{ date: "Aug 7", day: "Fri", subject: "Communication", badge:"APTRANSCO + ESE", sessions: [
{ tag: "comm", title: "Information Theory", tasks: ["Entropy — definition, properties, joint and conditional","Mutual information, channel capacity","Shannon-Hartley theorem: C = B log2(1 + S/N)","Source coding theorem, Huffman coding"] },
{ tag: "comm", title: "Multiplexing + Line Coding", tasks: ["FDM and TDM — frame structure, efficiency","Line coding: NRZ, RZ, Manchester, AMI, HDB3","Spread spectrum: DSSS, FHSS concepts","Solve 8 information theory problems"] },
{ tag: "comm", title: "Lecture Revision — Info Theory + Multiplexing", tasks: ["Revise information theory from Made Easy notes","Revise line coding — redo waveform sketching","Table: line code types and their properties"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Info Theory + Multiplexing","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "comm", title: "Formula Sheet — Info Theory", tasks: ["Write Shannon-Hartley theorem","Note entropy formula H = -Σ p log2(p)","Add TDM frame efficiency formula"] },
]},
{ date: "Aug 8", day: "Sat", subject: "Communication", badge:"APTRANSCO + ESE", sessions: [
{ tag: "comm", title: "Fiber Optics + Satellite Communication", tasks: ["Fiber types: single mode, multimode — attenuation, dispersion","Numerical aperture, acceptance angle","Satellite communication — link budget basics, transponder","VSAT, GPS basic concepts"] },
{ tag: "comm", title: "Communication Full Revision", tasks: ["Rapid revision: AM → FM → Noise → Receivers → PCM","Rapid revision: Digital modulation → Info theory → Multiplexing → Fiber","Solve 5 mixed problems across all topics"] },
{ tag: "comm", title: "Lecture Revision — Fiber + Satellite", tasks: ["Revise fiber optics from Made Easy notes","Revise satellite communication — redo link budget","Summary: fiber types and use cases"] },
{ tag: "pyq", title: "PYQ Sprint — All Communication", tasks: ["Solve 15 mixed ESE PYQs — all Communication topics","Focus on statement-type questions","Note all wrong answers"] },
{ tag: "comm", title: "Formula Sheet — Fiber Optics", tasks: ["Write NA formula: NA = √(n1² - n2²)","Note fiber attenuation unit: dB/km","Finalise Communication formula sheet"] },
]},
{ date: "Aug 9", day: "Sun", subject: "Communication — Mock Day", badge:"MOCK", sessions: [
{ tag: "mock", title: "Made Easy Test 15 — Analog & Digital Comm", tasks: ["Attempt full test — 38 Qs, 45 min, strict timing","No reference material during test","Note raw score"] },
{ tag: "mock", title: "Full Test Analysis", tasks: ["Go through every wrong answer — root cause","Categorise errors: concept / calculation / careless","List top 3 weak Communication topics"] },
{ tag: "comm", title: "Weak Topic Revision", tasks: ["Revise top 3 weak topics from mock","Redo all wrong questions from scratch","Make additional short notes on weak areas"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — Communication (ask Claude)","Target weak areas from test","Note all wrong ones"] },
{ tag: "comm", title: "Communication Wrap-up", tasks: ["Final read of Communication formula sheet","Communication ✅ — Ready for Signals tomorrow"] },
]},
{ date: "Aug 10", day: "Mon", subject: "Communication", badge:"APTRANSCO + ESE", sessions: [
{ tag: "comm", title: "Communication Buffer — Weak Areas", tasks: ["Address any remaining Communication doubts","Solve 5 problems on weakest topic","Cross-verify formula sheet entries"] },
{ tag: "comm", title: "Communication Extra PYQ", tasks: ["Solve 15 more mixed Communication PYQs","Time yourself — 1 Q per 2 min","Note recurring ESE question patterns"] },
{ tag: "comm", title: "Lecture Re-revision — Weakest Topic", tasks: ["Pick weakest topic and revise fully","Redo all examples for that topic","Make clean short notes"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — Comm weak topics (ask Claude)","Target your specific weak areas","Note all wrong ones"] },
{ tag: "comm", title: "Communication Complete", tasks: ["Communication ✅ confirmed","Ready for Signals tomorrow Aug 11"] },
]},
{ date: "Aug 11", day: "Tue", subject: "Signals", badge:"APTRANSCO + ESE", sessions: [
{ tag: "sig", title: "LTI Systems + Convolution", tasks: ["Signal classification: continuous, discrete, energy, power","LTI system properties: linearity, causality, stability","Convolution integral and sum — solve 6 problems","Impulse response and system characterization"] },
{ tag: "sig", title: "Fourier Series", tasks: ["Fourier series coefficients — trigonometric and exponential","Dirichlet conditions, convergence","Symmetry properties: even/odd/half-wave","Parseval's theorem — solve 4 problems"] },
{ tag: "sig", title: "Lecture Revision — LTI + Fourier Series", tasks: ["Revise Made Easy Signals notes on LTI","Redo all convolution examples","Table: signal symmetry → which coefficients are zero"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on LTI + Fourier Series","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "sig", title: "Formula Sheet — Signals Day 1", tasks: ["Write convolution formula for CT and DT","Note Fourier series coefficient formulas","Add Parseval's theorem for periodic signals"] },
]},
{ date: "Aug 12", day: "Wed", subject: "Signals", badge:"APTRANSCO + ESE", sessions: [
{ tag: "sig", title: "Fourier Transform", tasks: ["FT definition, inverse transform","FT properties: linearity, time shift, frequency shift, scaling, duality","Standard FT pairs — rect, sinc, impulse, exponential","Solve 8 Fourier transform problems"] },
{ tag: "sig", title: "Laplace Transform", tasks: ["Laplace transform — definition, ROC for different signals","Laplace properties: time shifting, differentiation, convolution","Inverse Laplace — partial fraction method","Circuit analysis using Laplace — solve 5 problems"] },
{ tag: "sig", title: "Lecture Revision — FT + Laplace", tasks: ["Revise FT properties from Made Easy notes","Revise Laplace ROC rules — redo examples","Make standard FT pairs table for quick reference"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on FT + Laplace","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "sig", title: "Formula Sheet — Transforms", tasks: ["Write key FT property formulas","Note ROC rules for Laplace","Add initial and final value theorems"] },
]},
{ date: "Aug 13", day: "Thu", subject: "Signals", badge:"APTRANSCO + ESE", sessions: [
{ tag: "sig", title: "Z-Transform", tasks: ["Z-transform — definition, ROC for sequences","Z-transform properties: linearity, time shifting, convolution","Standard Z-transform pairs","Inverse Z-transform — partial fraction and power series"] },
{ tag: "sig", title: "Sampling Theorem + Discrete Systems", tasks: ["Sampling theorem — Nyquist rate, aliasing, reconstruction","DTFT — definition and properties","DFT — definition, circular convolution","Difference equations — solve 5 problems"] },
{ tag: "sig", title: "Lecture Revision — Z-Transform + Discrete", tasks: ["Revise Z-transform from Made Easy notes","Revise DFT properties — redo circular convolution examples","Table: Z-transform ROC types and signal types"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 10 ESE PYQs on Z-Transform + DFT","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "sig", title: "Formula Sheet — Z-Transform", tasks: ["Write Z-transform definition and ROC rules","Note standard Z-transform pairs table","Add DFT definition: X[k] = Σ x[n] e^(-j2πkn/N)"] },
]},
{ date: "Aug 14", day: "Fri", subject: "Signals", badge:"APTRANSCO + ESE", sessions: [
{ tag: "sig", title: "Signals Full Revision — All Topics", tasks: ["Rapid revision: LTI → Fourier Series → FT → Laplace → Z → DFT","Solve 2 problems from each topic","Mark remaining weak areas"] },
{ tag: "sig", title: "Signals PYQ Sprint", tasks: ["Solve 20 mixed ESE PYQs — all Signals topics","Time yourself — 1 Q per 2 min","Note all wrong answers with reasons"] },
{ tag: "sig", title: "Signals Weak Area Revision", tasks: ["Identify and revise weakest 2 Signals topics","Redo examples for weak topics from Made Easy","Complete any remaining short notes"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["10 assert-reason Qs — Signals (ask Claude)","Focus on transform property statements","Note all wrong ones"] },
{ tag: "sig", title: "Signals Formula Sheet — Final", tasks: ["Finalise complete Signals formula sheet","Read all transform pairs and properties once","Signals ✅ — Almost there!"] },
]},
{ date: "Aug 15", day: "Sat", subject: "Signals", badge:"APTRANSCO + ESE", sessions: [
{ tag: "sig", title: "Signals Buffer + Extra Practice", tasks: ["Address any remaining Signals doubts","Solve 5 problems on weakest topic","Verify all formula sheet entries"] },
{ tag: "sig", title: "Signals Extra PYQ Practice", tasks: ["Solve 15 more mixed Signals PYQs","Focus on tricky statement-type questions","Note recurring patterns in ESE questions"] },
{ tag: "rev", title: "APTRANSCO Quick Revision — Networks + Controls", tasks: ["Networks: 10 PYQs — theorems, two port, graph theory","Controls: 10 PYQs — stability, Bode, Nyquist","Formula sheet quick read for both"] },
{ tag: "pyq", title: "APTRANSCO Statement Questions", tasks: ["10 mixed statement Qs — Networks + Controls (ask Claude)","Focus on APTRANSCO style questions","Note all wrong ones"] },
{ tag: "sig", title: "Signals Complete", tasks: ["Signals ✅ confirmed","3 days to APTRANSCO sprint begins"] },
]},
{ date: "Aug 16", day: "Sun", subject: "Signals — Full Mock", badge:"MOCK", sessions: [
{ tag: "mock", title: "Full APTRANSCO Pattern Mock — 100 Qs", tasks: ["Attempt full mock: 100 Qs, 3 hours, strict conditions","All APTRANSCO subjects covered","No reference material, no breaks during test"] },
{ tag: "mock", title: "Full Mock Analysis", tasks: ["Go through every wrong answer carefully","Identify top 5 weak areas across all subjects","Note score — target minimum 60/100"] },
{ tag: "rev", title: "APTRANSCO Quick Revision — EDC + Digital", tasks: ["EDC: 10 PYQs — BJT, FET, feedback, oscillators","Digital: 10 PYQs — combinational, sequential, ADC/DAC","Formula sheet quick read for both"] },
{ tag: "pyq", title: "Statement Questions — EDC + Digital", tasks: ["10 mixed statement Qs — EDC + Digital (ask Claude)","Focus on APTRANSCO style tricky statements","Note all wrong ones"] },
{ tag: "rev", title: "Mock Analysis Revision", tasks: ["Revise top 3 weak areas from today's mock","Redo wrong questions from scratch","Make final revision notes for weak areas"] },
]},
{ date: "Aug 17", day: "Mon", subject: "Signals", badge:"APTRANSCO SPRINT", sessions: [
{ tag: "sig", title: "Signals Final Revision", tasks: ["Final rapid revision of all Signals topics","Solve 5 tricky PYQs on transforms","Verify formula sheet — no gaps"] },
{ tag: "rev", title: "APTRANSCO Sprint — EMFT + MPMC", tasks: ["EMFT: 10 PYQs — TL, waveguides, antennas","MPMC: 10 PYQs — 8085, 8086, interfacing","Formula sheet quick read for both"] },
{ tag: "rev", title: "APTRANSCO Sprint — Communication + Signals", tasks: ["Communication: 10 PYQs — AM, FM, digital modulation","Signals: 10 PYQs — transforms, sampling, LTI","Formula sheet rapid read — all subjects"] },
{ tag: "pyq", title: "APTRANSCO Statement Questions", tasks: ["15 mixed statement Qs across all APTRANSCO subjects (ask Claude)","Focus on tricky assertions","Note all wrong ones"] },
{ tag: "rev", title: "All Formula Sheets Final Read", tasks: ["Read all subject formula sheets once","Highlight 3 most important formulas per subject","Sleep early — COA tomorrow then final sprint"] },
]},
{ date: "Aug 18", day: "Tue", subject: "COA", badge:"APTRANSCO SPRINT", sessions: [
{ tag: "coa", title: "COA — Architecture + Pipelining", tasks: ["Number representation: fixed point, floating point IEEE 754","ALU design — carry lookahead adder, booth multiplier","CPU organization — hardwired vs microprogrammed control","Pipelining — stages, hazards, forwarding"] },
{ tag: "coa", title: "COA — Memory + I/O", tasks: ["Memory hierarchy: registers → cache → RAM → secondary","Cache mapping: direct, associative, set-associative","Virtual memory — page table, TLB, page faults","I/O organization: DMA, interrupts, memory-mapped I/O"] },
{ tag: "coa", title: "Lecture Revision — COA", tasks: ["Revise Made Easy COA notes completely","Redo pipelining and cache examples","Table: cache mapping types comparison"] },
{ tag: "pyq", title: "PYQ + Statement Questions", tasks: ["Solve 15 ESE PYQs on COA — all topics","Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer"] },
{ tag: "coa", title: "COA Formula Sheet", tasks: ["Write IEEE 754 single precision format","Note pipeline speedup formula","COA ✅ — APTRANSCO Final Sprint tomorrow"] },
]},
{ date: "Aug 19", day: "Wed", subject: "APTRANSCO Sprint", badge:"APTRANSCO SPRINT", sessions: [
{ tag: "rev", title: "Sprint — Networks + Controls + EDC", tasks: ["Networks: 10 PYQs — theorems, two port, transients","Controls: 10 PYQs — Bode, Nyquist, Routh, root locus","EDC: 10 PYQs — BJT, FET, feedback, oscillators"] },
{ tag: "rev", title: "Sprint — Digital + EMFT + MPMC", tasks: ["Digital: 10 PYQs — combinational, sequential, ADC/DAC","EMFT: 10 PYQs — TL, waveguides, antennas, Maxwell","MPMC: 10 PYQs — 8085, 8086, interfacing"] },
{ tag: "rev", title: "Sprint — Communication + Signals + COA", tasks: ["Communication: 10 PYQs — AM, FM, digital modulation","Signals: 10 PYQs — FT, Laplace, Z-transform","COA: 5 PYQs — pipelining, cache, memory"] },
{ tag: "rev", title: "General Ability Quick Revision", tasks: ["Solve 20 Reasoning + Aptitude questions","Solve 10 General Awareness questions","Solve 10 English comprehension questions"] },
{ tag: "rev", title: "Night Before Exam", tasks: ["Light read of all formula sheets — 15 min max","Pack hall ticket, Aadhaar card, pen, stationery","Sleep by 10:30 PM — no studying after this"] },
]},
{ date: "Aug 20", day: "Thu", subject: "APTRANSCO Final Mock", badge:"EXAM PREP", sessions: [
{ tag: "mock", title: "APTRANSCO Final Mock — 100 Qs, 3 hrs", tasks: ["Simulate exact APTRANSCO exam conditions","70 technical + 30 general ability questions","No breaks, no reference material"] },
{ tag: "mock", title: "Mock Analysis", tasks: ["Go through every wrong answer immediately","Calculate projected score — aim 65+/100","Note top 5 areas to review today"] },
{ tag: "rev", title: "Final Weak Area Revision", tasks: ["Revise top 3 weak areas from today's mock","Solve 5 targeted questions per weak area","No new topics — only revision"] },
{ tag: "rev", title: "General Ability Final Practice", tasks: ["20 mixed general ability questions","Focus on reasoning and English comprehension","Light revision only"] },
{ tag: "rev", title: "Night Before APTRANSCO Exam", tasks: ["Arrange hall ticket, ID proof, stationery","Light formula sheet read — 10 min max","Sleep by 10 PM — exam starts tomorrow Aug 22"] },
]},
{ date: "Aug 21", day: "Fri", subject: "Exam Prep Day", badge:"EXAM PREP", sessions: [
{ tag: "rev", title: "Morning Light Revision Only", tasks: ["Read formula sheets lightly — 30 min max","No solving problems — only reading","Eat a good protein breakfast"] },
{ tag: "rev", title: "Key Formulas Quick Glance", tasks: ["Networks: Z, Y, h, ABCD — quick glance","Controls: Bode, Nyquist, Routh — quick glance","Signals: FT pairs, Z-transform — quick glance"] },
{ tag: "rev", title: "Mental Preparation", tasks: ["No heavy studying after 12 PM","Rest, relax, light walk","Trust the preparation — you have covered everything"] },
{ tag: "rev", title: "Exam Logistics Check", tasks: ["Hall ticket printed ✓","Aadhaar card + ID ready ✓","Reach exam center 1 hour before reporting time ✓"] },
{ tag: "mock", title: "🎯 APTRANSCO AEE/Telecom EXAM — Aug 22–29", tasks: ["Stay calm, read each question carefully","No negative marking — attempt ALL 100 questions","Trust 45 days of focused preparation"] },
]},
];
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function pad2(n){ return String(n).padStart(2,"0"); }
function dLabel(dt){ return MON[dt.getMonth()] + " " + dt.getDate(); }
function eachDay(startISO,endISO,cb){ let d=new Date(startISO+"T00:00:00"); const end=new Date(endISO+"T00:00:00"); while(d<=end){ cb(new Date(d)); d.setDate(d.getDate()+1);} }
function studyDay(dt,subject,tag,plan,badge){ return { date:dLabel(dt), day:WD[dt.getDay()], subject, badge, sessions:[
{ tag, title:plan.title, tasks:plan.pts },
{ tag, title:"Problem Solving — "+plan.title, tasks:["Solve 8 problems / numericals on "+plan.title,"Redo 3 solved examples from Made Easy","Attempt tricky variations and edge cases"] },
{ tag, title:"Lecture Revision — "+plan.title, tasks:["Revise Made Easy notes on "+plan.title,"Redo all solved examples for the topic","Make one-page short notes"] },
{ tag:"pyq", title:"PYQ + Statement Questions", tasks:["Solve 10 ESE PYQs on "+plan.title,"Attempt 5 assert-reason Qs (ask Claude)","Note every wrong answer with reason"] },
{ tag, title:"Formula Sheet — "+subject, tasks:["Add key formulas for "+plan.title,"Note important results and definitions","Read the full "+subject+" formula sheet once"] },
]};}
function mockDay(dt,subject,tag,testName,badge){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:subject+" — Mock Day", badge:badge||"MOCK", sessions:[
{ tag:"mock", title:testName, tasks:["Attempt full test under strict timing","No reference material during test","Note raw score honestly"] },
{ tag:"mock", title:"Full Test Analysis", tasks:["Go through every wrong answer — root cause","Categorise: concept / calculation / careless","List top 3 weak topics from this test"] },
{ tag, title:"Weak Topic Revision", tasks:["Revise top 3 weak topics from the mock","Redo all wrong questions from scratch","Make notes on weak areas"] },
{ tag:"pyq", title:"PYQ + Statement Questions", tasks:["Solve 10 mixed "+subject+" PYQs","Attempt 5 assert-reason Qs (ask Claude)","Note all wrong ones"] },
{ tag, title:subject+" Formula Sheet", tasks:["Update and finalise "+subject+" formula sheet","Read all entries once","Keep the momentum going"] },
]};}
function examDay(dt,n){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:"APTRANSCO Exam Window — Day "+n, badge:"APTRANSCO EXAM", sessions:[
{ tag:"rev", title:"Pre-Paper Warm-up", tasks:["Light formula sheet glance — 20 min max","No new problems, stay calm","Reach centre 1 hour early with hall ticket + ID"] },
{ tag:"mock", title:"🎯 Attempt the Paper", tasks:["Read every question carefully","No negative marking — attempt all questions","Manage time: flag and move on when stuck"] },
{ tag:"rev", title:"Post-Paper Recovery", tasks:["No post-mortem of the paper","Eat well, hydrate, rest fully","Sleep 8 hrs — reset for the next slot"] },
]};}
function restDay(dt,label,note){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:label, badge:"RECOVERY", sessions:[
{ tag:"rev", title:"Full Rest", tasks:[note||"Complete rest — no heavy studying","Sleep 8 hrs, eat well, light walk","Reset mentally for the next phase"] },
{ tag:"rev", title:"Light Housekeeping", tasks:["Tidy notes and formula sheets","Plan the upcoming week","Optional: 20 min light reading only"] },
]};}
function revDay(dt,pair,badge){ const a=pair[0], b=pair[1]; return { date:dLabel(dt), day:WD[dt.getDay()], subject:"Revision — "+a+" + "+b, badge, sessions:[
{ tag:"rev", title:a+" — Rapid Revision", tasks:["Short notes read for all "+a+" topics","Solve 10 PYQs — "+a,"Redo previously wrong questions"] },
{ tag:"rev", title:b+" — Rapid Revision", tasks:["Short notes read for all "+b+" topics","Solve 10 PYQs — "+b,"Redo previously wrong questions"] },
{ tag:"rev", title:"Formula Sheet Cross-check", tasks:["Read "+a+" + "+b+" formula sheets","Fix any gaps found while solving","Highlight 3 key formulas per subject"] },
{ tag:"pyq", title:"PYQ + Statement Questions", tasks:["10 mixed statement Qs — "+a+" + "+b+" (ask Claude)","Focus on tricky assertions","Note all wrong ones"] },
{ tag:"rev", title:"Weak Area Notes", tasks:["Log today's weak spots in one place","Plan tomorrow's targeted fixes","Quick self-rating per topic"] },
]};}

function grandTestDay(dt,name,badge){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:"Grand Test — Mixed", badge:badge||"GRAND TEST", sessions:[
{ tag:"mock", title:name, tasks:["Attempt mixed grand test under strict timing","Full exam simulation — no breaks","Note raw score and track vs last week"] },
{ tag:"mock", title:"Test Analysis", tasks:["Go through every wrong answer","Identify top 5 weak areas across subjects","Categorise: concept / calculation / careless"] },
{ tag:"rev", title:"Weak Subject Revision", tasks:["Revise top 3 weak subjects from the test","Redo all wrong questions from scratch","Make targeted notes"] },
{ tag:"pyq", title:"PYQ + Statement Questions", tasks:["15 mixed statement Qs on weak areas (ask Claude)","Focus on repeat ESE patterns","Note all wrong ones"] },
{ tag:"rev", title:"Formula Sheet Read", tasks:["Read weak-subject formula sheets","Highlight repeatedly-missed formulas","Plan next week's focus"] },
]};}
function subjectMockMarathonDay(dt,subj){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:subj+" — Mock Marathon", badge:"MOCK MARATHON", sessions:[
{ tag:"mock", title:subj+" Subject Mock — 30 Qs Timed", tasks:["Attempt full subject mock — strict timing","No reference material","Note raw score"] },
{ tag:"mock", title:"Same-Day Analysis", tasks:["Analyse every wrong answer immediately","Compare score vs first attempt on "+subj,"List remaining weak topics"] },
{ tag:"rev", title:subj+" Weak Topic Fix", tasks:["Revise weak topics from the mock","Redo wrong questions from scratch","Update short notes"] },
{ tag:"pyq", title:"PYQ Booster", tasks:["Solve 10 more "+subj+" PYQs","Focus on statement-type questions","Note all wrong ones"] },
{ tag:"rev", title:"Formula Sheet Touch-up", tasks:["Read "+subj+" formula sheet","Fix any gaps found today",subj+" ✅ for this pass"] },
]};}
function pyqSprintDay(dt,subj){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:"Final Sprint — "+subj, badge:"PYQ SPRINT", sessions:[
{ tag:"rev", title:"Morning Formula Read", tasks:["Read "+subj+" formula sheet first thing","Highlight the 5 most important formulas","No new content"] },
{ tag:"pyq", title:subj+" — 40 PYQs", tasks:["Solve 40 previous-year questions on "+subj,"Identify repeat patterns","Time yourself — 1 Q per 1.5 min"] },
{ tag:"rev", title:"Wrong-Answer Rework", tasks:["Redo every wrong PYQ from scratch","Understand why the right option is right","Log recurring traps"] },
{ tag:"pyq", title:"Statement Question Set", tasks:["10 assert-reason Qs — "+subj+" (ask Claude)","Focus on ESE-style tricky statements","Note all wrong ones"] },
{ tag:"rev", title:"Evening Consolidation", tasks:["Quick short-notes read for "+subj,"Self-rate confidence on each topic","Plan tomorrow's subject"] },
]};}
function taperDay(dt,subj){ return { date:dLabel(dt), day:WD[dt.getDay()], subject:"Last 10 Days — "+subj, badge:"TAPER", sessions:[
{ tag:"rev", title:"Light Revision — "+subj, tasks:["Read short notes for "+subj+" only","No heavy problem solving","Glance at formula sheet"] },
{ tag:"rev", title:"Key Formulas Glance", tasks:["Revise the most important "+subj+" formulas","Read, don't solve","Keep it calm and light"] },
{ tag:"rev", title:"Wellbeing", tasks:["Sleep 8 hrs, eat well","Light walk, no screens late","Full confidence mode — trust the prep"] },
]};}
const ANALOGS=[{title:"Op-Amp Fundamentals",pts:["Ideal vs non-ideal op-amp characteristics","CMRR, slew rate, offset voltage, bias current","Open loop vs closed loop gain","Gain-bandwidth product and frequency response"]},{title:"Linear Applications I",pts:["Inverting and non-inverting amplifier","Voltage follower and summing amplifier","Difference and instrumentation amplifier","Solve gain and impedance problems"]},{title:"Linear Applications II",pts:["Integrator and differentiator circuits","Log and antilog amplifiers","V-to-I and I-to-V converters","Frequency response of integrator/differentiator"]},{title:"Non-Linear Applications",pts:["Comparator and zero crossing detector","Schmitt trigger — hysteresis and thresholds","Precision rectifier — half and full wave","Peak detector and clamper circuits"]},{title:"Active Filters",pts:["Butterworth filter design basics","Low pass, high pass, band pass active filters","First and second order filter response","Filter Q factor and cutoff frequency"]},{title:"Waveform Generators",pts:["Triangle and square wave generators","Wien bridge sine oscillator","Astable and monostable using op-amp","Frequency and duty cycle calculations"]},{title:"555 Timer",pts:["555 internal architecture","Astable mode — frequency and duty cycle","Monostable mode — pulse width","Applications of the 555 timer"]},{title:"Voltage Regulators",pts:["Series and shunt regulators","IC regulators — 78xx, 79xx, 723","Line and load regulation","Switching regulator basics"]},{title:"Sample & Hold + Converters",pts:["Sample and hold circuit operation","DAC — weighted resistor and R-2R ladder","ADC — flash, SAR, dual slope","Resolution and conversion time"]},{title:"Analogs Full Revision",pts:["Rapid revision of all op-amp applications","Solve 2 problems from each topic","Cross check with formula sheet","Mark remaining weak areas"]}];
const COA=[{title:"Number Representation",pts:["Fixed and floating point (IEEE 754)","Signed number formats — 1s, 2s complement","Overflow, rounding, normalisation","Solve 5 representation problems"]},{title:"ALU Design",pts:["Adders — ripple carry, carry lookahead","Booth's multiplication algorithm","Restoring and non-restoring division","ALU control and flags"]},{title:"CPU Organization",pts:["Register organisation and datapath","Bus structure and micro-operations","Instruction cycle — fetch, decode, execute","Solve datapath timing problems"]},{title:"Instruction Formats + Addressing",pts:["Instruction formats and opcodes","Addressing modes — all types","Effective address calculation","RISC vs CISC comparison"]},{title:"Control Unit Design",pts:["Hardwired control unit","Microprogrammed control","Horizontal vs vertical microprogramming","Control signal sequencing"]},{title:"Pipelining",pts:["Pipeline stages and speedup","Structural, data, control hazards","Data forwarding and stalls","Branch prediction basics"]},{title:"Memory Hierarchy",pts:["Registers → cache → RAM → secondary","Memory access time and bandwidth","Interleaved memory","Solve memory hierarchy problems"]},{title:"Cache Mapping",pts:["Direct, associative, set-associative mapping","Hit ratio and average access time","Write policies — write back / write through","Replacement policies — LRU, FIFO"]},{title:"Virtual Memory + I/O",pts:["Paging, page table, TLB, page faults","Segmentation basics","I/O — programmed, interrupt-driven, DMA","Memory-mapped vs isolated I/O"]},{title:"COA Full Revision",pts:["Rapid revision of all COA topics","Solve 2 problems from each topic","Cross check with formula sheet","Mark remaining weak areas"]}];
const MEAS=[{title:"Error Analysis",pts:["Accuracy, precision, resolution","Types of errors — gross, systematic, random","Statistical analysis — mean, std deviation","Propagation of errors"]},{title:"PMMC & MI Instruments",pts:["PMMC construction and working","Moving iron instruments","Shunts and multipliers — range extension","Solve range extension problems"]},{title:"Dynamometer + Wattmeters",pts:["Dynamometer construction","Wattmeter — power measurement","Energy meter — induction type","Errors and compensation"]},{title:"DC/AC Bridges I",pts:["Wheatstone bridge — sensitivity","Kelvin double bridge","Maxwell's inductance bridge","Solve bridge balance problems"]},{title:"AC Bridges II",pts:["Hay's bridge","Schering bridge — capacitance","Wien bridge — frequency","Anderson bridge"]},{title:"Potentiometers",pts:["DC potentiometer — Crompton","AC potentiometer","Standardisation and applications","Solve potentiometer problems"]},{title:"CRO",pts:["CRT construction and deflection","Time base and triggering","Lissajous patterns — frequency, phase","Measurements using CRO"]},{title:"Digital Instruments",pts:["Digital voltmeter types","Digital multimeter","Q-meter — Q factor measurement","Frequency counters"]},{title:"Transducers",pts:["Strain gauge and gauge factor","LVDT — displacement","Thermocouple, RTD, thermistor","Piezoelectric and capacitive transducers"]},{title:"Measurements Full Revision",pts:["Rapid revision of all Measurements topics","Solve 2 problems from each topic","Cross check with formula sheet","Mark remaining weak areas"]}];
const MATSCI=[{title:"Crystal Structure + Band Theory",pts:["Unit cell and Miller indices","Band theory — conductor/semiconductor/insulator","Effective mass concept","Solve 5 crystal structure problems"]},{title:"Dielectric Materials",pts:["Polarization types","Permittivity and dielectric constant","Dielectric loss and loss tangent","Breakdown mechanisms"]},{title:"Magnetic Materials",pts:["Dia, para, ferro, ferri magnetism","Hysteresis — coercivity, retentivity","Soft vs hard magnetic materials","Applications and losses"]},{title:"Semiconductors + Superconductivity",pts:["Intrinsic vs extrinsic carriers","Compound semiconductors — GaAs, InP","Meissner effect, critical temperature","Type I vs Type II superconductors"]},{title:"Nano Materials",pts:["Quantum dots and confinement","Carbon nanotubes","Graphene properties","MEMS / NEMS basics"]},{title:"Material Science Full Revision",pts:["Rapid revision of all topics","Solve 2 problems from each topic","Cross check with formula sheet","Mark remaining weak areas"]}];
function subjectBlock(start,end,subject,tag,plans,testName,badge){ const out=[]; let p=0; eachDay(start,end,(dt)=>{ if(dt.getDay()===0) out.push(mockDay(dt,subject,tag,testName,badge)); else { out.push(studyDay(dt,subject,tag,plans[Math.min(p,plans.length-1)],badge)); p++; } }); return out; }
function rotatingRevision(start,end,rotation,badge,gtName){ const out=[]; let r=0; eachDay(start,end,(dt)=>{ if(dt.getDay()===0) out.push(grandTestDay(dt,gtName,badge==="REVISION"?"GRAND TEST":badge)); else { const pair=[rotation[r%rotation.length],rotation[(r+1)%rotation.length]]; r+=2; out.push(revDay(dt,pair,badge)); } }); return out; }
const ESE14=["Networks","Controls","EDC","Digital","EMFT","Signals","Communication","MPMC","COA","Analogs","Measurements","Material Science"];
let GEN=[];
(function(){ let n=1; eachDay("2026-08-22","2026-08-29",(dt)=>{ GEN.push(examDay(dt,n)); n++; }); })();
eachDay("2026-08-30","2026-08-31",(dt)=> GEN.push(restDay(dt,"Post-Exam Recovery","Complete rest after APTRANSCO — recharge fully")));
GEN=GEN.concat(subjectBlock("2026-09-01","2026-09-13","Analogs","ana",ANALOGS,"Analogs Mock — 30 Qs","ESE ONLY"));
GEN=GEN.concat(subjectBlock("2026-09-14","2026-09-27","COA","coa",COA,"COA Mock — 25 Qs","ESE ONLY"));
GEN=GEN.concat(subjectBlock("2026-09-28","2026-10-11","Measurements","meas",MEAS,"Measurements Mock — 25 Qs","ESE ONLY"));
GEN=GEN.concat(rotatingRevision("2026-10-12","2026-10-31",["Analogs","COA","Measurements","EDC","Digital"],"REVISION","Grand Test — ESE-only subjects (40 Qs)"));
GEN=GEN.concat(subjectBlock("2026-11-01","2026-11-08","Material Science","mat",MATSCI,"Material Science Mock — 20 Qs","ESE ONLY"));
GEN=GEN.concat(rotatingRevision("2026-11-09","2026-11-30",ESE14,"REVISION PASS 1","Weekly Grand Test — mixed 40 Qs"));
GEN=GEN.concat(rotatingRevision("2026-12-01","2026-12-14",ESE14,"REVISION PASS 2","Full ESE Pattern Paper — mixed"));
(function(){ let i=0; eachDay("2026-12-15","2026-12-31",(dt)=>{ GEN.push(subjectMockMarathonDay(dt,ESE14[i%ESE14.length])); i++; }); })();
(function(){ let i=0; eachDay("2027-01-01","2027-01-20",(dt)=>{ GEN.push(pyqSprintDay(dt,ESE14[i%ESE14.length])); i++; }); })();
(function(){ let i=0; eachDay("2027-01-21","2027-01-30",(dt)=>{ GEN.push(taperDay(dt,ESE14[i%ESE14.length])); i++; }); })();
eachDay("2027-01-31","2027-01-31",(dt)=> GEN.push({ date:dLabel(dt), day:WD[dt.getDay()], subject:"🎯 ESE 2027 EXAM DAY", badge:"ESE EXAM DAY", sessions:[
{ tag:"rev", title:"Morning — Calm & Ready", tasks:["Light formula glance only — 15 min","Good breakfast, hydrate","Reach centre early with all documents"] },
{ tag:"mock", title:"🎯 The Exam", tasks:["Read each question carefully","Trust 7 months of consistent work","Stay calm, manage time, finish strong"] },
{ tag:"rev", title:"You Are Ready", tasks:["This is what all the prep was for","Give it everything","Then rest — you earned it"] },
]}));
const SCHED=DATA.concat(GEN);
function baseSubj(s){ return s.split(" — ")[0].split(" (")[0].trim(); }
const JUMPS=[]; (function(){ let last=null; SCHED.forEach((d,i)=>{ const b=baseSubj(d.subject); if(b!==last){ JUMPS.push({i,label:b,date:d.date}); last=b; } }); })();
