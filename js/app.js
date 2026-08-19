function appState() {
  return {
    cities: CITIES,
    selectedCityId: CITIES[0].id,
    radiusKm: 10,

    // Filter-Mehrfachauswahl
    selectedSchoolTypes: [],
    selectedGrades: [],
    selectedStudyPrograms: [],
    studySearch: "",
    openDropdown: null, // "school" | "grade" | "study" | null

    map: null,
    circle: null,

    snapshot: null,

    // Step 1: Paketauswahl
    selectedPackageId: null,  // 1 | 2 | 3 | 'custom'
    customImpressions: 100000,

    // Step 2: Banner
    skyscraperPercent: 60,
    skyscraperImage: null,
    quadraticImage: null,
    previewType: null,

    // Beratungstermin
    consultOpen: false,
    consultSuccess: false,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedConsultDate: null,
    selectedConsultSlot: null,

    wizard: {
      step: 0,
      stepLabels: ["Zielgruppe", "Paketauswahl", "Banner", "Übersicht"],
      nextStep() {
        if (this.step < this.stepLabels.length - 1) this.step++;
      },
      prevStep() {
        if (this.step > 0) this.step--;
      },
    },

    lockSelection() {
      this.snapshot = {
        city: this.selectedCity.name,
        radiusKm: this.radiusKm,
        users: this.usersInRadius,
        schoolTypes: this.selectedSchoolTypes.length > 0
          ? [...this.selectedSchoolTypes]
          : ["Alle Schularten"],
        grades: this.selectedGrades.length > 0
          ? this.selectedGrades.map((g) => `${g}. Klasse`)
          : ["Alle Klassen"],
        studyPrograms: this.selectedStudyPrograms.length > 0
          ? [...this.selectedStudyPrograms]
          : ["Alle Studiengänge"],
      };
      this.wizard.nextStep();
    },

    get selectedCity() {
      return this.cities.find((c) => c.id === this.selectedCityId);
    },

    get usersInRadius() {
      const areaKm2 = Math.PI * this.radiusKm * this.radiusKm;
      const base = areaKm2 * this.selectedCity.density;

      // Schularten: gewichtete Anteile; kein Filter = 100 %
      let schoolF = 1.0;
      if (this.selectedSchoolTypes.length > 0) {
        schoolF = this.selectedSchoolTypes.reduce(
          (sum, t) => sum + (SCHOOL_TYPE_WEIGHTS[t] || 0), 0
        );
      }

      // Klassenstufen: proportional; kein Filter = 100 %
      const gradeF = this.selectedGrades.length > 0
        ? this.selectedGrades.length / GRADE_LEVELS.length
        : 1.0;

      // Studienwunsch: proportional; kein Filter = 100 %
      const studyF = this.selectedStudyPrograms.length > 0
        ? this.selectedStudyPrograms.length / STUDY_PROGRAMS.length
        : 1.0;

      return Math.round(base * schoolF * gradeF * studyF);
    },

    get squarePercent() {
      return 100 - this.skyscraperPercent;
    },

    get customPackagePrice() {
      return Math.ceil(this.customImpressions / 1000 * CUSTOM_CPM);
    },

    get activePackage() {
      if (this.selectedPackageId === 'custom') {
        return { label: 'Individuell', impressions: this.customImpressions, price: this.customPackagePrice };
      }
      return AD_PACKAGES.find((p) => p.id === this.selectedPackageId) || null;
    },

    handleImageUpload(type, event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'sky') this.skyscraperImage = e.target.result;
        else this.quadraticImage = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    get calMonthName() {
      return new Date(this.calYear, this.calMonth, 1)
        .toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    },

    get calDays() {
      const firstDay = new Date(this.calYear, this.calMonth, 1).getDay();
      const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const offset = (firstDay + 6) % 7;
      const days = [];
      for (let i = 0; i < offset; i++) days.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(this.calYear, this.calMonth, d);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        days.push({
          day: d, date,
          disabled: date < today || isWeekend,
          selected: this.selectedConsultDate?.getTime() === date.getTime(),
        });
      }
      return days;
    },

    get consultSlots() {
      if (!this.selectedConsultDate) return [];
      const d = this.selectedConsultDate.getDate();
      return ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
        .filter((_, i) => (d + i * 3) % 5 !== 0);
    },

    calPrevMonth() {
      if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; }
      else this.calMonth--;
    },
    calNextMonth() {
      if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; }
      else this.calMonth++;
    },
    selectConsultDate(day) {
      if (!day || day.disabled) return;
      this.selectedConsultDate = day.date;
      this.selectedConsultSlot = null;
    },
    confirmConsult() {
      if (!this.selectedConsultDate || !this.selectedConsultSlot) return;
      this.consultSuccess = true;
    },

    get filteredStudyPrograms() {
      if (!this.studySearch.trim()) return STUDY_PROGRAMS;
      const q = this.studySearch.trim().toLowerCase();
      return STUDY_PROGRAMS.filter((p) => p.toLowerCase().includes(q));
    },

    // Dropdown-Label-Helfer
    schoolTypeLabel() {
      if (this.selectedSchoolTypes.length === 0) return "Alle Schularten";
      if (this.selectedSchoolTypes.length === 1) return this.selectedSchoolTypes[0];
      return `${this.selectedSchoolTypes.length} ausgewählt`;
    },
    gradeLevelLabel() {
      if (this.selectedGrades.length === 0) return "Alle Klassen";
      if (this.selectedGrades.length === 1) return `${this.selectedGrades[0]}. Klasse`;
      return `${this.selectedGrades.length} Klassen`;
    },
    studyLabel() {
      if (this.selectedStudyPrograms.length === 0) return "Alle Studiengänge";
      if (this.selectedStudyPrograms.length === 1) return this.selectedStudyPrograms[0];
      return `${this.selectedStudyPrograms.length} ausgewählt`;
    },

    // Dropdown-Toggle (immer nur eines offen)
    toggleDropdown(name) {
      this.openDropdown = this.openDropdown === name ? null : name;
      if (this.openDropdown !== "study") this.studySearch = "";
    },

    // Checkbox-Helfer
    toggleSchoolType(type) {
      const idx = this.selectedSchoolTypes.indexOf(type);
      if (idx === -1) this.selectedSchoolTypes.push(type);
      else this.selectedSchoolTypes.splice(idx, 1);
    },
    toggleGrade(grade) {
      const idx = this.selectedGrades.indexOf(grade);
      if (idx === -1) this.selectedGrades.push(grade);
      else this.selectedGrades.splice(idx, 1);
    },
    toggleStudy(program) {
      const idx = this.selectedStudyPrograms.indexOf(program);
      if (idx === -1) this.selectedStudyPrograms.push(program);
      else this.selectedStudyPrograms.splice(idx, 1);
    },

    init() {
      const mapEl = document.getElementById("map");
      if (mapEl._leaflet_id) return;

      // Mausrad-Scroll auf der rechten Spalte → Step-Navigation
      const rightPanel = document.querySelector('.panel-right');
      let wheelCooldown = false;
      rightPanel.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (wheelCooldown) return;
        wheelCooldown = true;
        setTimeout(() => { wheelCooldown = false; }, 480);

        if (e.deltaY > 0) {
          if (this.wizard.step === 0) this.lockSelection();
          else this.wizard.nextStep();
        } else {
          this.wizard.prevStep();
        }
      }, { passive: false });

      this.map = L.map("map", { zoomControl: false }).setView(
        [this.selectedCity.lat, this.selectedCity.lng],
        11
      );

      // CARTO Voyager: farbiger Stil (keine Gleise, dezente Straßen)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(this.map);

      this.circle = L.circle([this.selectedCity.lat, this.selectedCity.lng], {
        radius: this.radiusKm * 1000,
        color: "#9272f2",
        fillColor: "#9272f2",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(this.map);

    },

    onCityChange() {
      const city = this.selectedCity;
      this.map.setView([city.lat, city.lng], 11);
      this.circle.setLatLng([city.lat, city.lng]);
    },

    onRadiusChange() {
      this.circle.setRadius(this.radiusKm * 1000);
    },

  };
}
