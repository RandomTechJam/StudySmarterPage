const SCHOOL_TYPES = [
  "Fachabitur",
  "Gesamtschule",
  "Gymnasium",
  "Hauptschule",
  "Realschule",
];

// Realistischer Anteil je Schulart an der StudySmarter-Zielgruppe (Summe = 1)
const SCHOOL_TYPE_WEIGHTS = {
  "Fachabitur":   0.08,
  "Gesamtschule": 0.20,
  "Gymnasium":    0.35,
  "Hauptschule":  0.12,
  "Realschule":   0.25,
};

const GRADE_LEVELS = [7, 8, 9, 10, 11, 12, 13];

// Einmalzahlung, lineares CPM (kein Mengenrabatt)
const CPM = 4; // € pro 1.000 Impressionen

const AD_PACKAGES = [
  { id: 1, label: "Starter",  impressions:  50000, price:  50000 / 1000 * CPM },
  { id: 2, label: "Growth",   impressions: 150000, price: 150000 / 1000 * CPM },
  { id: 3, label: "Pro",      impressions: 500000, price: 500000 / 1000 * CPM },
];

const CUSTOM_CPM = CPM;

const STUDY_PROGRAMS = [
  "Architektur",
  "Betriebswirtschaftslehre (BWL)",
  "Biologie",
  "Chemie",
  "Elektrotechnik",
  "Erziehungswissenschaften",
  "Informatik",
  "Ingenieurwissenschaften",
  "Jura / Rechtswissenschaften",
  "Kommunikationswissenschaften",
  "Lehramt",
  "Maschinenbau",
  "Mathematik",
  "Medizin",
  "Pharmazie",
  "Physik",
  "Psychologie",
  "Soziale Arbeit",
  "Sportwissenschaften",
  "Volkswirtschaftslehre (VWL)",
  "Wirtschaftsinformatik",
  "Wirtschaftswissenschaften",
  "Zahnmedizin",
];
