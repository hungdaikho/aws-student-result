"use client";

import { CardDescription } from "@/components/ui/card";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Trophy,
  CheckCircle,
  XCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress } from "@/components/circular-progress";

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
  year?: number;
  examType?: "BAC" | "BREVET" | "CONCOURS";
}

interface Rankings {
  matricule: string;
  moyenne: number;
  section?: string;
  etablissement: string;
  // For BAC
  schoolRank?: number;
  totalInSchool?: number;
  // For BREVET
  generalRank?: number;
  totalStudents?: number;
  // For all exam types
  wilayaRank?: number;
  totalInWilaya?: number;
}

// Add request cache to avoid duplicate API calls
interface CacheEntry {
  promise: Promise<any>;
  timestamp: number;
  data?: any;
}

const requestCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

function getCachedRequest(url: string): Promise<any> {
  const now = Date.now();
  const cached = requestCache.get(url);

  // Return cached data if it exists and is still valid
  if (cached) {
    if (now - cached.timestamp < CACHE_DURATION) {
      if (cached.data) {
        return Promise.resolve(cached.data);
      }
      return cached.promise.then(data => {
        cached.data = data;
        return data;
      });
    }
    // Remove expired cache entry
    requestCache.delete(url);
  }

  // Create new request
  const promise = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const entry = requestCache.get(url);
      if (entry) {
        entry.data = data;
      }
      return data;
    });

  // Store in cache
  requestCache.set(url, {
    promise,
    timestamp: now,
  });

  return promise;
}

export default function ResultsPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const matricule = searchParams.get("matricule");
  const returnTo = searchParams.get("returnTo");
  const year = searchParams.get("year") || "2024";
  const examType = (searchParams.get("examType") as "BAC" | "BREVET" | "CONCOURS") || "BAC";
  const sessionType = searchParams.get("sessionType");

  // Handle window size detection safely
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (matricule) {
      fetchStudentResult(matricule);
    }
  }, [matricule]);

  const fetchStudentResult = async (matricule: string) => {
    try {
      setLoading(true);
      
      // Build search URL with all necessary parameters
      const searchParams = new URLSearchParams({
        matricule: matricule,
        year: year,
        examType: examType
      });
      
      // Include session type for BAC exams
      if (examType === "BAC" && sessionType) {
        searchParams.append("sessionType", sessionType);
      }
      
      // For CONCOURS exams, add directClick parameter and location info
      if (examType === "CONCOURS") {
        searchParams.append("directClick", "true");
        // Read all location parameters from the initial page URL
        const currentUrl = new URL(window.location.href);
        const schoolName = currentUrl.searchParams.get("schoolName");
        const studentName = currentUrl.searchParams.get("studentName");
        const wilaya = currentUrl.searchParams.get("wilaya");
        const moughataa = currentUrl.searchParams.get("moughataa");

        if (schoolName) searchParams.append("schoolName", schoolName);
        if (studentName) searchParams.append("studentName", studentName);
        if (wilaya) searchParams.append("wilaya", wilaya);
        if (moughataa) searchParams.append("moughataa", moughataa);
      }
      
      const studentUrl = `/api/search?${searchParams.toString()}`;

      // Prepare both requests
      const requests = [getCachedRequest(studentUrl)];

      // Add ranking request for non-CONCOURS exams
      if (examType !== "CONCOURS") {
        const rankingParams = new URLSearchParams({
          matricule: matricule,
          year: year,
          examType: examType
        });
        
        if (examType === "BAC" && sessionType) {
          rankingParams.append("sessionType", sessionType);
        }
        
        const rankingUrl = `/api/ranking?${rankingParams.toString()}`;
        requests.push(getCachedRequest(rankingUrl));
      }

      // Fetch data in parallel
      const [studentData, rankingData] = await Promise.all(requests);
      
      setStudent(studentData);
      setRankings(examType !== "CONCOURS" ? rankingData : null);
      setError("");
    } catch (error) {
      console.error("Error fetching student:", error);
      setError("Étudiant non trouvé");
      setStudent(null);
      setRankings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
    } else {
      router.push("/");
    }
  };

  const handleEstablishmentClick = (etablissement: string) => {
    const params = new URLSearchParams({
      name: etablissement,
      year: year,
      examType: examType
    });
    
    // Include session type for BAC exams
    if (examType === "BAC" && sessionType) {
      params.append("sessionType", sessionType);
    }
    
    // Include wilaya if available from student data
    if (student?.wilaya) {
      params.append("wilaya", student.wilaya);
    }
    
    router.push(`/school?${params.toString()}`);
  };

  const getDecisionIcon = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (
      decision?.includes("admis") ||
      decision?.includes("reussi") ||
      decision === "r"
    ) {
      return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
    } else if (
      decision?.includes("sessionnaire") ||
      decision?.includes("sessionn")
    ) {
      return <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />;
    }
    return <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />;
  };

  const getDecisionTextColor = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (
      decision?.includes("admis") ||
      decision?.includes("reussi") ||
      decision === "r"
    ) {
      return "text-blue-700";
    } else if (
      decision?.includes("sessionnaire") ||
      decision?.includes("sessionn")
    ) {
      return "text-blue-700";
    }
    return "text-red-700";
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500 hover:bg-yellow-600";
    if (rank === 2) return "bg-gray-400 hover:bg-gray-500";
    if (rank === 3) return "bg-amber-600 hover:bg-amber-700";
    return "bg-blue-500 hover:bg-blue-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Back Button Skeleton */}
          <div className="mb-4 sm:mb-6">
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Header Card Skeleton */}
          <div className="shadow-xl border border-blue-200 rounded-lg mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6 rounded-t-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-48 h-7 bg-blue-500 rounded animate-pulse"></div>
                <div className="w-32 h-5 bg-blue-500 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="grid gap-4 sm:gap-6">
            {/* Decision Card Skeleton */}
            <div className="shadow-lg border border-blue-200 rounded-lg">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 rounded-t-lg">
                <div className="w-32 h-6 bg-blue-400 rounded animate-pulse"></div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full bg-gray-200 animate-pulse"></div>
                </div>
                <div className="flex justify-center">
                  <div className="w-36 h-7 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Rankings Skeleton */}
            <div className="space-y-4">
              <div className="max-w-md mx-auto">
                <div className="shadow-lg border border-blue-200 rounded-lg p-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-36 h-6 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {examType !== "CONCOURS" && (
                <div className="grid gap-4 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="shadow-lg border border-blue-200 rounded-lg p-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-28 h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          <Card className="max-w-md mx-auto shadow-xl border-blue-200">
            <CardContent className="p-6 sm:p-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Erreur
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button
                onClick={handleBack}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          <Card className="max-w-md mx-auto shadow-xl border-blue-200">
            <CardContent className="p-6 sm:p-8 text-center">
              <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun résultat
              </h3>
              <p className="text-gray-600 mb-4">
                Aucun étudiant trouvé avec ce matricule.
              </p>
              <Button
                onClick={handleBack}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10">
        <div className="mb-4 sm:mb-6">
          <Button
            onClick={handleBack}
            variant="outline"
            className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Modern Header Card with Blue Background */}
        <Card className="shadow-xl border-blue-200 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-4 sm:p-6">
            <div className="text-center">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
                {student.nom_complet}
              </CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                {student.matricule} •{" "}
                {examType === "BREVET" ? "BREVET" : student.section}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Grid - Mobile First */}
        <div className="grid gap-4 sm:gap-6">
          {/* Decision Section - Different for BAC and BREVET */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {examType === "BREVET" ? "Résultat" : "Décision"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-center">
                <CircularProgress
                  value={student.moyenne}
                  maxValue={examType === "CONCOURS" ? 200 : 20}
                  className="mb-4"
                  size={isMobile ? 180 : 220}
                  strokeWidth={isMobile ? 8 : 10}
                />
              </div>
              <div className="text-center">
                {examType === "BREVET" ? (
                  // For BREVET - Just show the score
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      {getDecisionIcon(student.decision_text)}
                      <span
                        className={`text-lg sm:text-xl font-bold ${getDecisionTextColor(
                          student.decision_text
                        )}`}
                      >
                        {student.decision_text}
                      </span>
                    </div>
                  </div>
                ) : (
                  // For BAC - Show decision and score
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {getDecisionIcon(student.decision_text)}
                      <span
                        className={`text-lg sm:text-xl font-bold ${getDecisionTextColor(
                          student.decision_text
                        )}`}
                      >
                        {student.decision_text}
                      </span>
                    </div>
                  </div>
                )}


              </div>
            </CardContent>
          </Card>

          {/* Compact Info Grid */}
          <div className="space-y-4">
            {/* Establishment - MOVED TO FIRST */}
            <div className="max-w-md mx-auto">
              <Card className="shadow-lg border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Building className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1 font-bold">
                    Établissement
                  </p>
                  <button
                    onClick={() =>
                      handleEstablishmentClick(student.etablissement)
                    }
                    className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors text-center break-words focus:outline-none"
                    title={student.etablissement}
                  >
                    {student.etablissement}
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Comprehensive Ranking Cards - Hidden for CONCOURS */}
            {rankings && examType !== "CONCOURS" && (
              <div className={`grid gap-4 w-full ${
                rankings.wilayaRank 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1 sm:grid-cols-2"
              }`}>
                {/* Establishment Ranking */}
                <Card className="shadow-lg border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Building className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-600 mb-1 font-bold">
                      Classement Établissement
                    </p>
                                          <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRankBadgeColor(
                          rankings.schoolRank || 0
                        )}`}
                      >
                        {rankings.schoolRank || "N/A"}
                      </div>
                    {rankings.totalInSchool && (
                      <p className="text-xs text-gray-500 mt-1">
                        sur {rankings.totalInSchool} étudiants
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Wilaya Ranking */}
                {rankings.wilayaRank ? (
                  <Card className="shadow-lg border-blue-200">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                                           <p className="text-xs text-gray-600 mb-1 font-bold">
                       Classement Wilaya{examType === "BAC" ? ` (${student.section})` : ""}
                     </p>
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRankBadgeColor(
                          rankings.wilayaRank
                        )}`}
                      >
                        {rankings.wilayaRank}
                      </div>
                      {rankings.totalInWilaya && (
                        <p className="text-xs text-gray-500 mt-1">
                          sur {rankings.totalInWilaya} étudiants
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Country Ranking */}
                <Card className="shadow-lg border-blue-200">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="h-5 w-5 text-blue-600" />
                    </div>
                                         <p className="text-xs text-gray-600 mb-1 font-bold">
                       Classement National{examType === "BAC" ? ` (${student.section})` : ""}
                     </p>
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold text-white ${getRankBadgeColor(
                        rankings.generalRank || 0
                      )}`}
                    >
                      {rankings.generalRank || "N/A"}
                    </div>
                    {rankings.totalStudents && (
                      <p className="text-xs text-gray-500 mt-1">
                        sur {rankings.totalStudents} étudiants
                      </p>
                    )}
                  </CardContent>
                </Card>


              </div>
            )}
          </div>

          {/* APP DOWNLOAD & SOCIAL MEDIA SECTION */}
        </div>
      </div>
    </div>
  );
}
