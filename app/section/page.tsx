"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowLeft,
  AlertCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Student {
  id: string;
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
  lieu_nais?: string;
  date_naiss?: string;
}

interface SectionStats {
  name: string;
  total: number;
  admitted: number;
  successRate: number;
  averageScore: number;
}

interface WilayaStats {
  name: string;
  total: number;
  admitted: number;
  successRate: number;
  averageScore: number;
}

export default function SectionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const year = parseInt(searchParams.get("year") || "2025");
  const examType = searchParams.get("examType") || "BAC";
  const section = searchParams.get("section") || "";
  const wilaya = searchParams.get("wilaya") || "";
  const sessionType = searchParams.get("sessionType") || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [sectionStats, setSectionStats] = useState<SectionStats[]>([]);
  const [wilayaStats, setWilayaStats] = useState<WilayaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filter and sort states
  const [sortBy, setSortBy] = useState("moyenne");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterWilaya, setFilterWilaya] = useState(wilaya);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSectionData();
  }, [year, examType, section, wilaya, sessionType]);

  const fetchSectionData = async () => {
    try {
      setLoading(true);
      setError("");

             const params = new URLSearchParams({
         year: year.toString(),
         examType,
         section,
         wilaya,
         sortBy,
         order: sortOrder,
         limit: "1000",
       });
       
       if (sessionType) {
         params.append("sessionType", sessionType);
       }

      const response = await fetch(`/api/section-students?${params}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students || []);
        setSectionStats(data.sectionStatistics || []);
        setWilayaStats(data.wilayaStatistics || []);
      } else {
        setError(data.error || "Erreur lors du chargement des données");
      }
    } catch (error) {
      console.error("Error fetching section data:", error);
      setError("Erreur réseau lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = (student: Student) => {
    const sessionType = searchParams.get("sessionType");
    const params = new URLSearchParams({
      matricule: student.matricule,
      year: year.toString(),
      examType,
      returnTo: "/section"
    });
    
    // For BAC exams, session type is mandatory
    if (examType === "BAC") {
      // If no session type is available, default to NORMALE
      const finalSessionType = sessionType || "NORMALE";
      params.append("sessionType", finalSessionType);
    } else if (sessionType) {
      // For non-BAC exams, include session type if available
      params.append("sessionType", sessionType);
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
  };

  const handleSchoolClick = (schoolName: string) => {
    const sessionType = searchParams.get("sessionType");
    const params = new URLSearchParams({
      name: schoolName,
      year: year.toString(),
      examType
    });
    
    if (sessionType) {
      params.append("sessionType", sessionType);
    }
    
    router.push(`/school?${params.toString()}`);
  };

  const handleWilayaClick = (wilayaName: string) => {
    const sessionType = searchParams.get("sessionType");
    const params = new URLSearchParams({
      name: wilayaName,
      year: year.toString(),
      examType
    });
    
    if (sessionType) {
      params.append("sessionType", sessionType);
    }
    
    router.push(`/wilaya?${params.toString()}`);
  };

  const getDecisionBadgeVariant = (decisionText: string) => {
    const decision = decisionText?.toLowerCase();
    if (decision?.includes("admis") || decision?.includes("reussi") || decision === "r") {
      return "default";
    } else if (decision?.includes("sessionnaire") || decision?.includes("sessionn")) {
      return "secondary";
    }
    return "destructive";
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = searchTerm === "" || 
      student.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.etablissement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.matricule.includes(searchTerm);
    
    const matchesWilaya = filterWilaya === "" || student.wilaya === filterWilaya;
    
    return matchesSearch && matchesWilaya;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const aValue = a[sortBy as keyof Student];
    const bValue = b[sortBy as keyof Student];
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Étudiants - {section}
            </h1>
            <p className="text-gray-600">
              {examType} {year} - {students.length} étudiants
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Étudiants</p>
                  <p className="text-2xl font-bold text-blue-700">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Admis</p>
                  <p className="text-2xl font-bold text-green-700">
                    {students.filter(s => s.admis).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center">
                <MapPin className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">Wilayas</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {new Set(students.map(s => s.wilaya).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recherche</label>
                <Input
                  placeholder="Nom, établissement, matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Wilaya</label>
                <Select value={filterWilaya} onValueChange={setFilterWilaya}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les wilayas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les wilayas</SelectItem>
                    {Array.from(new Set(students.map(s => s.wilaya).filter(Boolean))).map((w) => (
                      <SelectItem key={w} value={w || ""}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Trier par</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="rang">Rang</SelectItem>
                    <SelectItem value="nom_complet">Nom</SelectItem>
                    <SelectItem value="etablissement">Établissement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ordre</label>
                <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">
                      <div className="flex items-center">
                        <SortDesc className="h-4 w-4 mr-2" />
                        Décroissant
                      </div>
                    </SelectItem>
                    <SelectItem value="asc">
                      <div className="flex items-center">
                        <SortAsc className="h-4 w-4 mr-2" />
                        Croissant
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Liste des Étudiants ({sortedStudents.length} résultats)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Nom Complet</TableHead>
                    <TableHead>Établissement</TableHead>
                    <TableHead>Wilaya</TableHead>
                    <TableHead>Moyenne</TableHead>
                    <TableHead>Décision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.map((student, index) => (
                    <TableRow key={student.id} className="hover:bg-gray-50 cursor-pointer">
                      <TableCell>
                        <Badge variant="outline">{student.rang}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.matricule}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleStudentClick(student)}
                          className="text-left hover:text-blue-600 hover:underline font-medium"
                        >
                          {student.nom_complet}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleSchoolClick(student.etablissement)}
                          className="text-left hover:text-blue-600 hover:underline"
                        >
                          {student.etablissement}
                        </button>
                      </TableCell>
                      <TableCell>
                        {student.wilaya && (
                          <button
                            onClick={() => handleWilayaClick(student.wilaya!)}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {student.wilaya}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-bold">
                        {student.moyenne.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDecisionBadgeVariant(student.decision_text)}>
                          {student.decision_text}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 