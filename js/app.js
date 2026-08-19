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
    cityInput: "",
    citySearching: false,
    customCity: null,
    citySuggestions: [],
    bubbleFocused: false,
    openDropdown: null, // "school" | "grade" | "study" | null

    map: null,
    circle: null,

    // Step 1: Paketauswahl
    selectedPackageId: null,  // 1 | 2 | 3 | 'custom'
    customImpressions: 100000,

    // Step 2: Banner
    skyscraperPercent: 60,
    skyscraperImage: null,
    quadraticImage: null,
    previewType: null,

    // Magnifier / Progress
    activeSection: 0,
    sectionLabels: ['Zielgruppe', 'Paketauswahl', 'Banner', 'Übersicht'],

    // Beratungstermin
    consultOpen: false,
    consultSuccess: false,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedConsultDate: null,
    selectedConsultSlot: null,


    get selectedCity() {
      return this.customCity || this.cities.find((c) => c.id === this.selectedCityId);
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

    async searchCity() {
      const q = this.cityInput.trim();
      if (!q) return;
      this.citySearching = true;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=de&countrycodes=de`
        );
        const data = await res.json();
        if (data[0]) {
          const lat = +data[0].lat, lng = +data[0].lon;
          const name = data[0].display_name.split(',')[0].trim();
          const density = Math.round(Math.min(150, Math.max(20, 20 + data[0].importance * 130)));
          const fromBubble = this.bubbleFocused;
          this.customCity = { name, lat, lng, density };
          this.cityInput = name;
          this.citySuggestions = [];
          this.bubbleFocused = false;
          if (!this.map.hasLayer(this.circle)) this.circle.addTo(this.map);
          this.map.setView([lat, lng], 11);
          this.circle.setLatLng([lat, lng]);
          if (fromBubble) setTimeout(() => this.scrollToSection(0), 50);
        }
      } catch {}
      this.citySearching = false;
    },

    async fetchSuggestions() {
      const q = this.cityInput.trim();
      if (q.length < 2) { this.citySuggestions = []; return; }
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=de&bbox=5.8,47.3,15.0,55.1`
        );
        const data = await res.json();
        const ok = new Set(['city', 'town', 'village', 'municipality', 'borough']);
        this.citySuggestions = data.features
          .filter(f => ok.has(f.properties.type))
          .slice(0, 5)
          .map(f => ({
            name: f.properties.name,
            display: [f.properties.name, f.properties.state].filter(Boolean).join(', '),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            type: f.properties.type,
          }));
      } catch {}
    },

    selectSuggestion(s) {
      const typeDensity = { city: 115, town: 75, village: 35, municipality: 65, borough: 95 };
      const density = typeDensity[s.type] || 65;
      const fromBubble = this.bubbleFocused;
      this.customCity = { name: s.name, lat: s.lat, lng: s.lng, density };
      this.cityInput = s.name;
      this.citySuggestions = [];
      this.bubbleFocused = false;
      if (!this.map.hasLayer(this.circle)) this.circle.addTo(this.map);
      this.map.setView([s.lat, s.lng], 11);
      this.circle.setLatLng([s.lat, s.lng]);
      if (fromBubble) setTimeout(() => this.scrollToSection(0), 50);
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

      // Scroll-Observer für Magnifier + Dots
      const sections = document.querySelectorAll('.wizard-section');
      const updateActive = () => {
        const vcenter = window.innerHeight / 2;
        let closest = 0, closestDist = Infinity;
        sections.forEach((s, i) => {
          const rect = s.getBoundingClientRect();
          const dist = Math.abs((rect.top + rect.bottom) / 2 - vcenter);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        this.activeSection = closest;
      };
      window.addEventListener('scroll', updateActive, { passive: true });
      updateActive();

      this.map = L.map("map", { zoomControl: false }).setView([51.165, 10.451], 6);

      // CARTO Voyager: farbiger Stil (keine Gleise, dezente Straßen)
      L.tileLayer("https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=3l3atsqoU80Mr2nZi4Oy", {
        attribution: '© <a href="https://www.maptiler.com/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        tileSize: 512,
        zoomOffset: -1,
        maxZoom: 19,
      }).addTo(this.map);

      this.circle = L.circle([51.165, 10.451], {
        radius: this.radiusKm * 1000,
        color: "#2970FF",
        fillColor: "#2970FF",
        fillOpacity: 0.15,
        weight: 2,
      });

    },

    scrollToSection(i) {
      const sections = document.querySelectorAll('.wizard-section');
      const target = sections[i];
      if (!target) return;
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      const startY = window.scrollY;
      const distance = targetY - startY;
      const duration = 500;
      const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        window.scrollTo(0, startY + distance * ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
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
