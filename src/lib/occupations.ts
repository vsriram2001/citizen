// Broad occupation categories, adapted from India's National Classification
// of Occupations (NCO-2015) major groups, plus a few categories the NCO's
// employment-only framing misses but this platform needs (Student,
// Homemaker, Retired, Unemployed).
export const OCCUPATIONS = [
  "Farmer / Agricultural worker",
  "Legislator, senior official, or manager",
  "Professional (doctor, lawyer, engineer, scientist)",
  "Teacher / Education professional",
  "Technician or associate professional",
  "Clerical support worker",
  "Service or sales worker",
  "Skilled trade worker (electrician, plumber, carpenter)",
  "Plant or machine operator",
  "Elementary occupation (manual labour, unskilled)",
  "Armed forces",
  "Business owner / Entrepreneur",
  "Software / IT professional",
  "Homemaker",
  "Student",
  "Retired",
  "Unemployed",
] as const;
