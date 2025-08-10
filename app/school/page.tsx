"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Filter,
  Building,
  Trophy,
  Medal,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  rang_etablissement?: number;
}

// Add request cache to avoid duplicate API calls
const requestCache = new Map<string, Promise<any>>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

function getCachedRequest(url: string): Promise<any> {
  if (requestCache.has(url)) {
    return requestCache.get(url)!;
  }

  const request = fetch(url).then(async (response) => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  });

  requestCache.set(url, request);

  // Clear cache after duration
  setTimeout(() => {
    requestCache.delete(url);
  }, CACHE_DURATION);

  return request;
}

export default function SchoolPage() {
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const schoolName = searchParams.get("name");
  const year = searchParams.get("year") || "2024";
  const examType = (searchParams.get("examType") as "BAC" | "BREVET") || "BAC";
  const sessionType = searchParams.get("sessionType");
  const wilaya = searchParams.get("wilaya");

  useEffect(() => {
    if (schoolName) {
      fetchSchoolStudents(schoolName);
    }
  }, [schoolName, examType, year, sessionType, wilaya]);

  useEffect(() => {
    if (selectedSection === "all") {
      setFilteredStudents(allStudents);
    } else {
      setFilteredStudents(
        allStudents?.filter((student) => student.section === selectedSection)
      );
    }
  }, [selectedSection, allStudents]);

  const fetchSchoolStudents = async (schoolName: string) => {
    try {
      setLoading(true);
      let url = `/api/school?name=${encodeURIComponent(
        schoolName
      )}&examType=${examType}&year=${year}`;
      
      // Add session type parameter if it exists
      if (sessionType) {
        url += `&sessionType=${sessionType}`;
      }

      // Add wilaya parameter if it exists
      if (wilaya) {
        url += `&wilaya=${encodeURIComponent(wilaya)}`;
      }

      // Use cached request
      const data = await getCachedRequest(url);
      setAllStudents(data);
      setFilteredStudents(data);
      setError("");
    } catch (error) {
      console.error("Error fetching school students:", error);
      setError("Établissement non trouvé pour cette année");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />; // 1st place
    if (index === 1) return <Medal className="h-3 w-3 sm:h-4 sm:w-4" />; // 2nd place
    if (index === 2) return <Award className="h-3 w-3 sm:h-4 sm:w-4" />; // 3rd place
    return null; // No icon for others
  };

  const getCardBackground = (index: number) => {
    if (index === 0) return "from-yellow-50 to-yellow-100 border-yellow-300"; // 1st place
    if (index === 1) return "from-gray-50 to-gray-100 border-gray-300"; // 2nd place
    if (index === 2) return "from-amber-50 to-amber-100 border-amber-300"; // 3rd place
    return "from-gray-50 to-gray-100 border-gray-200"; // Others
  };

  const getRankBadgeColor = (index: number) => {
    if (index === 0) return "bg-yellow-500 text-white"; // 1st place - Gold
    if (index === 1) return "bg-gray-400 text-white"; // 2nd place - Silver
    if (index === 2) return "bg-amber-600 text-white"; // 3rd place - Bronze
    return "bg-blue-500 text-white"; // Others
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
      return "secondary"; // Will be styled as orange
    }
    return "destructive";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">
            Chargement des étudiants de l'établissement...
          </p>
        </div>
      </div>
    );
  }

  if (error || !allStudents.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-red-600 text-lg sm:text-xl">
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4 text-sm sm:text-base">
              {error || "Aucun étudiant trouvé"}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const admittedCount = filteredStudents?.filter((s) => s.admis).length;
  const averageScore =
    filteredStudents.length > 0
      ? filteredStudents.reduce((sum, s) => sum + s.moyenne, 0) /
        filteredStudents.length
      : 0;

  // Include year and examType in the current URL for proper return navigation
  const currentUrl = `/school?name=${encodeURIComponent(
    schoolName || ""
  )}&year=${year}&examType=${examType}`;

  // Get unique sections from all students
  const availableSections = [
    ...new Set(allStudents.map((s) => s.section)),
  ]?.sort();

  const handleStudentClick = (student: Student) => {
    const params = new URLSearchParams({
      matricule: student.matricule,
      year: year.toString(),
      examType,
      returnTo: currentUrl
    });
    
    // For BAC exams, session type is mandatory
    if (examType === "BAC") {
      // If no session type is available, default to NORMALE
      const finalSessionType = sessionType || "NORMALE";
      params.append("sessionType", finalSessionType);
    }
    
    // For CONCOURS exams, use location-based search (wilaya + moughataa + etablissement)
    if (examType === "CONCOURS") {
      params.append("directClick", "true");
      params.append("schoolName", schoolName || "");
      params.append("studentName", student.nom_complet);
      params.append("wilaya", student.wilaya || "");
      params.append("moughataa", student.moughataa || "");
    }
    
    router.push(`/results?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 text-sm sm:text-base"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Retour à l'accueil</span>
            <span className="xs:hidden">Retour</span>
          </Button>
        </div>

        {/* Header - More compact on mobile */}
        <Card className="shadow-lg border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-t-lg p-3 sm:p-6">
            <CardTitle className="flex items-start sm:items-center text-base sm:text-xl lg:text-2xl">
              <Building className="h-4 w-4 sm:h-6 sm:w-6 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="break-words leading-tight">{schoolName}</span>
                <span className="text-sm font-normal opacity-90">
                  {examType} {year}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Statistics Grid - Responsive */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">
                  Total
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                  {filteredStudents.length}
                </p>
              </div>
              <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">
                  Admis
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                  {admittedCount}
                </p>
              </div>
              <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">
                  Taux
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                  {filteredStudents.length > 0
                    ? ((admittedCount / filteredStudents.length) * 100).toFixed(
                        1
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">
                  Moyenne
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                  {averageScore ? averageScore.toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Filter - More compact on mobile */}
        <Card className="shadow-lg border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-6">
            <CardTitle className="flex items-center text-base sm:text-xl">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Filtrer par Section
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
              >
                <SelectTrigger className="w-full sm:w-64 border-blue-300 focus:border-blue-500 text-sm sm:text-base">
                  <SelectValue placeholder="Choisir une section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sections</SelectItem>
                  {availableSections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs sm:text-sm text-gray-600">
                {selectedSection === "all"
                  ? `${allStudents.length} étudiants au total`
                  : `${filteredStudents.length} étudiants en ${selectedSection}`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List - Fully responsive with FULL NAMES */}
        <Card className="shadow-lg border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-6">
            <CardTitle className="flex items-center text-base sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="truncate">Classement des Étudiants</span>
              {selectedSection !== "all" && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-white text-blue-600 text-xs hidden sm:inline-flex"
                >
                  {selectedSection}
                </Badge>
              )}
            </CardTitle>
            {selectedSection !== "all" && (
              <div className="sm:hidden mt-2">
                <Badge
                  variant="secondary"
                  className="bg-white text-blue-600 text-xs"
                >
                  {selectedSection}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="space-y-2 sm:space-y-3">
              {filteredStudents.map((student, index) => (
                <div
                  key={student.matricule}
                  className={`flex items-center justify-between p-2 sm:p-4 bg-gradient-to-r ${getCardBackground(
                    index
                  )} rounded-lg hover:scale-[1.02] transition-all duration-200 shadow-sm border ${
                    index < 3 ? "shadow-md top-rank-shimmer" : ""
                  } ${
                    index === 0 ? "ring-2 ring-yellow-300 top-rank-glow" : ""
                  }`}
                >
                  {/* Left side - Rank and Student Info */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    <Badge
                      className={`${getRankBadgeColor(
                        index
                      )} flex-shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-bold flex items-center gap-1`}
                    >
                      {getRankIcon(index)}
                      {index + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => handleStudentClick(student)}
                        className={`font-semibold hover:underline transition-colors text-left text-xs sm:text-base block w-full break-words leading-tight ${
                          index < 3
                            ? "text-gray-800 hover:text-blue-700 font-bold"
                            : "text-gray-900 hover:text-blue-600"
                        }`}
                        title={student.nom_complet}
                      >
                        {student.nom_complet}
                      </button>
                      <p className="text-xs text-gray-600 break-words leading-tight">
                        {student.section}
                      </p>
                    </div>
                  </div>

                  {/* Right side - Score and Decision - CENTERED */}
                  <div className="text-right flex-shrink-0 ml-2 flex flex-col items-center">
                    <p className="font-bold text-sm sm:text-lg text-blue-600 mb-1">
                      {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}
                    </p>
                    <Badge
                      variant={getDecisionBadgeVariant(student.decision_text)}
                      className={`text-xs ${
                        student.decision_text
                          ?.toLowerCase()
                          ?.includes("sessionnaire")
                          ? "badge-sessionnaire"
                          : ""
                      }`}
                    >
                      {student.decision_text}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
