"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
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
  moughataa?: string;
  rang_etablissement?: number;
  year: number;
  examType: "BAC" | "BREVET" | "CONCOURS" | "EXCELLENCE";
}

interface WilayaData {
  students: Student[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  admittedCount: number;
  averageScore: number;
  sections: string[];
}

const STUDENTS_PER_PAGE = 50;

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

export default function WilayaPage() {
  const [wilayaData, setWilayaData] = useState<WilayaData | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const wilayaName = searchParams.get("name");
  const year = searchParams.get("year") || "2024";
  const examType = searchParams.get("examType") || "BAC";
  const sessionType = searchParams.get("sessionType");

  useEffect(() => {
    if (wilayaName) {
      fetchWilayaStudents(wilayaName, 1, selectedSection);
    }
  }, [wilayaName, year, examType, selectedSection, sessionType]);

  const fetchWilayaStudents = async (
    wilayaName: string,
    page: number,
    section: string
  ) => {
    setLoading(true);
    try {
      let url = `/api/wilaya-students?name=${encodeURIComponent(
        wilayaName
      )}&year=${year}&examType=${examType}&page=${page}&limit=${STUDENTS_PER_PAGE}&section=${section}`;
      
      // Add session type parameter if it exists
      if (sessionType) {
        url += `&sessionType=${sessionType}`;
      }

      // Use cached request
      const data = await getCachedRequest(url);
      setWilayaData(data);
      setCurrentPage(page);
      setError("");
    } catch (error) {
      console.error("Error fetching wilaya students:", error);
      setError("Wilaya non trouvée");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (wilayaName) {
      fetchWilayaStudents(wilayaName, page, selectedSection);
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500";
    if (rank === 2) return "bg-gray-400";
    if (rank === 3) return "bg-amber-600";
    return "bg-blue-500";
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

  const handleEstablishmentClick = (establishment: string) => {
    let url = `/school?name=${encodeURIComponent(
      establishment
    )}&year=${year}&examType=${examType}`;
    
    // Add session type parameter if it exists
    if (sessionType) {
      url += `&sessionType=${sessionType}`;
    }
    
    // Add wilaya parameter if it exists
    if (wilayaName) {
      url += `&wilaya=${encodeURIComponent(wilayaName)}`;
    }
    
    router.push(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">
            Chargement des étudiants de la wilaya...
          </p>
        </div>
      </div>
    );
  }

  if (error || !wilayaData) {
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

  // CORRIGER L'URL DE RETOUR POUR INCLURE TOUS LES PARAMÈTRES
  const currentUrl = `/wilaya?name=${encodeURIComponent(
    wilayaName || ""
  )}&year=${year}&examType=${examType}&page=${currentPage}&section=${selectedSection}`;
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

        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header - More compact on mobile */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-3 sm:p-6">
              <CardTitle className="flex items-start sm:items-center text-base sm:text-xl lg:text-2xl">
                <MapPin className="h-4 w-4 sm:h-6 sm:w-6 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                <span className="break-words leading-tight">
                  Wilaya: {wilayaName} - {examType} {year}
                </span>
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
                    {wilayaData.totalCount}
                  </p>
                </div>
                <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">
                    Admis
                  </p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                    {wilayaData.admittedCount}
                  </p>
                </div>
                <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">
                    Taux
                  </p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                    {wilayaData.totalCount > 0
                      ? (
                          (wilayaData.admittedCount / wilayaData.totalCount) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div className="bg-blue-50 p-2 sm:p-4 rounded-lg border border-blue-200">
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">
                    Moyenne
                  </p>
                  <p className="text-base sm:text-xl lg:text-2xl font-bold text-blue-700">
                    {wilayaData.averageScore
                      ? wilayaData.averageScore.toFixed(2)
                      : "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Filter - More compact on mobile */}
          {examType === "BAC" && wilayaData.sections.length > 1 && (
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
                    onValueChange={handleSectionChange}
                  >
                    <SelectTrigger className="w-full sm:w-64 border-blue-300 focus:border-blue-500 text-sm sm:text-base">
                      <SelectValue placeholder="Choisir une section..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les sections</SelectItem>
                      {wilayaData.sections.map((section) => (
                        <SelectItem key={section} value={section}>
                          {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Affichage de {wilayaData.students.length} étudiants sur{" "}
                    {wilayaData.totalCount}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students List - Fully responsive with FULL NAMES */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-xl">
                <div className="flex items-center min-w-0 flex-1">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">Étudiants de {wilayaName}</span>
                  {selectedSection !== "all" && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-white text-blue-600 text-xs hidden sm:inline-flex"
                    >
                      {selectedSection}
                    </Badge>
                  )}
                </div>
                <div className="text-xs sm:text-sm flex-shrink-0 ml-2">
                  Page {currentPage} sur {wilayaData.totalPages}
                </div>
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
                {wilayaData.students.map((student, index) => (
                  <div
                    key={student.matricule}
                    className="flex items-center justify-between p-2 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 shadow-sm border border-gray-200"
                  >
                    {/* Left side - Rank and Student Info */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <Badge
                        className={`${getRankBadgeColor(
                          (currentPage - 1) * STUDENTS_PER_PAGE + index + 1
                        )} text-white text-xs flex-shrink-0 px-1.5 py-0.5 sm:px-2 sm:py-1`}
                      >
                        {(currentPage - 1) * STUDENTS_PER_PAGE + index + 1}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => {
                            const params = new URLSearchParams({
                              matricule: student.matricule,
                              year,
                              examType,
                              returnTo: currentUrl
                            });
                            
                            // For BAC exams, session type is mandatory
                            if (examType === "BAC") {
                              // If no session type is available, default to NORMALE
                              const finalSessionType = sessionType || "NORMALE";
                              params.append("sessionType", finalSessionType);
                            }
                            
                                  // For CONCOURS exams, add comprehensive location-based search parameters
      if (examType === "CONCOURS") {
        params.append("directClick", "true");
        params.append("schoolName", student.etablissement || "");
        params.append("studentName", student.nom_complet);
        params.append("wilaya", student.wilaya || "");
        params.append("moughataa", student.moughataa || "");
      }
                            
                            router.push(`/results?${params.toString()}`);
                          }}
                          className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left text-xs sm:text-base block w-full break-words leading-tight"
                          title={student.nom_complet}
                        >
                          {student.nom_complet}
                        </button>
                        <button
                          onClick={() =>
                            handleEstablishmentClick(student.etablissement)
                          }
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors block w-full text-left break-words leading-tight"
                          title={student.etablissement}
                        >
                          {student.etablissement}
                        </button>
                        <p className="text-xs text-gray-600 break-words leading-tight">
                          {student.section}
                        </p>
                      </div>
                    </div>

                    {/* Right side - Score and Decision - CENTERED */}
                    <div className="text-right flex-shrink-0 ml-2 flex flex-col items-center">
                      <p className="font-bold text-sm sm:text-lg text-blue-600">
                        {student.moyenne ? student.moyenne.toFixed(2) : "0.00"}
                      </p>
                      <Badge
                        variant={student.admis ? "default" : "destructive"}
                        className="text-xs mt-1"
                      >
                        {student.admis ? "Admis Sn" : "Ajourné Sn"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination - Mobile-friendly */}
              {wilayaData.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
                  {/* Mobile: Simple Previous/Next */}
                  <div className="flex items-center gap-2 sm:hidden">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <ChevronLeft className="h-3 w-3 mr-1" />
                      Précédent
                    </Button>
                    <span className="text-xs text-gray-600 px-2">
                      {currentPage}/{wilayaData.totalPages}
                    </span>
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === wilayaData.totalPages}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Suivant
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  {/* Desktop: Full pagination */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, wilayaData.totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (wilayaData.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= wilayaData.totalPages - 2) {
                            pageNum = wilayaData.totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === wilayaData.totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
