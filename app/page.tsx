"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Trophy,
  Users,
  TrendingUp,
  Target,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Star,
  Globe,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import ImageSlider from "@/components/image-slider";


interface Student {
  matricule: string;
  nom_complet: string;
  ecole: string;
  etablissement: string;
  moyenne: number;
  rang: number;
  admis: boolean;
  decision_text: string;
  section: string;
  wilaya?: string;
  moughataa?: string;
  year: number;
  examType: "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE";
}

interface LeaderboardData {
  [section: string]: Student[];
}

interface WilayaData {
  [wilaya: string]: string[];
}

interface SectionStat {
  name: string;
  total: number;
  admitted: number;
  rate: string;
}

interface WilayaStat {
  name: string;
  total: number;
  admitted: number;
  rate: string;
}

interface Statistics {
  totalStudents: number;
  admittedStudents: number;
  admissionRate: string;
  sessionnaireRate: string;
  sections: string[];
  wilayas: string[];
  averageScore: string;
  sectionStats: SectionStat[];
  wilayaStats: WilayaStat[];
  message?: string;
}

// Section mapping and ordering for BAC
const SECTION_MAPPING: { [key: string]: string } = {
  "Sciences naturelles": "SN",
  SN: "SN",
  sn: "SN",
  Mathématiques: "M",
  M: "M",
  "Lettres modernes": "LM",
  LM: "LM",
  Lettres: "LM",
  LO: "LO",
  TS: "TS",
  LA: "LA",
  TM: "TM",
};

// Preferred section order for BAC
const SECTION_ORDER = ["SN", "M", "LM", "LO", "TS"];

// Available years and exam types - Will be populated from database
const availableYears: number[] = []; // Will be populated from exam types

// Set default year to 2025
const defaultYear = 2025;

// Storage keys for persistence
const STORAGE_KEYS = {
  SELECTED_YEAR: "selectedYear",
  SELECTED_EXAM_TYPE: "selectedExamType",
  SELECTED_SESSION_TYPE: "selectedSessionType",
};

export default function HomePage() {
  // Initialize state with defaults (no localStorage access during SSR)
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedExamType, setSelectedExamType] = useState<"BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE">(
    "BAC"
  );
  const [selectedSessionType, setSelectedSessionType] = useState<"NORMALE" | "COMPLEMENTAIRE" | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([2025]);

  const [searchMatricule, setSearchMatricule] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [selectedEstablishment, setSelectedEstablishment] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | any>({});
  const [wilayaData, setWilayaData] = useState<WilayaData>({});
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [noDataMessage, setNoDataMessage] = useState("");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [enhancedStats, setEnhancedStats] = useState<any>(null);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const router = useRouter();



  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Persist selections to localStorage
  const handleYearChange = (year: string) => {
    const yearNum = Number.parseInt(year);
    setSelectedYear(yearNum);
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_YEAR, year);
    }
  };

  const handleExamTypeChange = (examTypeValue: string) => {
    // Parse the combined value (format: "BAC-SESSION-YEAR")
    const [examType, sessionType, year] = examTypeValue.split("-");
    
    setSelectedExamType(examType as any);
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_TYPE, examType);
    }
    
    // For BAC exams, session type is mandatory
    if (examType === "BAC") {
      // If sessionType is provided, use it; otherwise default to NORMALE
      const finalSessionType = sessionType || "NORMALE";
      setSelectedSessionType(finalSessionType as "NORMALE" | "COMPLEMENTAIRE");
      if (isHydrated) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_SESSION_TYPE, finalSessionType);
      }
    } else {
      // Reset session type when changing exam type (only BAC has sessions)
      setSelectedSessionType(null);
    }
    
    // Reset slide index when changing exam type
    setCurrentSlideIndex(0);
  };

  const handleSessionTypeChange = (sessionType: string) => {
    setSelectedSessionType(sessionType as "NORMALE" | "COMPLEMENTAIRE");
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_SESSION_TYPE, sessionType);
    }
  };

  // Handle hydration and localStorage
  useEffect(() => {
    setIsHydrated(true);
    // Only access localStorage after hydration
    const storedYear = localStorage.getItem(STORAGE_KEYS.SELECTED_YEAR);
    const storedExamType = localStorage.getItem(
      STORAGE_KEYS.SELECTED_EXAM_TYPE
    );
    const storedSessionType = localStorage.getItem(
      STORAGE_KEYS.SELECTED_SESSION_TYPE
    );

    if (storedYear) {
      setSelectedYear(Number.parseInt(storedYear));
    }
    if (storedExamType) {
      setSelectedExamType(storedExamType as "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE");
      
      // For BAC exams, ensure session type is set
      if (storedExamType === "BAC") {
        if (storedSessionType) {
          setSelectedSessionType(storedSessionType as "NORMALE" | "COMPLEMENTAIRE");
        } else {
          // Don't set a default session type here - let fetchExamTypes handle it
          // This will be handled by the default exam type logic
        }
      }
    } else {
      // No stored exam type - will be handled by fetchExamTypes which will set the default
      // Clear any stored session type to ensure it uses the default exam type's session
      if (storedSessionType) {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_SESSION_TYPE);
      }
    }
  }, []);

  useEffect(() => {
    // Only fetch data after hydration is complete
    if (isHydrated) {
      fetchExamTypes();
    }
  }, [isHydrated]);

  useEffect(() => {
    // Fetch other data after exam types are loaded and exam type is set
    if (isHydrated && selectedExamType) {
      fetchLeaderboard();
      fetchWilayaData();
      fetchStatistics();
      fetchSliderImages();
      fetchEnhancedStats();
    }
  }, [selectedYear, selectedExamType, selectedSessionType, isHydrated]);

  // Handle page scroll when search is focused
  useEffect(() => {
    if (isSearchFocused && pageRef.current) {
      // Smooth scroll the page up when search is focused
      const scrollOffset = window.innerWidth < 640 ? 120 : 80;
      window.scrollTo({
        top: Math.max(0, window.scrollY - scrollOffset),
        behavior: "smooth",
      });
    }
  }, [isSearchFocused]);

  // Ajouter un bouton de rafraîchissement et améliorer la gestion des erreurs
  const fetchLeaderboard = async () => {
    try {
      setError("");
      setNoDataMessage("");
      setLoading(true);

      console.log(
        `🔍 Fetching leaderboard for ${selectedExamType} ${selectedYear}`
      );

      // Include session type for BAC if selected
      const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
      const response = await fetch(
        `/api/leaderboard?year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType?.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();
      console.log("📊 Leaderboard data received:", data);

      // Check if there's a special message (for current year with no data)
      if (data.message) {
        setNoDataMessage(data.message);
        setLeaderboard({});
        setError("");
        return;
      }

      if (selectedExamType === "BREVET" || selectedExamType === "CONCOURS" || selectedExamType === "EXCELLENCE") {
        // For BREVET and CONCOURS, data should be an array of students
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ ${selectedExamType} data is array with`, data.length, "students");
          setLeaderboard({ "Top 10 Mauritanie": data });
          setError("");
          setNoDataMessage("");
        } else {
          console.log(`❌ ${selectedExamType} data is empty or invalid:`, data);
          setLeaderboard({});
          setError(
            `Aucune donnée disponible pour ${selectedExamType} ${selectedYear} pour le moment`
          );
        }
      } else {
        // For BAC, data should be an object with sections
        const hasValidData =
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          Object.keys(data).length > 0 &&
          Object.values(data).some(
            (section: any) =>
              section &&
              section.students &&
              Array.isArray(section.students) &&
              section.students.length > 0
          );

        if (!hasValidData) {
          console.log("❌ BAC data is empty or invalid:", data);
          setLeaderboard({});
          setError(
            `Aucune donnée disponible pour ${selectedExamType} ${selectedYear} pour le moment`
          );
        } else {
          console.log("✅ BAC data is valid with sections:", Object.keys(data));
          // BAC - Filter out unwanted sections and apply ordering
          const filteredData: LeaderboardData = {};

          // Get sections in preferred order
          const orderedSections = SECTION_ORDER?.filter((sectionCode) => {
            // Find matching section in data
            return Object.keys(data).some((section) => {
              const mappedSection = SECTION_MAPPING[section] || section;
              return (
                mappedSection === sectionCode &&
                data[section] &&
                data[section].students &&
                Array.isArray(data[section].students) &&
                data[section].students.length > 0
              );
            });
          });

          // Add sections in order
          orderedSections.forEach((sectionCode) => {
            const matchingSection = Object.keys(data).find((section) => {
              const mappedSection = SECTION_MAPPING[section] || section;
              return mappedSection === sectionCode;
            });
            if (matchingSection && data[matchingSection]) {
              // Extract students array for compatibility with existing UI
              filteredData[matchingSection] =
                data[matchingSection].students || [];
              // Store stats for later use
              if (data[matchingSection].stats) {
                filteredData[`${matchingSection}_stats`] =
                  data[matchingSection].stats;
              }
            }
          });

          // Add any remaining sections not in the preferred order
          Object.keys(data).forEach((section) => {
            const mappedSection = SECTION_MAPPING[section] || section;
            if (
              !SECTION_ORDER?.includes(mappedSection) &&
              section !== "Sciences" &&
              section !== "sn" &&
              data[section] &&
              data[section].students &&
              Array.isArray(data[section].students) &&
              data[section].students.length > 0
            ) {
              filteredData[section] = data[section].students || [];
              if (data[section].stats) {
                filteredData[`${section}_stats`] = data[section].stats;
              }
            }
          });

          if (Object.keys(filteredData).length === 0) {
            setLeaderboard({});
            setError(
              `Aucune donnée disponible pour ${selectedExamType} ${selectedYear} pour le moment`
            );
          } else {
            setLeaderboard(filteredData);
            setError("");
            setNoDataMessage("");
          }
        }
      }
    } catch (error) {
      console.error("💥 Error fetching leaderboard:", error);
      setError(
        `Erreur lors du chargement des données pour ${selectedExamType} ${selectedYear}`
      );
      setLeaderboard({});
    } finally {
      setLoading(false);
    }
  };

  const fetchWilayaData = async () => {
    try {
      // Include session type for BAC if selected
      const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
      const response = await fetch(
        `/api/wilayas?year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setWilayaData(data);
      }
    } catch (error) {
      console.error("Error fetching wilaya data:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Include session type for BAC if selected
      const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
      const response = await fetch(
        `/api/statistics?year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchSliderImages = async () => {
    try {
      const response = await fetch("/api/slider-images");
      if (response.ok) {
        const data = await response.json();
        setSliderImages(data.images || []);
      }
    } catch (error) {
      console.error("Error fetching slider images:", error);
    }
  };

  const fetchExamTypes = async () => {
    try {
      const response = await fetch("/api/admin/exam-types");
      const data = await response.json();
      if (data.success) {
        setExamTypes(data.examTypes);
        
        // Extract unique years from exam types
        const years = [...new Set(data.examTypes.map((type: any) => type.year))].sort((a: any, b: any) => b - a) as number[];
        setAvailableYears(years.length > 0 ? years : [2025]);
        
        // Update selected year if current year is not in available years
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }

        // Find and set default exam type if no exam type is currently selected
        const defaultExamType = data.examTypes.find((type: any) => type.isDefault);
        if (defaultExamType && !localStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_TYPE)) {
          setSelectedExamType(defaultExamType.code as "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE");
          if (isHydrated) {
            localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_TYPE, defaultExamType.code);
          }
          
          // For BAC exams, also set the default session type
          if (defaultExamType.code === "BAC" && defaultExamType.sessionType) {
            setSelectedSessionType(defaultExamType.sessionType as "NORMALE" | "COMPLEMENTAIRE");
            if (isHydrated) {
              localStorage.setItem(STORAGE_KEYS.SELECTED_SESSION_TYPE, defaultExamType.sessionType);
            }
          }
        } else if (defaultExamType && localStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_TYPE)) {
          // If there's a default exam type but we have a stored one, check if the stored one exists
          const storedExamType = localStorage.getItem(STORAGE_KEYS.SELECTED_EXAM_TYPE);
          const storedExamTypeExists = data.examTypes.some((type: any) => type.code === storedExamType);
          
          if (!storedExamTypeExists) {
            // If stored exam type doesn't exist, use the default
            setSelectedExamType(defaultExamType.code as "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE");
            if (isHydrated) {
              localStorage.setItem(STORAGE_KEYS.SELECTED_EXAM_TYPE, defaultExamType.code);
            }
            
            // For BAC exams, also set the default session type
            if (defaultExamType.code === "BAC" && defaultExamType.sessionType) {
              setSelectedSessionType(defaultExamType.sessionType as "NORMALE" | "COMPLEMENTAIRE");
              if (isHydrated) {
                localStorage.setItem(STORAGE_KEYS.SELECTED_SESSION_TYPE, defaultExamType.sessionType);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching exam types:", error);
    }
  };

  const fetchEnhancedStats = async () => {
    try {
      // Include session type for BAC if selected
      const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
      const response = await fetch(
        `/api/statistics-enhanced?year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setEnhancedStats(data);
      }
    } catch (error) {
      console.error("Error fetching enhanced statistics:", error);
    }
  };

  // Get available sections for slider
  const availableSections = Object.keys(leaderboard)?.filter((section) => {
    const sectionData = leaderboard[section];
    // For BAC: check if section has students array, for BREVET/CONCOURS: check if it's array
    if (selectedExamType === "BAC") {
      return (
        sectionData && Array.isArray(sectionData) && sectionData.length > 0
      );
    } else {
      return (
        sectionData && Array.isArray(sectionData) && sectionData.length > 0
      );
    }
  });

  // Auto-slide effect with 6-second intervals (only for BAC with multiple sections)
  useEffect(() => {
    if (
      !isAutoSliding ||
      availableSections.length <= 1 ||
              selectedExamType === "BREVET" ||
        selectedExamType === "CONCOURS" ||
        selectedExamType === "EXCELLENCE"
    )
      return;

    const interval = setInterval(() => {
      setCurrentSlideIndex(
        (prevIndex) => (prevIndex + 1) % availableSections.length
      );
    }, 15000); // Change slide every 15 seconds

    return () => clearInterval(interval);
  }, [availableSections.length, isAutoSliding, selectedExamType]);

  // Get current section data
  const currentSection = availableSections[currentSlideIndex];
  const currentSectionData = currentSection
    ? (selectedExamType === "BAC" && leaderboard[currentSection]?.students
        ? leaderboard[currentSection].students
        : leaderboard[currentSection]) || []
    : [];

  // Touch handlers for swipe functionality
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoSliding(false); // Stop auto-sliding when user interacts
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && availableSections.length > 1) {
      nextSlide();
    }
    if (isRightSwipe && availableSections.length > 1) {
      prevSlide();
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchMatricule.trim()) return;

    // For CONCOURS exams, search by matricule is not supported
    if (selectedExamType === "CONCOURS") {
      alert("Recherche par matricule non disponible pour les examens CONCOURS. Utilisez la recherche par nom ou établissement.");
      return;
    }

    // For BAC exams, session type is required
    if (selectedExamType === "BAC" && !selectedSessionType) {
      alert("Veuillez sélectionner une session (Normale ou Complémentaire) pour rechercher un étudiant BAC");
      return;
    }

    setSearchLoading(true);
    try {
      // Include session type for BAC exams
      const sessionTypeParam = selectedExamType === "BAC" ? `&sessionType=${selectedSessionType}` : "";
      const searchUrl = `/api/search?matricule=${encodeURIComponent(
        searchMatricule
      )}&year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`;
      
      console.log(`🔍 Searching with URL: ${searchUrl}`);
      console.log(`📊 Current state: examType=${selectedExamType}, sessionType=${selectedSessionType}, year=${selectedYear}`);
      
      const response = await fetch(searchUrl);
      if (response.ok) {
        // Include session type for BAC exams
        const sessionTypeUrlParam = selectedExamType === "BAC" ? `&sessionType=${selectedSessionType}` : "";
        const resultsUrl = `/results?matricule=${encodeURIComponent(
          searchMatricule
        )}&year=${selectedYear}&examType=${selectedExamType}${sessionTypeUrlParam}&returnTo=${encodeURIComponent(
          "/"
        )}`;
        
        console.log(`✅ Search successful, navigating to: ${resultsUrl}`);
        router.push(resultsUrl);
      } else {
        const errorData = await response.json();
        console.error(`❌ Search failed: ${errorData.error}`);
        
        // Handle specific error codes
        if (errorData.code === "SESSION_REQUIRED") {
          alert("Veuillez sélectionner une session (Normale ou Complémentaire) pour rechercher un étudiant BAC");
        } else if (errorData.code === "SEARCH_NOT_SUPPORTED") {
          alert("Recherche par matricule non disponible pour les examens CONCOURS. Utilisez la recherche par nom ou établissement.");
        } else {
          alert(errorData.error || "Étudiant non trouvé");
        }
      }
    } catch (error) {
      console.error("💥 Search error:", error);
      alert("Erreur lors de la recherche de l'étudiant");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleWilayaSelect = (wilaya: string) => {
    setSelectedWilaya(wilaya);
    setSelectedEstablishment("");
  };

  const handleEstablishmentSelect = (establishment: string) => {
    setSelectedEstablishment(establishment);
    // Include session type for BAC if selected
    const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
    router.push(
      `/school?name=${encodeURIComponent(
        establishment
      )}&year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`
    );
  };

  const handleEstablishmentClick = (etablissement: string, wilaya?: string) => {
    // Include session type for BAC if selected
    const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
    const wilayaParam = wilaya ? `&wilaya=${encodeURIComponent(wilaya)}` : "";
    router.push(
      `/school?name=${encodeURIComponent(
        etablissement
      )}&year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}${wilayaParam}`
    );
  };

  const handleWilayaClick = (wilayaName: string) => {
    // Include session type for BAC if selected
    const sessionTypeParam = selectedExamType === "BAC" && selectedSessionType ? `&sessionType=${selectedSessionType}` : "";
    router.push(
      `/wilaya?name=${encodeURIComponent(
        wilayaName
      )}&year=${selectedYear}&examType=${selectedExamType}${sessionTypeParam}`
    );
  };

  const getRankBadgeColor = (position: number) => {
    if (position === 1) return "bg-yellow-500 hover:bg-yellow-600"; // Gold
    if (position === 2) return "bg-gray-400 hover:bg-gray-500"; // Silver
    if (position === 3) return "bg-amber-600 hover:bg-amber-700"; // Bronze
    return "bg-blue-500 hover:bg-blue-600"; // Blue for other positions
  };

  const getDecisionBadgeVariant = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (
      decision?.includes("admis") ||
      decision?.includes("reussi") ||
      decision === "r"
    ) {
      return "default";
    } else if (
      decision?.includes("sessionnaire") ||
      decision?.includes("sessionn")
    ) {
      return "secondary"; // This will be styled as orange
    }
    return "destructive";
  };

  const nextSlide = () => {
    if (availableSections.length <= 1) return;
    setIsAutoSliding(false);
    setCurrentSlideIndex(
      (prevIndex) => (prevIndex + 1) % availableSections.length
    );
    // Resume auto-sliding after 10 seconds
    setTimeout(() => setIsAutoSliding(true), 10000);
  };

  const prevSlide = () => {
    if (availableSections.length <= 1) return;
    setIsAutoSliding(false);
    setCurrentSlideIndex(
      (prevIndex) =>
        (prevIndex - 1 + availableSections.length) % availableSections.length
    );
    // Resume auto-sliding after 10 seconds
    setTimeout(() => setIsAutoSliding(true), 10000);
  };

  const goToSlide = (index: number) => {
    if (availableSections.length <= 1) return;
    setIsAutoSliding(false);
    setCurrentSlideIndex(index);
    // Resume auto-sliding after 10 seconds
    setTimeout(() => setIsAutoSliding(true), 10000);
  };

  const getSectionDisplayName = (section: string) => {
    if (selectedExamType === "BREVET" || selectedExamType === "CONCOURS" || selectedExamType === "EXCELLENCE") {
      return "Top 10 Mauritanie";
    }

    const mappedSection = SECTION_MAPPING[section] || section;

    // Return full name with code
    switch (mappedSection) {
      case "SN":
        return "SN - Sciences naturelles";
      case "M":
        return "M - Mathématiques";
      case "LM":
        return "LM - Lettres Modernes";
      case "LO":
        return "LO - Lettres Originelles";
      case "TS":
        return "TS - Génie électrique";
      case "LA":
        return "LA - Langues";
      case "TM":
        return "TM - Filière technique";
      default:
        return `${mappedSection} - ${section}`;
    }
  };

  return (
    <div
      ref={pageRef}
      className={`min-h-screen bg-white transition-all duration-300 ${
        isSearchFocused ? "transform -translate-y-4 sm:-translate-y-2" : ""
      }`}
    >
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 md:py-8">
        {/* Year and Exam Type Selection - Side by Side on Mobile */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-3 sm:p-4 md:p-6">
              <CardTitle className="flex items-center text-sm sm:text-base md:text-xl">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-2" />
                Sélectionner l'année et le type d'examen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Year Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Année
                  </label>
                  <Select
                    value={
                      isHydrated
                        ? selectedYear.toString()
                        : defaultYear.toString()
                    }
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="w-full border-blue-300 focus:border-blue-500 focus:outline-none text-sm sm:text-base h-9 sm:h-10">
                      <SelectValue placeholder="Choisir une année..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Type d'Examen
                  </label>
                  <Select
                    value={isHydrated ? `${selectedExamType}-${selectedSessionType || "NONE"}-${selectedYear}` : "BREVET-NONE-2025"}
                    onValueChange={handleExamTypeChange}
                  >
                    <SelectTrigger className="w-full border-blue-300 focus:border-blue-500 focus:outline-none text-sm sm:text-base h-9 sm:h-10">
                      <SelectValue placeholder="Choisir un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.length > 0 ? (
                        examTypes
                          .map((type) => (
                            <SelectItem key={`${type.code}-${type.sessionType || "NONE"}-${type.year}`} value={`${type.code}-${type.sessionType || "NONE"}-${type.year}`}>
                              {type.name} ({type.year}){type.code === "BAC" ? ` - ${type.sessionType === "NORMALE" ? "Session Normale" : type.sessionType === "COMPLEMENTAIRE" ? "Session Complémentaire" : "Aucune session"}` : ""}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="BAC" disabled>
                          Aucun type d'examen disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Image Slider Section */}
        {sliderImages.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <ImageSlider images={sliderImages} />
          </div>
        )}

        {/* Combined Search Section - Simple Design */}
        <div id="search-section" className="mb-6 sm:mb-8 md:mb-12">
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-blue-50 to-blue-100 overflow-hidden max-w-2xl mx-auto">
            <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-white to-blue-50">
              <form onSubmit={handleSearch} className="space-y-4">
                {/* Main Search Input - Hidden for CONCOURS */}
                {selectedExamType !== "CONCOURS" && (
                  <>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Taper votre matricule ici"
                          value={searchMatricule}
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            setSearchMatricule(value);
                          }}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => setIsSearchFocused(false)}
                          className="w-full h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base font-medium bg-white border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none rounded-xl shadow-lg transition-all duration-300 placeholder:text-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleSearch()}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-200 focus:outline-none"
                        >
                          <Search className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Search Button */}
                    <Button
                      type="submit"
                      disabled={searchLoading || !searchMatricule.trim()}
                      className="w-full h-12 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none"
                    >
                      {searchLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Recherche en cours...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          <span>Rechercher par matricule</span>
                        </div>
                      )}
                    </Button>
                  </>
                )}

                {/* Separator - Only show when matricule search is available */}
                {selectedExamType !== "CONCOURS" && (
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <span className="text-sm text-gray-500 font-medium">OU</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                )}

                {/* Wilaya Selection */}
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                    <div className="relative">
                      <Select
                        value={selectedWilaya}
                        onValueChange={handleWilayaSelect}
                      >
                        <SelectTrigger className="w-full h-12 sm:h-14 border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-sm sm:text-base bg-white rounded-xl shadow-lg transition-all duration-300">
                          <SelectValue placeholder="Choisir une wilaya..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                          {Object.keys(wilayaData)
                            ?.sort()
                            .map((wilaya) => (
                              <SelectItem
                                key={wilaya}
                                value={wilaya}
                                className="py-3 px-4"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-sm sm:text-base font-medium truncate mr-2">
                                    {wilaya}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-blue-100 text-blue-700 flex-shrink-0"
                                  >
                                    {wilayaData[wilaya].length}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Establishment Selection */}
                  {selectedWilaya && (
                    <div className="relative group animate-fade-in">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Select
                          value={selectedEstablishment}
                          onValueChange={handleEstablishmentSelect}
                        >
                          <SelectTrigger className="w-full h-12 sm:h-14 border-2 border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none text-sm sm:text-base bg-white rounded-xl shadow-lg transition-all duration-300">
                            <SelectValue placeholder="Choisir un établissement..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                            {wilayaData[selectedWilaya]?.map(
                              (establishment) => (
                                <SelectItem
                                  key={establishment}
                                  value={establishment}
                                  className="text-sm sm:text-base font-medium py-3 px-4"
                                >
                                  <span
                                    className="truncate"
                                    title={establishment}
                                  >
                                    {establishment}
                                  </span>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section with Touch Support */}
        <div id="leaderboard-section" className="mb-6 sm:mb-8 md:mb-12">
          {/* ENHANCED BEAUTIFUL MODERN TITLE */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 md:mb-12">
            <div className="relative">
              {/* Main title container */}
              <div className="relative bg-white rounded-2xl px-6 sm:px-8 md:px-12 py-4 sm:py-6 md:py-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-center">
                  {/* Animated trophy icon */}
                  <div className="relative mr-4 sm:mr-6">
                    <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 rounded-full p-3 sm:p-4 shadow-sm">
                      <Trophy
                        className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white drop-shadow-lg animate-bounce"
                        style={{ animationDuration: "2s" }}
                      />
                    </div>
                  </div>

                  {/* Title text with gradient */}
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent leading-tight">
                      {selectedExamType === "BAC"
                        ? `Top 10 par Section`
                        : `Top 10 en Mauritanie`}
                    </h2>
                    <div className="mt-2 sm:mt-3">
                      <div className="h-1 sm:h-1.5 w-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full"></div>
                      <div className="mt-1 text-sm sm:text-base md:text-lg font-bold text-gray-600">
                        {isHydrated
                          ? `${selectedExamType} ${selectedYear}`
                          : `BAC ${defaultYear}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-2 right-2 w-4 h-4 sm:w-6 sm:h-6 bg-blue-400 rounded-full opacity-60 animate-ping"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full opacity-40 animate-pulse"></div>
                <div className="absolute top-1/2 right-4 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full opacity-50 animate-bounce"></div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-sm sm:text-base">
                Chargement du classement...
              </p>
            </div>
          ) : noDataMessage ? (
            <div className="text-center py-12">
              <Card className="max-w-2xl mx-auto shadow-xl border-blue-200">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                      Information
                    </h3>
                    <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                      {noDataMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : // Ajouter un bouton de rafraîchissement dans la section des erreurs
          error ? (
            <div className="text-center py-12">
              <Card className="max-w-md mx-auto shadow-xl border-blue-200">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Aucune donnée disponible
                    </h3>
                    <p className="text-gray-600 text-center text-sm sm:text-base mb-4">
                      {error}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={fetchLeaderboard}
                        variant="outline"
                        className="text-sm sm:text-base bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualiser
                      </Button>
                      <Button
                        onClick={() => {
                          fetchLeaderboard();
                          fetchStatistics();
                          fetchWilayaData();
                        }}
                        className="text-sm sm:text-base bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tout Actualiser
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : availableSections.length === 0 ? (
            <div className="text-center py-12">
              <Card className="max-w-md mx-auto shadow-xl border-blue-200">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Aucune donnée disponible
                    </h3>
                    <p className="text-gray-600 text-center text-sm sm:text-base mb-4">
                      Il n'y a rien pour le moment pour {selectedExamType}{" "}
                      {selectedYear}
                    </p>
                    <Button
                      onClick={fetchLeaderboard}
                      variant="outline"
                      className="text-sm sm:text-base bg-transparent border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      Réessayer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Slider Container with Touch Support */}
              <div
                className="relative"
                ref={sliderRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Navigation Buttons - Desktop (only show for BAC with multiple sections) */}
                {selectedExamType === "BAC" && availableSections.length > 1 && (
                  <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-0 right-0 justify-between pointer-events-none z-10">
                    <Button
                      onClick={prevSlide}
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto -ml-4 bg-white/90 hover:bg-white border-blue-300 text-blue-600 shadow-lg focus:outline-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={nextSlide}
                      variant="outline"
                      size="sm"
                      className="pointer-events-auto -mr-4 bg-white/90 hover:bg-white border-blue-300 text-blue-600 shadow-lg focus:outline-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Section Indicator (only show for BAC with multiple sections) */}
                {selectedExamType === "BAC" && availableSections.length > 1 && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-white rounded-lg shadow-lg px-3 sm:px-4 py-2 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="text-xs sm:text-base font-semibold text-blue-600">
                          {getSectionDisplayName(currentSection)}
                        </div>
                        {/* Section Stats */}

                        <div className="flex gap-1">
                          {availableSections.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => goToSlide(index)}
                              className={`w-2 h-2 rounded-full transition-all duration-300 focus:outline-none ${
                                index === currentSlideIndex
                                  ? "bg-blue-500"
                                  : "bg-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        {/* Removed "Voir Tous" button */}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Swipe Instruction (only show for BAC with multiple sections) */}
                {selectedExamType === "BAC" && availableSections.length > 1 && (
                  <div className="sm:hidden text-center mb-3">
                    <p className="text-xs text-gray-500">
                      👈 Glissez pour naviguer 👉
                    </p>
                  </div>
                )}

                {/* Slider Content */}
                <Card className="shadow-lg border-blue-200 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-6">
                    <CardTitle className="flex items-center justify-between text-base sm:text-xl">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        <span className="truncate">
                          {getSectionDisplayName(currentSection)}
                        </span>
                      </div>
                      {selectedExamType === "BAC" &&
                        availableSections.length > 1 && (
                          <div className="flex items-center gap-2 text-sm">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isAutoSliding
                                  ? "bg-blue-200 animate-pulse"
                                  : "bg-blue-300"
                              }`}
                            />
                            <span className="text-blue-100 text-xs sm:text-sm hidden sm:inline">
                              {isAutoSliding ? "Auto" : "Manuel"}
                            </span>
                          </div>
                        )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    <div
                      className="transition-all duration-500 ease-in-out"
                      key={currentSection} // Force re-render for animation
                    >
                      <div className="grid gap-2 sm:gap-3">
                        {Array.isArray(currentSectionData) &&
                        currentSectionData.length > 0 ? (
                          currentSectionData.map((student, index) => (
                            <div
                              key={student.matricule}
                              className="flex items-center justify-between p-2 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm animate-fade-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                <Badge
                                  className={`${getRankBadgeColor(
                                    index + 1
                                  )} text-white transition-colors text-xs sm:text-sm flex-shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-1`}
                                >
                                  {index + 1}
                                </Badge>
                                <div className="min-w-0 flex-1">
                                  <button
                                    onClick={() => {
                                      const params = new URLSearchParams({
                                        matricule: student.matricule,
                                        year: selectedYear.toString(),
                                        examType: selectedExamType,
                                        returnTo: "/"
                                      });
                                      
                                      // For BAC exams, session type is mandatory
                                      if (selectedExamType === "BAC") {
                                        // If no session type is selected, default to NORMALE
                                        const sessionType = selectedSessionType || "NORMALE";
                                        params.append("sessionType", sessionType);
                                      }
                                      
                                      // For CONCOURS exams, add comprehensive location-based search parameters
                                      if (selectedExamType === "CONCOURS") {
                                        params.append("directClick", "true");
                                        params.append("schoolName", student.etablissement || "");
                                        params.append("studentName", student.nom_complet);
                                        params.append("wilaya", student.wilaya || "");
                                        params.append("moughataa", student.moughataa || "");
                                      }
                                      
                                      router.push(`/results?${params.toString()}`);
                                    }}
                                    className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left text-xs sm:text-base block w-full break-words leading-tight focus:outline-none"
                                    title={student.nom_complet} // Show full name on hover
                                  >
                                    {student.nom_complet}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleEstablishmentClick(
                                        student.etablissement,
                                        student.wilaya
                                      )
                                    }
                                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors block w-full text-left break-words leading-tight focus:outline-none"
                                    title={student.etablissement} // Show full establishment name on hover
                                  >
                                    {student.etablissement}
                                  </button>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2 flex flex-col items-center">
                                <p className="font-bold text-xs sm:text-lg text-blue-600 mb-1">
                                  {student.moyenne
                                    ? student.moyenne.toFixed(2)
                                    : "0.00"}
                                </p>
                                <Badge
                                  variant={getDecisionBadgeVariant(
                                    student.decision_text
                                  )}
                                  className="text-xs"
                                >
                                  {student.decision_text}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm sm:text-base">
                              {selectedExamType === "BAC"
                                ? "Aucun étudiant trouvé dans cette section"
                                : "Aucun étudiant trouvé"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Auto-slide Progress Bar (only for BAC with multiple sections) */}
                {selectedExamType === "BAC" &&
                  availableSections.length > 1 &&
                  isAutoSliding && (
                    <div className="mt-2 bg-gray-200 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-15000 ease-linear"
                        style={{
                          width: "100%",
                          animation: "progress 15s linear infinite",
                        }}
                      />
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* APP DOWNLOAD & SOCIAL MEDIA SECTION */}

        {/* PROFESSIONAL STATISTICS SECTION WITH EYE-CATCHING COLORS - HIDE CERTAIN STATS FOR BREVET */}
        {statistics && !statistics.message && (
          <div className="mb-6 sm:mb-8">
            {/* Update the statistics section title to be more modern and beautiful */}
            <div className="flex items-center justify-center mb-6 sm:mb-8 md:mb-12">
              <div className="relative">
                <div className="relative bg-white rounded-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4 border border-gray-100">
                  <div className="flex items-center">
                    <div className="relative mr-3 sm:mr-4">
                      <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent">
                        Statistiques Générales
                      </h2>
                      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ENHANCED MAIN STATISTICS WITH VIBRANT COLORS - CONDITIONAL FOR BREVET */}
            <div
              className={`grid gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-6 sm:mb-8 md:mb-12 ${
                selectedExamType === "BREVET"
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {/* Total Students - Vibrant Blue */}
              <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                      <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                      Total Étudiants
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                      {statistics?.totalStudents?.toLocaleString() || "0"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Admitted Students - Vibrant Green */}
              <Card className="border-0 bg-gradient-to-br from-blue-400 to-blue-500 text-white transform hover:scale-105 transition-all duration-300">
                <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                      <Star className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                      Étudiants Admis
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                      {statistics?.admittedStudents?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-200 font-medium">
                      ({statistics?.admissionRate || "0"}%)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Average Score - Vibrant Purple - HIDE FOR BREVET */}
              {selectedExamType !== "BREVET" && (
                <Card className="border-0 bg-gradient-to-br from-blue-600 to-blue-700 text-white transform hover:scale-105 transition-all duration-300">
                  <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                        <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                        Moyenne Générale
                      </p>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                        {statistics.averageScore}
                      </p>
                      <p className="text-xs sm:text-sm text-blue-200 font-medium">
                        /20
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success Rate - Vibrant Orange - HIDE FOR BREVET, CONCOURS, AND BAC COMPLEMENTAIRE */}
              {selectedExamType !== "BREVET" && 
               selectedExamType !== "CONCOURS" && 
               selectedExamType !== "EXCELLENCE" && 
               !(selectedExamType === "BAC" && selectedSessionType === "COMPLEMENTAIRE") && (
                <Card className="border-0 bg-gradient-to-br from-blue-300 to-blue-400 text-white transform hover:scale-105 transition-all duration-300">
                  <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full -ml-6 sm:-ml-8 -mb-6 sm:-mb-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                        <Target className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white drop-shadow-lg" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-blue-100">
                        Taux Sessionnaires
                      </p>
                      <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">
                        {statistics.sessionnaireRate}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section and Wilaya Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Section Statistics (HIDE FOR BREVET AND CONCOURS) */}
              {selectedExamType === "BAC" && (
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-50">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white p-3 sm:p-4 md:p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
                    <CardTitle className="flex items-center text-base sm:text-lg md:text-xl relative z-10">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3 drop-shadow-lg" />
                      Statistiques par Section
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                      {statistics.sectionStats
                        ?.filter(
                          (stat) =>
                            stat.name !== "Sciences" && stat.name !== "sn"
                        )
                        .map((stat, index) => (
                          <div
                            key={stat.name}
                            className="flex items-center justify-between p-2 sm:p-3 md:p-4 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-blue-100"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div>
                              <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">
                                {getSectionDisplayName(stat.name)}
                              </p>
                              <p className="text-xs sm:text-sm text-blue-600 font-medium">
                                {stat.admitted}/{stat.total} admis
                              </p>
                            </div>
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-500 text-white border-0 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1">
                              {stat.rate}%
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Wilaya Statistics - UPDATED COLOR AND SORTED BY PERCENTAGE */}
              <Card
                className={`border-0 bg-gradient-to-br from-blue-50 to-blue-50 ${
                  selectedExamType === "BREVET" || selectedExamType === "CONCOURS" || selectedExamType === "EXCELLENCE" ? "lg:col-span-2" : ""
                }`}
              >
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white p-3 sm:p-4 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16"></div>
                  <CardTitle className="flex items-center text-base sm:text-lg md:text-xl relative z-10">
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 sm:mr-3 drop-shadow-lg" />
                    Statistiques par Wilaya
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="space-y-2 sm:space-y-3 md:space-y-4">
                    {statistics.wilayaStats
                      ?.sort(
                        (a, b) =>
                          Number.parseFloat(b.rate) - Number.parseFloat(a.rate)
                      ) // Sort by percentage (high to low)
                      .map((stat, index) => (
                        <button
                          key={stat.name}
                          onClick={() => handleWilayaClick(stat.name)}
                          className="w-full flex items-center justify-between p-2 sm:p-3 md:p-4 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-blue-100 hover:from-blue-50 hover:to-blue-50 hover:border-blue-300 focus:outline-none"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="text-left">
                            <p className="font-bold text-gray-800 text-xs sm:text-sm md:text-base">
                              {stat.name}
                            </p>
                            <p className="text-xs sm:text-sm text-blue-600 font-medium">
                              {stat.admitted}/{stat.total} admis
                            </p>
                          </div>
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-500 text-white border-0 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1">
                            {stat.rate}%
                          </Badge>
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Enhanced Statistics Section */}
        {enhancedStats && enhancedStats.success && (
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-6 sm:mb-8 md:mb-12">
              <div className="relative">
                <div className="relative bg-white rounded-xl px-4 sm:px-6 md:px-8 py-3 sm:py-4 border border-gray-100">
                  <div className="flex items-center">
                    <div className="relative mr-3 sm:mr-4">
                      <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-blue-600 bg-clip-text text-transparent">
                        Statistiques Avancées
                      </h2>
                      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* School Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              {/* Top 5 Schools */}
              <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2" />
                    Top 5 des établissements les plus réussis
                  </CardTitle>
                  <p className="text-xs text-green-100 mt-1">
                    (Écoles avec plus de 30 étudiants)
                  </p>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="space-y-3">
                    {enhancedStats.schoolStats.top5Schools.map((school: any, index: number) => (
                      <div
                        key={school.name}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-green-500 text-white">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">
                              {school.name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {school.admittedStudents}/{school.totalStudents} admis
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm sm:text-base">
                            {school.successRate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            Moy: {school.averageScore.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bottom 5 Schools */}
              <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100">
                <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white p-3 sm:p-4 md:p-6">
                  <CardTitle className="flex items-center text-base sm:text-lg md:text-xl">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2" />
                    Les 5 écoles les moins performantes
                  </CardTitle>
                  <p className="text-xs text-red-100 mt-1">
                    (Écoles avec plus de 30 étudiants)
                  </p>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="space-y-3">
                    {enhancedStats.schoolStats.bottom5Schools.map((school: any, index: number) => (
                      <div
                        key={school.name}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge className="bg-red-500 text-white">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm sm:text-base">
                              {school.name}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {school.admittedStudents}/{school.totalStudents} admis
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 text-sm sm:text-base">
                            {school.successRate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            Moy: {school.averageScore.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>


          </div>
        )}

        {/* Show special message if statistics has message */}
        {statistics && statistics.message && (
          <div className="text-center py-12">
            <Card className="max-w-2xl mx-auto border-blue-200">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    Information
                  </h3>
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    {statistics.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* App Download Section */}
      <div className="py-8 sm:py-12 mt-6 sm:mt-8 bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-blue-50/20 transform -skew-y-6"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)] animate-pulse"></div>
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-block mb-4 relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 animate-float" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4.41l6.19-6.19-1.41-1.41-6.19 6.19V7h-2v10h8v-2z" fill="currentColor"/>
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-3 sm:mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Rejoignez Medrasti dès maintenant
            </h3>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              Accédez à des centaines de cours gratuits et suivez votre progression en temps réel !
            </p>
          </div>
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-6 max-w-lg mx-auto bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-100/50">
            {/* App Store Button */}
            <a
              href="https://apps.apple.com/eg/app/%D9%85%D8%AF%D8%B1%D8%B3%D8%AA%D9%8A-medrasti/id6741432147"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center flex-1 sm:flex-auto hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              <img src="/AppStore.svg" alt="Download on App Store" className="h-12 sm:h-14 w-full max-w-[140px] sm:max-w-[200px] rounded-xl" />
            </a>

            {/* Google Play Button */}
            <a
              href="https://play.google.com/store/apps/details?id=com.nzamk.madrasty&hl=fr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center flex-1 sm:flex-auto hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              <img src="/GooglePlay.svg" alt="Get it on Google Play" className="h-12 sm:h-14 w-full max-w-[140px] sm:max-w-[200px] rounded-xl" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm sm:text-base font-medium">
            © 2025 Medrasti. Tous droits réservés.
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0%);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #1d4ed8);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #1e40af);
        }
      `}</style>
    </div>
  );
}
