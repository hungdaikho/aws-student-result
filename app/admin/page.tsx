"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Database,
  Calendar,
  Lock,
  User,
  TestTube,
  Globe,
  HardDrive,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Eye,
  FileText,
  AlertTriangle,
  BookOpen,
  Image,
  Star,
  RefreshCw,
  CheckCircle,
  Edit,
  X,
  Play,
  Pause,
  MapPin,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UploadStats {
  totalStudents: number;
  admittedStudents: number;
  admissionRate: string;
  sections: string[];
  schools: string[];
  establishments: string[];
  wilayas: string[];
  averageScore: string;
}

interface ExcelAnalysis {
  fileName: string;
  fileSize: number;
  examType: "BAC" | "BREVET" | "CONCOURS" | "OTHER";
  columns: string[];
  sampleData: any[];
  totalRows: number;
  requiredFields: { field: string; description: string }[];
  suggestedMapping: { [field: string]: string };
}

interface ColumnMapping {
  [field: string]: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedExamType, setSelectedExamType] = useState<"BAC" | "BREVET" | "CONCOURS" | "OTHER">(
    "BAC"
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    stats?: UploadStats;
    details?: any;
  } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [regionInfo, setRegionInfo] = useState<any>(null);
  const [databaseInfo, setDatabaseInfo] = useState<any>(null);

  // New states for column mapping
  const [currentStep, setCurrentStep] = useState<
    "upload" | "mapping" | "processing"
  >("upload");
  const [excelAnalysis, setExcelAnalysis] = useState<ExcelAnalysis | null>(
    null
  );
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [analyzing, setAnalyzing] = useState(false);

  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // New states for enhanced features
  const [selectedSessionType, setSelectedSessionType] = useState<"NORMALE" | "COMPLEMENTAIRE" | null>(null);
  const [examTypeSessionType, setExamTypeSessionType] = useState<string>("NONE");
  const [concoursThreshold, setConcoursThreshold] = useState<number>(10);
  const [concoursWilayaThresholds, setConcoursWilayaThresholds] = useState<Array<{wilaya: string, threshold: number}>>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [showExamManagement, setShowExamManagement] = useState(false);
  const [showSliderManagement, setShowSliderManagement] = useState(false);

  // Available years and exam types for upload
  const availableYears = [2022, 2023, 2024, 2025];
  const availableExamTypes = ["BAC", "BREVET", "CONCOURS", "OTHER"] as const;

  // Check if user is already authenticated (from localStorage)
  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuthenticated");
    if (authStatus === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      getFiles();
      getDatabaseInfo();
      fetchExamTypes();
      fetchSliderImages();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (username === "MedAhmed01" && password === "Medahmed28233") {
      setIsAuthenticated(true);
      localStorage.setItem("adminAuthenticated", "true");
    } else {
      setLoginError("Nom d'utilisateur ou mot de passe incorrect");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("adminAuthenticated");
    setUsername("");
    setPassword("");
    // Reset upload states
    setCurrentStep("upload");
    setExcelAnalysis(null);
    setColumnMapping({});
    setFile(null);
  };

  const testConnection = async () => {
    try {
      const response = await fetch("/api/test-upload");
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        status: "ERROR",
        error: "Failed to connect to test endpoint",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getRegionInfo = async () => {
    try {
      const response = await fetch("/api/admin/region-info");
      const result = await response.json();
      setRegionInfo(result);
    } catch (error) {
      setRegionInfo({
        status: "ERROR",
        error: "Failed to get region info",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getDatabaseInfo = async () => {
    try {
      const response = await fetch("/api/admin/database-info");
      const result = await response.json();
      setDatabaseInfo(result);
    } catch (error) {
      setDatabaseInfo({
        status: "ERROR",
        error: "Failed to get database info",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Reset previous results and states
      setUploadResult(null);
      setExcelAnalysis(null);
      setColumnMapping({});
      setCurrentStep("upload");

      // Check file size (50MB limit for database upload)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > maxSize) {
        setUploadResult({
          success: false,
          message: `Fichier trop volumineux. Taille maximum: 50MB. Votre fichier: ${(
            selectedFile.size /
            1024 /
            1024
          ).toFixed(2)}MB`,
        });
        return;
      }

      // Enhanced file type validation
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/octet-stream", // Sometimes Excel files are sent as this
        ".xlsx",
        ".xls",
      ];

      const fileName = selectedFile.name?.toLowerCase();
      const hasValidExtension =
        fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
      const hasValidMimeType = validTypes?.includes(selectedFile.type);

      console.log("File validation:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        hasValidExtension,
        hasValidMimeType,
      });

      if (!hasValidExtension && !hasValidMimeType) {
        setUploadResult({
          success: false,
          message: `Type de fichier invalide. Veuillez sélectionner un fichier Excel (.xlsx ou .xls). 
                   Fichier reçu: ${selectedFile.name} (${selectedFile.type})`,
          details: {
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            validTypes: validTypes,
          },
        });
        return;
      }

      setFile(selectedFile);
      console.log("File selected successfully:", {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
      });
    }
  };

  const handleAnalyzeFile = async () => {
    if (!file) {
      setUploadResult({
        success: false,
        message: "Aucun fichier sélectionné",
      });
      return;
    }

    setAnalyzing(true);
    setUploadResult(null);

    try {
      // Create FormData for analysis
      const formData = new FormData();
      formData.append("excel", file);
      formData.append("examType", selectedExamType);

      console.log("📤 Sending analysis request...");

      const response = await fetch("/api/admin/analyze-excel", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setExcelAnalysis(result);
        setColumnMapping(result.suggestedMapping || {});
        setCurrentStep("mapping");
        console.log("🎉 Analysis successful!");
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec de l'analyse du fichier Excel",
          details: result,
        });
        console.error("❌ Analysis failed:", result);
      }
    } catch (error) {
      console.error("💥 Analysis error:", error);
      setUploadResult({
        success: false,
        message: "Erreur lors de l'analyse du fichier. Veuillez réessayer.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleColumnMappingChange = (field: string, column: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: column === "__none__" ? "" : column,
    }));
  };

  const handleProcessWithMapping = async () => {
    if (!file || !excelAnalysis) {
      setUploadResult({
        success: false,
        message: "Fichier ou analyse manquante",
      });
      return;
    }

    // Validate required fields are mapped
    const requiredFields = excelAnalysis.requiredFields?.filter(
      (field) =>
        ["matricule", "nom_complet"]?.includes(field.field) ||
        (selectedExamType === "BAC" &&
          ["section", "moyenne", "decision", "ecole", "etablissement"]?.includes(field.field)) ||
        (selectedExamType === "BREVET" &&
          ["moyenne", "decision", "ecole", "etablissement"]?.includes(field.field)) ||
        (selectedExamType === "CONCOURS" &&
          ["score", "ecole", "etablissement"]?.includes(field.field))
    );

    const missingMappings = requiredFields?.filter(
      (field) => !columnMapping[field.field]
    );

    if (missingMappings.length > 0) {
      setUploadResult({
        success: false,
        message: `Veuillez mapper les champs obligatoires: ${missingMappings
          ?.map((f) => f.field)
          .join(", ")}`,
      });
      return;
    }

    setCurrentStep("processing");
    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      // Create FormData with mapping
      const formData = new FormData();
      formData.append("excel", file);
      formData.append("year", selectedYear.toString());
      formData.append("examType", selectedExamType);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      
      // Add session type for BAC exams - use the selected session type
      if (selectedExamType === "BAC" && selectedSessionType) {
        formData.append("sessionType", selectedSessionType);
        console.log(`📋 Adding session type to form data: ${selectedSessionType}`);
      } else if (selectedExamType === "BAC") {
        console.log(`⚠️ No session type selected for BAC exam type ${selectedExamType} ${selectedYear}`);
      }

      // Add threshold for CONCOURS exams
      if (selectedExamType === "CONCOURS") {
        formData.append("threshold", concoursThreshold.toString());
        formData.append("wilayaThresholds", JSON.stringify(concoursWilayaThresholds));
        console.log(`📋 Adding threshold to form data: ${concoursThreshold}`);
        console.log(`📋 Adding wilaya thresholds:`, concoursWilayaThresholds);
      }

      console.log("📤 Sending upload request with mapping...");
      console.log("Column mapping:", columnMapping);

      // Progress simulation with better timing
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Stop at 90% to wait for server response
          }
          return prev + 2;
        });
      }, 1000); // Faster progress updates for better UX

      // Create abort controller for timeout (match API timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("⏰ Request aborted due to timeout");
      }, 280000); // 4 minutes 40 seconds (slightly less than API timeout)

      // Make the request
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      // Clear timeout and progress
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("📥 Response received:", {
        status: response.status,
        statusText: response.statusText,
      });

      // Parse response
      let result: any;
      try {
        const responseText = await response.text();
        console.log("📥 Raw response:", responseText.substring(0, 500) + "...");
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse response:", parseError);
        throw new Error("Invalid response from server");
      }

      console.log("📥 Parsed response:", result);

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          stats: result.stats,
          details: {
            ...result.fileInfo,
          },
        });
        console.log("🎉 Upload successful!");

        // Refresh database info after successful upload
        getDatabaseInfo();

        // Reset to upload step for next file
        setTimeout(() => {
          setCurrentStep("upload");
          setExcelAnalysis(null);
          setColumnMapping({});
          setFile(null);
        }, 5000);
      } else {
        setUploadResult({
          success: false,
          message:
            result.error ||
            `Erreur HTTP ${response.status}: ${response.statusText}`,
          details: result,
        });
        console.error("❌ Upload failed:", result);
      }
    } catch (error) {
      console.error("💥 Upload error:", error);

      let errorMessage = "Erreur lors du téléchargement";
      const errorDetails: any = {};

      if (error instanceof Error) {
        errorDetails.errorName = error.name;
        errorDetails.errorMessage = error.message;

        if (error.name === "AbortError") {
          errorMessage =
            "Timeout: Le téléchargement a pris trop de temps. Vérifiez si les données ont été sauvegardées en actualisant les infos de la base de données.";
        } else if (error.message?.includes("fetch")) {
          errorMessage =
            "Erreur de connexion. Vérifiez votre connexion internet et réessayez.";
        } else if (error.message?.includes("multipart")) {
          errorMessage = "Erreur de format de fichier. Veuillez réessayer.";
        } else if (error.message?.includes("database")) {
          errorMessage = "Erreur de base de données. Veuillez réessayer.";
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }

      setUploadResult({
        success: false,
        message: errorMessage,
        details: errorDetails,
      });

      // If it's a timeout error, automatically refresh database info
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🔄 Timeout detected, refreshing database info...");
        setTimeout(() => {
          getDatabaseInfo();
        }, 2000);
      }
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 3000);
    }
  };

  const clearData = async () => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir effacer toutes les données des étudiants pour ${selectedExamType} ${selectedYear} ? Cette action ne peut pas être annulée.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/clear?year=${selectedYear}&examType=${selectedExamType}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          details: { deletedRecords: result.deletedCount },
        });

        // Refresh database info after clearing data
        getDatabaseInfo();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Échec de l'effacement des données",
        });
      }
    } catch (error) {
      console.error("Clear data error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de l'effacement",
      });
    }
  };





  const resetToUpload = () => {
    setCurrentStep("upload");
    setExcelAnalysis(null);
    setColumnMapping({});
    setFile(null);
    setUploadResult(null);
  };

  const getFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch("/api/admin/files");
      const result = await response.json();
      setFiles(result.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce fichier ? Cette action ne peut pas être annulée."
      )
    ) {
      return;
    }

    setDeletingFile(fileId);
    try {
      console.log("🗑️ Attempting to delete file:", fileId);

      const response = await fetch(
        `/api/admin/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
        }
      );

      console.log("🗑️ Delete response status:", response.status);

      const result = await response.json();
      console.log("🗑️ Delete response:", result);

      if (response.ok && result.success) {
        setUploadResult({
          success: true,
          message: result.message,
          details: result.deletedFile,
        });
        // Refresh file list
        getFiles();
        getDatabaseInfo();
      } else {
        console.error("Delete failed:", result);
        setUploadResult({
          success: false,
          message: result.error || "Échec de la suppression du fichier",
        });
      }
    } catch (error) {
      console.error("Delete file error:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la suppression",
      });
    } finally {
      setDeletingFile(null);
    }
  };

  const viewFileDetails = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/admin/files/${encodeURIComponent(fileId)}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setSelectedFile(result.file);
        setShowFileDetails(true);
      } else {
        console.error(
          "Error fetching file details:",
          result.error || "Unknown error"
        );
        setUploadResult({
          success: false,
          message:
            result.error ||
            "Erreur lors de la récupération des détails du fichier",
        });
      }
    } catch (error) {
      console.error("Error fetching file details:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la récupération des détails du fichier",
      });
    }
  };

  // Enhanced features functions
  const fetchExamTypes = async () => {
    try {
      const response = await fetch("/api/admin/exam-types");
      const result = await response.json();
      if (result.success) {
        setExamTypes(result.examTypes);
      }
    } catch (error) {
      console.error("Error fetching exam types:", error);
    }
  };

  const fetchSliderImages = async () => {
    try {
      const response = await fetch("/api/admin/slider-images");
      const result = await response.json();
      if (result.success) {
        setSliderImages(result.sliderImages);
      }
    } catch (error) {
      console.error("Error fetching slider images:", error);
    }
  };

  const createExamType = async (examTypeData: any) => {
    console.log("createExamType called with:", examTypeData);
    try {
      const response = await fetch("/api/admin/exam-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(examTypeData),
      });
      const result = await response.json();
      console.log("API response:", result);
      if (result.success) {
        setUploadResult({
          success: true,
          message: "Type d'examen créé avec succès",
        });
        fetchExamTypes();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la création du type d'examen",
        });
      }
    } catch (error) {
      console.error("Error creating exam type:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la création du type d'examen",
      });
    }
  };

  const deleteExamType = async (examTypeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type d'examen ? Cette action ne peut pas être annulée.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/exam-types/${examTypeId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult({
          success: true,
          message: `Type d'examen supprimé avec succès`,
        });
        fetchExamTypes();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la suppression du type d'examen",
        });
      }
    } catch (error) {
      console.error("Error deleting exam type:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la suppression du type d'examen",
      });
    }
  };

  const setDefaultExamType = async (examTypeId: string) => {
    try {
      const response = await fetch(`/api/admin/exam-types/${examTypeId}/set-default`, {
        method: "PATCH",
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult({
          success: true,
          message: `Type d'examen défini par défaut avec succès`,
        });
        fetchExamTypes();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la définition du type d'examen par défaut",
        });
      }
    } catch (error) {
      console.error("Error setting default exam type:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la définition du type d'examen par défaut",
      });
    }
  };

  const createSliderImage = async (imageData: any) => {
    try {
      const response = await fetch("/api/admin/slider-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageData),
      });
      const result = await response.json();
      if (result.success) {
        setUploadResult({
          success: true,
          message: "Image du slider créée avec succès",
        });
        fetchSliderImages();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la création de l'image",
        });
      }
    } catch (error) {
      console.error("Error creating slider image:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la création de l'image",
      });
    }
  };

  const updateSliderImage = async (id: string, imageData: any) => {
    try {
      const response = await fetch(`/api/admin/slider-images/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageData),
      });
      const result = await response.json();
      if (result.success) {
        setUploadResult({
          success: true,
          message: "Image du slider mise à jour avec succès",
        });
        fetchSliderImages();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la mise à jour de l'image",
        });
      }
    } catch (error) {
      console.error("Error updating slider image:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la mise à jour de l'image",
      });
    }
  };

  const deleteSliderImage = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette image du slider ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/slider-images/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        setUploadResult({
          success: true,
          message: "Image du slider supprimée avec succès",
        });
        fetchSliderImages();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la suppression de l'image",
        });
      }
    } catch (error) {
      console.error("Error deleting slider image:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la suppression de l'image",
      });
    }
  };

  const toggleSliderImageStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/slider-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setUploadResult({
          success: true,
          message: `Image ${!currentStatus ? "activée" : "désactivée"} avec succès`,
        });
        fetchSliderImages();
      } else {
        setUploadResult({
          success: false,
          message: result.error || "Erreur lors de la modification du statut",
        });
      }
    } catch (error) {
      console.error("Error toggling slider image status:", error);
      setUploadResult({
        success: false,
        message: "Erreur réseau lors de la modification du statut",
      });
    }
  };
  console.log(uploadResult);

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-6">
            <CardTitle className="flex items-center text-2xl justify-center">
              <Lock className="h-6 w-6 mr-2" />
              Connexion Dashboard
            </CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Veuillez vous connecter pour accéder au dashboard administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-700"
                >
                  Nom d'utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Entrez votre nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Entrez votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{loginError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              >
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin panel (authenticated)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header with logout - Responsive */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0">
            <div className="flex items-center justify-center lg:justify-start">
              <Database className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-600 mr-2 sm:mr-3" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                Dashboard Admin
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Button
                onClick={testConnection}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-600 hover:bg-green-50 bg-transparent text-xs sm:text-sm"
              >
                <TestTube className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Test API</span>
                <span className="sm:hidden">Test</span>
              </Button>
              <Button
                onClick={getRegionInfo}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-xs sm:text-sm"
              >
                <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Info Région</span>
                <span className="sm:hidden">Région</span>
              </Button>
              <Button
                onClick={getDatabaseInfo}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 bg-transparent text-xs sm:text-sm"
              >
                <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Database</span>
                <span className="sm:hidden">DB</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50 bg-transparent text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Déconnexion</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4 sm:px-0">
            Télécharger et gérer les données des résultats avec PostgreSQL
            Database
          </p>
        </div>

        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

          {/* Database Storage Information */}
          {databaseInfo && (
            <Card
              className={`shadow-lg ${
                databaseInfo.status === "SUCCESS"
                  ? "border-purple-200"
                  : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center text-lg sm:text-xl lg:text-2xl ${
                    databaseInfo.status === "SUCCESS"
                      ? "text-purple-700"
                      : "text-red-700"
                  }`}
                >
                  <HardDrive className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Informations de la Base de Données
                </CardTitle>
              </CardHeader>
              <CardContent>
                {databaseInfo.status === "SUCCESS" && databaseInfo.summary && (
                  <div className="space-y-6">
                    {/* Summary - Responsive Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                        <p className="text-xs sm:text-sm text-purple-600 font-medium">
                          Total Étudiants
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-700">
                          {databaseInfo.summary.totalStudents}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                        <p className="text-xs sm:text-sm text-blue-600 font-medium">
                          Total Uploads
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-blue-700">
                          {databaseInfo.summary.totalUploads}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                        <p className="text-xs sm:text-sm text-green-600 font-medium">
                          Années/Types
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700">
                          {databaseInfo.summary.distinctYearTypes}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                        <p className="text-xs sm:text-sm text-orange-600 font-medium">
                          Records Totaux
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-700">
                          {databaseInfo.summary.totalDataSize}
                        </p>
                      </div>
                    </div>

                    {/* Data by Year and Type */}
                    {Object.keys(databaseInfo.data).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-4">
                          Données par Année et Type:
                        </h4>
                        <div className="grid gap-4">
                          {Object.entries(databaseInfo.data)?.map(
                            ([key, data]: [string, any]) => (
                              <div
                                key={key}
                                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold text-gray-800">
                                    {key}
                                  </h5>
                                  <Badge variant="secondary">
                                    {data.studentCount} étudiants
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>
                                    <strong>Moyenne générale:</strong>{" "}
                                    {data.averageScore}/20
                                  </p>
                                  {data.uploadInfo && (
                                    <>
                                      <p>
                                        <strong>Fichier:</strong>{" "}
                                        {data.uploadInfo.fileName}
                                      </p>
                                      <p>
                                        <strong>Uploadé le:</strong>{" "}
                                        {new Date(
                                          data.uploadInfo.uploadedAt
                                        ).toLocaleString()}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent Uploads */}
                    {databaseInfo.recentUploads &&
                      databaseInfo.recentUploads.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-4">
                            Uploads Récents:
                          </h4>
                          <div className="space-y-2">
                            {databaseInfo.recentUploads
                              .slice(0, 5)
                              ?.map((upload: any) => (
                                <div
                                  key={upload.id}
                                  className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-medium text-sm">
                                      {upload.fileName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {upload.examType} {upload.year} -{" "}
                                      {upload.studentCount} étudiants
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {new Date(
                                      upload.uploadedAt
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {databaseInfo.error && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-red-600">
                      <strong>Erreur:</strong> {databaseInfo.error}
                    </p>
                    <p className="text-sm text-red-500 mt-2">
                      Configuré: {databaseInfo.configured ? "Oui" : "Non"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* File Management */}
          <Card className="shadow-lg border-indigo-200">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-lg sm:text-xl lg:text-2xl text-indigo-700 space-y-3 sm:space-y-0">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Gestion des Fichiers Uploadés
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await fetch("/api/admin/clear-cache", {
                          method: "POST",
                        });
                        setUploadResult({
                          success: true,
                          message: "Cache supprimé avec succès",
                        });
                      } catch (error) {
                        setUploadResult({
                          success: false,
                          message: "Erreur lors de la suppression du cache",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline">Vider Cache</span>
                    <span className="sm:hidden">Cache</span>
                  </Button>
                  <Button
                    onClick={getFiles}
                    disabled={loadingFiles}
                    variant="outline"
                    size="sm"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 bg-transparent text-xs sm:text-sm"
                  >
                    {loadingFiles ? (
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Actualiser</span>
                    <span className="sm:hidden">Refresh</span>
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Voir tous les fichiers uploadés, détecter les doublons et gérer
                les données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Chargement des fichiers...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>
                    Aucun fichier trouvé. Cliquez sur "Actualiser" pour
                    recharger.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary - Responsive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
                      <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                        Total Fichiers
                      </p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-700">
                        {files.length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <p className="text-xs sm:text-sm text-blue-600 font-medium">
                        Total Étudiants
                      </p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-700">
                        {files.reduce((sum, f) => sum + f.studentCount, 0)}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                      <p className="text-xs sm:text-sm text-orange-600 font-medium">
                        Doublons Détectés
                      </p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-700">
                        {files.reduce(
                          (sum, f) => sum + (f.duplicateCount || 0),
                          0
                        )}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                      <p className="text-xs sm:text-sm text-green-600 font-medium">
                        Taille Totale
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-bold text-green-700">
                        {files
                          .reduce((sum, f) => sum + f.studentCount * 0.5, 0)
                          .toFixed(0)}{" "}
                        KB
                      </p>
                    </div>
                  </div>

                  {/* Files Display - Responsive */}
                  {/* Desktop Table View */}
                  <div className="hidden lg:block">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fichier</TableHead>
                            <TableHead>Année/Type</TableHead>
                            <TableHead>Étudiants</TableHead>
                            <TableHead>Doublons</TableHead>
                            <TableHead>Taux Admission</TableHead>
                            <TableHead>Taille</TableHead>
                            <TableHead>Date Upload</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {files?.map((file) => (
                            <TableRow key={file.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                                  <div>
                                    <p className="font-medium text-sm">
                                      {file.fileName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {file.id}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Badge variant="outline">
                                    {file.examType} {file.year}
                                  </Badge>
                                  {file.sessionType && (
                                    <div className="text-xs text-gray-600">
                                      {file.sessionType === "NORMALE" ? "Session Normale" : 
                                       file.sessionType === "COMPLEMENTAIRE" ? "Session Complémentaire" : 
                                       file.sessionType}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {file.studentCount}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.uniqueStudents} uniques
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {file.duplicateCount > 0 ? (
                                  <div className="flex items-center">
                                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-1" />
                                    <span className="text-orange-600 font-medium">
                                      {file.duplicateCount}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-green-600">
                                    ✓ Aucun
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {file.admissionRate}%
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.admittedCount}/{file.studentCount}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {file.sizeFormatted}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => viewFileDetails(file.id)}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => deleteFile(file.id)}
                                    disabled={deletingFile === file.id}
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    {deletingFile === file.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {files?.map((file) => (
                      <Card key={file.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <div className="space-y-1">
                                  <Badge variant="outline" className="text-xs">
                                    {file.examType} {file.year}
                                  </Badge>
                                  {file.sessionType && (
                                    <div className="text-xs text-gray-600">
                                      {file.sessionType === "NORMALE" ? "Session Normale" : 
                                       file.sessionType === "COMPLEMENTAIRE" ? "Session Complémentaire" : 
                                       file.sessionType}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => viewFileDetails(file.id)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => deleteFile(file.id)}
                                  disabled={deletingFile === file.id}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  {deletingFile === file.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* File Name */}
                            <div>
                              <p className="font-medium text-sm text-gray-900 break-all">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                {file.id}
                              </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-500 text-xs">
                                  Étudiants
                                </p>
                                <p className="font-medium">
                                  {file.studentCount}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {file.uniqueStudents} uniques
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">
                                  Admission
                                </p>
                                <p className="font-medium">
                                  {file.admissionRate}%
                                </p>
                                <p className="text-xs text-gray-500">
                                  {file.admittedCount}/{file.studentCount}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">
                                  Doublons
                                </p>
                                {file.duplicateCount > 0 ? (
                                  <div className="flex items-center">
                                    <AlertTriangle className="h-3 w-3 text-orange-500 mr-1" />
                                    <span className="text-orange-600 font-medium text-sm">
                                      {file.duplicateCount}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-green-600 text-sm">
                                    ✓ Aucun
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs">Taille</p>
                                <p className="font-medium">
                                  {file.sizeFormatted}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    file.uploadedAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Details Modal */}
          {showFileDetails && selectedFile && (
            <Card className="shadow-lg border-blue-200 mt-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl text-blue-700">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Détails du Fichier
                  </div>
                  <Button
                    onClick={() => setShowFileDetails(false)}
                    variant="outline"
                    size="sm"
                  >
                    Fermer
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* File Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Informations du fichier
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>ID:</strong> {selectedFile.file.id}
                        </p>
                        <p>
                          <strong>Taille:</strong>{" "}
                          {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p>
                          <strong>Uploadé:</strong>{" "}
                          {new Date(
                            selectedFile.file.uploadedAt
                          ).toLocaleString()}
                        </p>
                        <p>
                          <strong>Étudiants:</strong>{" "}
                          {selectedFile.file.studentCount}
                        </p>
                      </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">
                        Analyse des doublons
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Total doublons:</strong>{" "}
                          {selectedFile.duplicates.totalDuplicates}
                        </p>
                        <p>
                          <strong>Groupes de doublons:</strong>{" "}
                          {selectedFile.duplicates.totalGroups}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Duplicate Groups */}
                  {selectedFile.duplicates.duplicateGroups.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Groupes de doublons (premiers{" "}
                        {Math.min(
                          10,
                          selectedFile.duplicates.duplicateGroups.length
                        )}
                        )
                      </h4>
                      <div className="space-y-3">
                        {selectedFile.duplicates.duplicateGroups
                          .slice(0, 10)
                          ?.map((group: any, index: number) => (
                            <div
                              key={index}
                              className="bg-red-50 p-3 rounded-lg border border-red-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-red-800">
                                  Matricule: {group.matricule}
                                </p>
                                <Badge variant="destructive">
                                  {group.count} copies
                                </Badge>
                              </div>
                              <div className="grid gap-2">
                                {group.students
                                  .slice(0, 3)
                                  ?.map(
                                    (student: any, studentIndex: number) => (
                                      <div
                                        key={studentIndex}
                                        className="text-xs bg-white p-2 rounded border"
                                      >
                                        <p>
                                          <strong>Nom:</strong>{" "}
                                          {student.nom_complet}
                                        </p>
                                        <p>
                                          <strong>École:</strong>{" "}
                                          {student.ecole}
                                        </p>
                                        <p>
                                          <strong>Moyenne:</strong>{" "}
                                          {student.moyenne}
                                        </p>
                                        <p>
                                          <strong>Décision:</strong>{" "}
                                          {student.decision_text}
                                        </p>
                                      </div>
                                    )
                                  )}
                                {group.students.length > 3 && (
                                  <p className="text-xs text-gray-500">
                                    ... et {group.students.length - 3} autres
                                    copies
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Students */}
                  {selectedFile.students &&
                    selectedFile.students.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-4">
                          Aperçu des étudiants (premiers 10)
                        </h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Matricule</TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>École</TableHead>
                                <TableHead>Moyenne</TableHead>
                                <TableHead>Décision</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedFile.students
                                .slice(0, 10)
                                ?.map((student: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-xs">
                                      {student.matricule}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {student.nom_complet}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {student.ecole}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {student.moyenne}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          student.admis
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {student.decision_text}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Region Information */}
          {regionInfo && (
            <Card
              className={`shadow-lg ${
                regionInfo.status === "SUCCESS"
                  ? "border-blue-200"
                  : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center text-lg sm:text-xl lg:text-2xl ${
                    regionInfo.status === "SUCCESS"
                      ? "text-blue-700"
                      : "text-red-700"
                  }`}
                >
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Informations de Région et Environnement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {regionInfo.status === "SUCCESS" && regionInfo.data && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Vercel Info */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Vercel
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Région:</strong>{" "}
                          {regionInfo.data.vercelRegion}
                        </p>
                        <p>
                          <strong>Environnement:</strong>{" "}
                          {regionInfo.data.vercelEnv}
                        </p>
                        <p>
                          <strong>URL:</strong> {regionInfo.data.vercelUrl}
                        </p>
                      </div>
                    </div>

                    {/* AWS Lambda Info */}
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">
                        AWS Lambda
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Région AWS:</strong>{" "}
                          {regionInfo.data.awsRegion}
                        </p>
                        <p>
                          <strong>Mémoire:</strong>{" "}
                          {regionInfo.data.lambdaMemorySize}MB
                        </p>
                        <p>
                          <strong>Runtime:</strong>{" "}
                          {regionInfo.data.awsExecutionEnv}
                        </p>
                      </div>
                    </div>

                    {/* System Info */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">
                        Système
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Node.js:</strong>{" "}
                          {regionInfo.data.nodeVersion}
                        </p>
                        <p>
                          <strong>Plateforme:</strong>{" "}
                          {regionInfo.data.platform}
                        </p>
                        <p>
                          <strong>Architecture:</strong>{" "}
                          {regionInfo.data.architecture}
                        </p>
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200 sm:col-span-2 lg:col-span-2">
                      <h4 className="font-semibold text-purple-800 mb-2 text-sm sm:text-base">
                        Utilisation Mémoire
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <p>
                          <strong>RSS:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.rss / 1024 / 1024
                          )}
                          MB
                        </p>
                        <p>
                          <strong>Heap Total:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.heapTotal / 1024 / 1024
                          )}
                          MB
                        </p>
                        <p>
                          <strong>Heap Used:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.heapUsed / 1024 / 1024
                          )}
                          MB
                        </p>
                        <p>
                          <strong>External:</strong>{" "}
                          {Math.round(
                            regionInfo.data.memoryUsage.external / 1024 / 1024
                          )}
                          MB
                        </p>
                      </div>
                    </div>

                    {/* Time Info */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">
                        Temps
                      </h4>
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p>
                          <strong>Timezone:</strong> {regionInfo.data.timezone}
                        </p>
                        <p>
                          <strong>Uptime:</strong>{" "}
                          {Math.round(regionInfo.data.uptime)}s
                        </p>
                        <p>
                          <strong>Timestamp:</strong>{" "}
                          {new Date(
                            regionInfo.data.timestamp
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {regionInfo.error && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-red-600">
                      <strong>Erreur:</strong> {regionInfo.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          {testResult && (
            <Card
              className={`shadow-lg ${
                testResult.status === "OK"
                  ? "border-green-200"
                  : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center ${
                    testResult.status === "OK"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  <TestTube className="h-6 w-6 mr-2" />
                  Test de Connexion API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Status:</strong> {testResult.status}
                  </p>
                  {testResult.tests && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p>
                        <strong>Environment:</strong>{" "}
                        {testResult.tests.environment}
                      </p>
                      <p>
                        <strong>Region:</strong> {testResult.tests.vercelRegion}
                      </p>
                      <p>
                        <strong>Memory:</strong>{" "}
                        {JSON.stringify(testResult.tests.memoryUsage)}
                      </p>
                      <p>
                        <strong>Runtime:</strong> {testResult.tests.runtime}
                      </p>
                    </div>
                  )}
                  {testResult.error && (
                    <p className="text-red-600">
                      <strong>Erreur:</strong> {testResult.error}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Year and Exam Type Selection */}
          <Card className="shadow-lg border-primary-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg sm:text-xl lg:text-2xl text-primary-700">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                Sélectionner l'Année et le Type d'Examen
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Choisissez l'année et le type d'examen pour lesquels vous
                souhaitez télécharger ou gérer les données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="year-select"
                    className="text-sm font-medium text-gray-700"
                  >
                    Année
                  </Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) =>
                      setSelectedYear(Number.parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full border-primary-300 focus:border-primary-500 focus:outline-none">
                      <SelectValue placeholder="Choisir une année..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears?.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="exam-type-select"
                    className="text-sm font-medium text-gray-700"
                  >
                    Type d'Examen
                  </Label>
                  <Select
                    value={`${selectedExamType}-${selectedSessionType || "NONE"}-${selectedYear}`}
                    onValueChange={(value: string) => {
                      // Parse the combined value (format: "CODE-SESSION-YEAR")
                      const [examType, sessionType, year] = value.split("-");
                      setSelectedExamType(examType as "BAC" | "BREVET" | "CONCOURS" | "OTHER");
                      setSelectedSessionType(sessionType === "NONE" ? null : sessionType as "NORMALE" | "COMPLEMENTAIRE");
                      setSelectedYear(Number.parseInt(year));
                    }}
                  >
                    <SelectTrigger className="w-full border-primary-300 focus:border-primary-500 focus:outline-none">
                      <SelectValue placeholder="Choisir un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes?.map((type) => (
                        <SelectItem key={`${type.code}-${type.sessionType}-${type.year}`} value={`${type.code}-${type.sessionType || "NONE"}-${type.year}`}>
                          {type.name} ({type.year}){type.sessionType ? ` - ${type.sessionType === "NORMALE" ? "Session Normale" : type.sessionType === "COMPLEMENTAIRE" ? "Session Complémentaire" : "Aucune session"}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Type for BAC - Now automatically determined by exam type */}
                {selectedExamType === "BAC" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="session-type-select"
                      className="text-sm font-medium text-gray-700"
                    >
                      Type de Session
                    </Label>
                    {(() => {
                      const examType = examTypes.find(et => et.code === selectedExamType && et.year === selectedYear);
                      const autoSessionType = examType?.sessionType;
                      
                      if (autoSessionType) {
                        return (
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                Session automatiquement définie: {autoSessionType}
                              </span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                              Définie dans le type d'examen "{examType.name}"
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-800">
                                Aucune session définie
                              </span>
                            </div>
                            <p className="text-xs text-yellow-600 mt-1">
                              Veuillez sélectionner un type d'examen BAC avec session définie
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}


              </div>

              <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <div className="text-sm text-gray-600 text-center sm:text-left">
                  Sélection actuelle:{" "}
                  <span className="font-semibold text-primary-600">
                    {selectedExamType} {selectedYear}
                    {selectedSessionType && (
                      () => {
                        const sessionDisplay = selectedSessionType === "NORMALE" ? "Session Normale" : 
                                             selectedSessionType === "COMPLEMENTAIRE" ? "Session Complémentaire" : 
                                             selectedSessionType;
                        return ` - ${sessionDisplay}`;
                      }
                    )()}

                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Step Upload Process */}
          <Card className="shadow-lg border-blue-200">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center text-lg sm:text-xl lg:text-2xl text-blue-700 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <Upload className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  <span>
                    Télécharger Excel - {selectedExamType} {selectedYear}
                    {selectedSessionType && ` - ${selectedSessionType === "NORMALE" ? "Session Normale" : "Session Complémentaire"}`}
                  </span>
                </div>
                {currentStep === "mapping" && (
                  <Badge
                    variant="secondary"
                    className="sm:ml-2 self-start sm:self-center"
                  >
                    Étape 2/3: Mappage
                  </Badge>
                )}
                {currentStep === "processing" && (
                  <Badge
                    variant="secondary"
                    className="sm:ml-2 self-start sm:self-center"
                  >
                    Étape 3/3: Traitement
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {currentStep === "upload" && (
                  <>
                    Téléchargez votre fichier RES-{selectedExamType}-
                    {selectedYear}-FINALE.xlsx contenant les résultats des
                    étudiants. <strong>Stockage: PostgreSQL Database</strong>
                  </>
                )}
                {currentStep === "mapping" && (
                  <>
                    Mappez les colonnes de votre fichier Excel aux champs
                    requis. Les suggestions automatiques sont basées sur les
                    noms de colonnes courants.
                  </>
                )}
                {currentStep === "processing" && (
                  <>
                    Traitement et stockage des données en cours. Veuillez
                    patienter...
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Step 1: File Upload */}
              {currentStep === "upload" && (
                <>
                  {/* File Input */}
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 sm:p-6 lg:p-8 text-center hover:border-blue-400 transition-colors bg-blue-50">
                    <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-blue-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-base sm:text-lg font-medium text-gray-700">
                        {file ? (
                          <>
                            <span className="text-green-600">✓</span>{" "}
                            <span className="break-all">{file.name}</span> (
                            {(file.size / 1024 / 1024).toFixed(2)}
                            MB)
                          </>
                        ) : (
                          "Choisir un fichier Excel"
                        )}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 px-2">
                        Supporte les fichiers .xlsx et .xls (Maximum 4MB)
                        <br className="hidden sm:block" />
                        <span className="block sm:inline">
                          Types MIME acceptés: Excel, application/octet-stream
                        </span>
                        <br />
                        <span className="text-purple-600 font-medium">
                          📦 Stockage: Base de données PostgreSQL
                        </span>
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream"
                      onChange={handleFileSelect}
                      className="mt-4 block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons - Responsive Layout */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Primary Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleAnalyzeFile}
                        disabled={!file || analyzing}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
                      >
                        {analyzing ? (
                          <>
                            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                            <span className="hidden sm:inline">
                              Analyse en cours...
                            </span>
                            <span className="sm:hidden">Analyse...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            <span className="hidden sm:inline">
                              Analyser le fichier Excel
                            </span>
                            <span className="sm:hidden">Analyser Excel</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={clearData}
                        variant="destructive"
                        disabled={analyzing}
                        className="text-sm sm:text-base"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="hidden sm:inline">
                          Effacer {selectedExamType} {selectedYear}
                        </span>
                        <span className="sm:hidden">Effacer</span>
                      </Button>
                    </div>


                  </div>
                </>
              )}

              {/* Step 2: Column Mapping */}
              {currentStep === "mapping" && excelAnalysis && (
                <>
                  <div className="space-y-6">
                    {/* File Info - Responsive Grid */}
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">
                        Fichier analysé:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <p>
                          <strong>Nom:</strong>{" "}
                          <span className="break-all">
                            {excelAnalysis.fileName}
                          </span>
                        </p>
                        <p>
                          <strong>Taille:</strong>{" "}
                          {(excelAnalysis.fileSize / 1024 / 1024).toFixed(2)}MB
                        </p>
                        <p>
                          <strong>Lignes:</strong> {excelAnalysis.totalRows}
                        </p>
                        <p>
                          <strong>Colonnes:</strong>{" "}
                          {excelAnalysis.columns.length}
                        </p>
                      </div>
                    </div>

                    {/* Column Mapping Interface - Responsive */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                        Mappage des colonnes:
                      </h4>
                      <div className="grid gap-3 sm:gap-4">
                        {excelAnalysis.requiredFields?.map((field) => (
                          <div
                            key={field.field}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-start p-3 sm:p-4 bg-gray-50 rounded-lg border"
                          >
                            <div className="space-y-1">
                              <Label className="font-medium text-gray-700 text-sm sm:text-base">
                                {field.field}
                              </Label>
                              <p className="text-xs text-gray-500">
                                {field.description}
                              </p>
                              {[
                                "matricule",
                                "nom_complet",
                              ]?.includes(field.field) ||
                              (selectedExamType === "BAC" &&
                                ["section", "moyenne", "decision", "ecole", "etablissement"]?.includes(
                                  field.field
                                )) ||
                              (selectedExamType === "BREVET" &&
                                ["moyenne", "decision", "ecole", "etablissement"]?.includes(
                                  field.field
                                )) ||
                              (selectedExamType === "CONCOURS" &&
                                ["score", "ecole", "etablissement"]?.includes(
                                  field.field
                                )) ? (
                                <Badge
                                  variant="destructive"
                                  className="mt-1 text-xs"
                                >
                                  Obligatoire
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="mt-1 text-xs"
                                >
                                  Optionnel
                                </Badge>
                              )}
                            </div>
                            <div>
                              <Select
                                value={columnMapping[field.field] || "__none__"}
                                onValueChange={(value) =>
                                  handleColumnMappingChange(field.field, value)
                                }
                              >
                                <SelectTrigger className="w-full text-sm">
                                  <SelectValue placeholder="Sélectionner une colonne..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    -- Aucune --
                                  </SelectItem>
                                  {excelAnalysis.columns?.map((column) => (
                                    <SelectItem key={column} value={column}>
                                      {column}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {columnMapping[field.field] && (
                                <div className="bg-white p-2 rounded border">
                                  <strong>Exemple:</strong>{" "}
                                  <span className="break-all">
                                    {excelAnalysis.sampleData[0]?.[
                                      columnMapping[field.field]
                                    ] || "N/A"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CONCOURS Threshold Settings */}
                    {selectedExamType === "CONCOURS" && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                          Paramètres de seuil pour CONCOURS:
                        </h4>
                        
                        {/* Global Threshold */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Globe className="h-4 w-4 text-blue-600" />
                            <h5 className="font-medium text-blue-800">Seuil global</h5>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="global-threshold" className="text-sm text-blue-700">
                                Seuil minimum (pour tous les wilayas)
                              </Label>
                              <Input
                                id="global-threshold"
                                type="number"
                                min="0"
                                max="20"
                                step="0.01"
                                value={concoursThreshold}
                                onChange={(e) => setConcoursThreshold(parseFloat(e.target.value))}
                                placeholder="10.0"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex items-end">
                              <p className="text-xs text-blue-600">
                                Les étudiants avec un score ≥ {concoursThreshold} seront considérés comme admis
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Wilaya-specific Thresholds */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <h5 className="font-medium text-green-800">Seuils par wilaya (optionnel)</h5>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConcoursWilayaThresholds([...concoursWilayaThresholds, {wilaya: '', threshold: concoursThreshold}])}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Ajouter wilaya
                            </Button>
                          </div>
                          
                          {concoursWilayaThresholds.length > 0 ? (
                            <div className="space-y-3">
                              {concoursWilayaThresholds.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                  <div>
                                    <Label className="text-sm text-green-700">Wilaya</Label>
                                    <Input
                                      value={item.wilaya}
                                      onChange={(e) => {
                                        const newThresholds = [...concoursWilayaThresholds];
                                        newThresholds[index].wilaya = e.target.value;
                                        setConcoursWilayaThresholds(newThresholds);
                                      }}
                                      placeholder="Nom du wilaya"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm text-green-700">Seuil</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="20"
                                      step="0.01"
                                      value={item.threshold}
                                      onChange={(e) => {
                                        const newThresholds = [...concoursWilayaThresholds];
                                        newThresholds[index].threshold = parseFloat(e.target.value);
                                        setConcoursWilayaThresholds(newThresholds);
                                      }}
                                      placeholder="10.0"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const newThresholds = concoursWilayaThresholds.filter((_, i) => i !== index);
                                        setConcoursWilayaThresholds(newThresholds);
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-green-600">
                              Aucun seuil spécifique par wilaya défini. Le seuil global sera utilisé.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sample Data Preview - Responsive */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                        Aperçu des données (3 premières lignes):
                      </h4>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-3">
                        {excelAnalysis.sampleData
                          ?.slice(0, 3)
                          .map((row, index) => (
                            <Card
                              key={index}
                              className="border border-gray-200"
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <p className="text-xs text-gray-500 font-medium">
                                    Ligne {index + 1}
                                  </p>
                                  {excelAnalysis.columns
                                    .slice(0, 6)
                                    .map((column) => (
                                      <div
                                        key={column}
                                        className="flex justify-between text-xs"
                                      >
                                        <span className="font-medium text-gray-600 truncate mr-2">
                                          {column}:
                                        </span>
                                        <span className="text-gray-900 break-all">
                                          {row[column] || ""}
                                        </span>
                                      </div>
                                    ))}
                                  {excelAnalysis.columns.length > 6 && (
                                    <p className="text-xs text-gray-400 text-center">
                                      ... et {excelAnalysis.columns.length - 6}{" "}
                                      autres colonnes
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {excelAnalysis.columns
                                .slice(0, 8)
                                ?.map((column) => (
                                  <TableHead key={column} className="text-xs">
                                    {column}
                                  </TableHead>
                                ))}
                              {excelAnalysis.columns.length > 8 && (
                                <TableHead className="text-xs">...</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {excelAnalysis.sampleData?.map((row, index) => (
                              <TableRow key={index}>
                                {excelAnalysis.columns
                                  .slice(0, 8)
                                  ?.map((column) => (
                                    <TableCell
                                      key={column}
                                      className="text-xs max-w-32 truncate"
                                    >
                                      {row[column] || ""}
                                    </TableCell>
                                  ))}
                                {excelAnalysis.columns.length > 8 && (
                                  <TableCell className="text-xs">...</TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons - Responsive */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={resetToUpload}
                      variant="outline"
                      className="text-sm sm:text-base"
                    >
                      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Retour
                    </Button>
                    <Button
                      onClick={handleProcessWithMapping}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                    >
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      <span className="hidden sm:inline">
                        Traiter avec ce mappage
                      </span>
                      <span className="sm:hidden">Traiter</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Processing */}
              {currentStep === "processing" && (
                <>
                  {/* Upload Progress */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          Traitement et stockage en base de données pour{" "}
                          {selectedExamType} {selectedYear}...
                        </span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>
                          Traitement Excel + Stockage base de données - Cela
                          peut prendre plusieurs minutes...
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Exam Type Management */}
          <Card className="shadow-lg border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl lg:text-2xl text-green-700">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Gestion des Types d'Examen
                </div>
                <Button
                  onClick={() => setShowExamManagement(!showExamManagement)}
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-600 hover:bg-green-50"
                >
                  {showExamManagement ? "Masquer" : "Afficher"}
                </Button>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Créer et gérer les types d'examen disponibles dans le système.
              </CardDescription>
            </CardHeader>
            {showExamManagement && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Nom du Type d'Examen
                    </Label>
                    <Input
                      id="examTypeName"
                      placeholder="Ex: Concours National"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Code
                    </Label>
                    <Input
                      id="examTypeCode"
                      placeholder="Ex: CONCOURS"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Année
                    </Label>
                    <Input
                      id="examTypeYear"
                      type="number"
                      placeholder="2025"
                      className="w-full"
                    />
                  </div>
                                      <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Session (pour BAC uniquement)
                      </Label>
                      <Select value={examTypeSessionType} onValueChange={setExamTypeSessionType}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir une session" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Aucune (non-BAC)</SelectItem>
                          <SelectItem value="NORMALE">Session Normale</SelectItem>
                          <SelectItem value="COMPLEMENTAIRE">Session Complémentaire</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Pour BAC, la session est obligatoire pour différencier les examens
                      </p>
                    </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Input
                    id="examTypeDescription"
                    placeholder="Description du type d'examen..."
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasSections"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="hasSections" className="text-sm">
                      A des sections
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasDecision"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="hasDecision" className="text-sm">
                      A des décisions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requiresThreshold"
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="requiresThreshold" className="text-sm">
                      Nécessite un seuil
                    </Label>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    console.log("Button clicked!");
                    
                    // Debug: Check if elements exist
                    const nameElement = document.getElementById("examTypeName") as HTMLInputElement;
                    const codeElement = document.getElementById("examTypeCode") as HTMLInputElement;
                    const yearElement = document.getElementById("examTypeYear") as HTMLInputElement;
                    const descriptionElement = document.getElementById("examTypeDescription") as HTMLInputElement;
                    const hasSectionsElement = document.getElementById("hasSections") as HTMLInputElement;
                    const hasDecisionElement = document.getElementById("hasDecision") as HTMLInputElement;
                    const requiresThresholdElement = document.getElementById("requiresThreshold") as HTMLInputElement;
                    const sessionTypeElement = document.getElementById("examTypeSession") as HTMLSelectElement;
                    
                    console.log("Elements found:", {
                      nameElement: !!nameElement,
                      codeElement: !!codeElement,
                      yearElement: !!yearElement,
                      descriptionElement: !!descriptionElement,
                      hasSectionsElement: !!hasSectionsElement,
                      hasDecisionElement: !!hasDecisionElement,
                      requiresThresholdElement: !!requiresThresholdElement,
                      sessionTypeElement: !!sessionTypeElement
                    });
                    
                    const name = nameElement?.value;
                    const code = codeElement?.value;
                    const year = yearElement?.value;
                    const description = descriptionElement?.value;
                    const hasSections = hasSectionsElement?.checked;
                    const hasDecision = hasDecisionElement?.checked;
                    const requiresThreshold = requiresThresholdElement?.checked;
                    // Use the state value for session type
                    const sessionType = examTypeSessionType;

                    console.log("Form data:", { name, code, year, description, hasSections, hasDecision, requiresThreshold, sessionType });

                    if (!name || !code || !year) {
                      setUploadResult({
                        success: false,
                        message: "Le nom, le code et l'année sont requis",
                      });
                      return;
                    }

                    // For BAC exams, session type is required
                    if (code === "BAC") {
                      if (!sessionType || sessionType === "NONE") {
                        setUploadResult({
                          success: false,
                          message: "Pour les examens BAC, la session est obligatoire",
                        });
                        return;
                      }
                    }

                    console.log("Calling createExamType with:", { name, code, year, description, hasSections, hasDecision, requiresThreshold, sessionType });
                    createExamType({
                      name,
                      code,
                      year,
                      description,
                      hasSections,
                      hasDecision,
                      requiresThreshold,
                      sessionType: sessionType === "NONE" ? null : sessionType || null,
                    });
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Créer Type d'Examen
                </Button>

                {/* Exam Types List */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Types d'Examen Existants</h3>
                  {examTypes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun type d'examen créé</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {examTypes.map((type) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                {type.code}
                              </Badge>
                              <div>
                                <h4 className="font-semibold text-gray-900">{type.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Année: {type.year} • {type.description || "Aucune description"}
                                  {type.sessionType && ` • Session: ${type.sessionType}`}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  {type.hasSections && (
                                    <Badge variant="secondary" className="text-xs">Sections</Badge>
                                  )}
                                  {type.hasDecision && (
                                    <Badge variant="secondary" className="text-xs">Décisions</Badge>
                                  )}
                                  {type.requiresThreshold && (
                                    <Badge variant="secondary" className="text-xs">Seuil</Badge>
                                  )}
                                  {type.isActive ? (
                                    <Badge className="bg-green-100 text-green-800 text-xs">Actif</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">Inactif</Badge>
                                  )}
                                  {type.isDefault && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">Par Défaut</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!type.isDefault && (
                              <Button
                                onClick={() => setDefaultExamType(type.id)}
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                                title="Définir par défaut"
                              >
                                <Star className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              onClick={() => deleteExamType(type.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Slider Image Management */}
          <Card className="shadow-lg border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl lg:text-2xl text-purple-700">
                <div className="flex items-center">
                  <Image className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  Gestion du Slider d'Images
                </div>
                <Button
                  onClick={() => setShowSliderManagement(!showSliderManagement)}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  {showSliderManagement ? "Masquer" : "Afficher"}
                </Button>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Gérer les images du slider de la page d'accueil.
              </CardDescription>
            </CardHeader>
            {showSliderManagement && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Titre (optionnel)
                    </Label>
                    <Input
                      id="sliderTitle"
                      placeholder="Titre de l'image..."
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      URL de l'Image
                    </Label>
                    <Input
                      id="sliderImageUrl"
                      placeholder="https://example.com/image.jpg"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Description (optionnel)
                  </Label>
                  <Input
                    id="sliderDescription"
                    placeholder="Description de l'image..."
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Ordre d'affichage
                  </Label>
                  <Input
                    id="sliderOrder"
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={() => {
                    const title = (document.getElementById("sliderTitle") as HTMLInputElement)?.value;
                    const imageUrl = (document.getElementById("sliderImageUrl") as HTMLInputElement)?.value;
                    const description = (document.getElementById("sliderDescription") as HTMLInputElement)?.value;
                    const order = parseInt((document.getElementById("sliderOrder") as HTMLInputElement)?.value || "0");

                    if (!imageUrl) {
                      setUploadResult({
                        success: false,
                        message: "L'URL de l'image est requise",
                      });
                      return;
                    }

                    createSliderImage({
                      title,
                      imageUrl,
                      description,
                      order,
                    });
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Ajouter Image au Slider
                </Button>

                {/* Slider Images Table */}
                {sliderImages.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-4 text-sm sm:text-base">
                      Images du Slider ({sliderImages.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>Titre</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-20">Ordre</TableHead>
                            <TableHead className="w-20">Statut</TableHead>
                            <TableHead className="w-32">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sliderImages
                            .sort((a, b) => a.order - b.order)
                            .map((image) => (
                              <TableRow key={image.id}>
                                <TableCell>
                                  <div className="w-12 h-12 rounded-lg overflow-hidden border">
                                    <img
                                      src={image.imageUrl}
                                      alt={image.title || "Slider image"}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-size='8'%3EImage%3C/text%3E%3C/svg%3E";
                                      }}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    <p className="font-medium text-gray-900 truncate">
                                      {image.title || "Sans titre"}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {image.imageUrl}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm text-gray-600 max-w-xs truncate">
                                    {image.description || "Aucune description"}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {image.order}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={image.isActive ? "default" : "secondary"}
                                    className={`text-xs ${
                                      image.isActive
                                        ? "bg-green-100 text-green-800 border-green-200"
                                        : "bg-gray-100 text-gray-800 border-gray-200"
                                    }`}
                                  >
                                    {image.isActive ? "Actif" : "Inactif"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toggleSliderImageStatus(image.id, image.isActive)}
                                      className="h-8 w-8 p-0"
                                      title={image.isActive ? "Désactiver" : "Activer"}
                                    >
                                      {image.isActive ? (
                                        <Pause className="h-3 w-3" />
                                      ) : (
                                        <Play className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        // Populate form with image data for editing
                                        (document.getElementById("sliderTitle") as HTMLInputElement).value = image.title || "";
                                        (document.getElementById("sliderImageUrl") as HTMLInputElement).value = image.imageUrl;
                                        (document.getElementById("sliderDescription") as HTMLInputElement).value = image.description || "";
                                        (document.getElementById("sliderOrder") as HTMLInputElement).value = image.order.toString();
                                        
                                        // Update button to edit mode
                                        const addButton = document.querySelector('[onclick*="createSliderImage"]') as HTMLButtonElement;
                                        if (addButton) {
                                          addButton.textContent = "Mettre à jour l'Image";
                                          addButton.onclick = () => {
                                            const title = (document.getElementById("sliderTitle") as HTMLInputElement)?.value;
                                            const imageUrl = (document.getElementById("sliderImageUrl") as HTMLInputElement)?.value;
                                            const description = (document.getElementById("sliderDescription") as HTMLInputElement)?.value;
                                            const order = parseInt((document.getElementById("sliderOrder") as HTMLInputElement)?.value || "0");

                                            if (!imageUrl) {
                                              setUploadResult({
                                                success: false,
                                                message: "L'URL de l'image est requise",
                                              });
                                              return;
                                            }

                                            updateSliderImage(image.id, {
                                              title,
                                              imageUrl,
                                              description,
                                              order,
                                            });

                                            // Reset button to add mode
                                            addButton.textContent = "Ajouter Image au Slider";
                                            addButton.onclick = () => {
                                              const title = (document.getElementById("sliderTitle") as HTMLInputElement)?.value;
                                              const imageUrl = (document.getElementById("sliderImageUrl") as HTMLInputElement)?.value;
                                              const description = (document.getElementById("sliderDescription") as HTMLInputElement)?.value;
                                              const order = parseInt((document.getElementById("sliderOrder") as HTMLInputElement)?.value || "0");

                                              if (!imageUrl) {
                                                setUploadResult({
                                                  success: false,
                                                  message: "L'URL de l'image est requise",
                                                });
                                                return;
                                              }

                                              createSliderImage({
                                                title,
                                                imageUrl,
                                                description,
                                                order,
                                              });
                                            };

                                            // Clear form
                                            (document.getElementById("sliderTitle") as HTMLInputElement).value = "";
                                            (document.getElementById("sliderImageUrl") as HTMLInputElement).value = "";
                                            (document.getElementById("sliderDescription") as HTMLInputElement).value = "";
                                            (document.getElementById("sliderOrder") as HTMLInputElement).value = "";
                                          };
                                        }
                                      }}
                                      className="h-8 w-8 p-0"
                                      title="Modifier"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteSliderImage(image.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      title="Supprimer"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* No Images Message */}
                {sliderImages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Image className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">Aucune image du slider trouvée</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ajoutez votre première image pour commencer
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Upload Result */}
          {uploadResult && (
            <Card
              className={`shadow-lg ${
                uploadResult.success ? "border-green-200" : "border-red-200"
              }`}
            >
              <CardHeader>
                <CardTitle
                  className={`flex items-center text-lg sm:text-xl lg:text-2xl ${
                    uploadResult.success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {uploadResult.success ? (
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  )}
                  {uploadResult.success
                    ? "Téléchargement Réussi"
                    : "Échec du Téléchargement"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm sm:text-base">
                  {uploadResult.message}
                </p>

                {/* Show error details if available */}
                {!uploadResult.success && uploadResult.details && (
                  <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4">
                    <h4 className="font-semibold text-red-800 mb-2 text-sm sm:text-base">
                      Détails de l'erreur:
                    </h4>
                    <pre className="text-xs text-red-700 overflow-auto break-all">
                      {JSON.stringify(uploadResult.details, null, 2)}
                    </pre>
                  </div>
                )}

                {uploadResult.success && uploadResult.stats && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Success Message with Instructions */}
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2" />
                        <h4 className="font-semibold text-green-800 text-sm sm:text-base">
                          Données uploadées avec succès !
                        </h4>
                      </div>
                      <p className="text-green-700 text-xs sm:text-sm mb-3">
                        Les données ont été stockées en base de données et sont
                        maintenant disponibles sur le site.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => window.open("/", "_blank")}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
                        >
                          <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          Voir sur le Site
                        </Button>
                        <Button
                          onClick={getDatabaseInfo}
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                        >
                          <HardDrive className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          Actualiser DB Info
                        </Button>
                      </div>
                    </div>

                    {/* Main Statistics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                        <p className="text-xs sm:text-sm text-blue-600 font-medium">
                          Total Étudiants
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-700">
                          {uploadResult?.stats?.totalStudents || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                        <p className="text-xs sm:text-sm text-green-600 font-medium">
                          Admis
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700">
                          {uploadResult?.stats?.admittedStudents || 0}
                        </p>
                        <p className="text-xs text-green-600">
                          ({uploadResult?.stats?.admissionRate || 0}%)
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
                        <p className="text-xs sm:text-sm text-purple-600 font-medium">
                          Sections
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-700">
                          {uploadResult?.stats?.sections?.length || 0}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
                        <p className="text-xs sm:text-sm text-orange-600 font-medium">
                          Moyenne Générale
                        </p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-700">
                          {uploadResult?.stats?.averageScore || "0.00"}
                        </p>
                      </div>
                    </div>

                    {/* File and Database Info */}
                    {uploadResult?.details && (
                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">
                          Informations du fichier et stockage:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p>
                              <strong>Nom:</strong>{" "}
                              <span className="break-all">
                                {uploadResult.details.name}
                              </span>
                            </p>
                            <p>
                              <strong>Taille:</strong>{" "}
                              {(
                                (uploadResult.details.size || 0) /
                                1024 /
                                1024
                              ).toFixed(2)}
                              MB
                            </p>
                            <p>
                              <strong>Type:</strong>{" "}
                              {uploadResult.details.type || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Stocké:</strong> ✅ Oui (Database
                              PostgreSQL)
                            </p>
                            <p>
                              <strong>Persistant:</strong> ✅ Oui
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detailed Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <p className="font-medium mb-2 text-sm sm:text-base">
                          Sections (SERIE):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {uploadResult?.stats?.sections?.map((section) => (
                            <Badge
                              key={section}
                              variant="secondary"
                              className="text-xs"
                            >
                              {section}
                            </Badge>
                          )) || (
                            <span className="text-xs text-gray-500">
                              Aucune section
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="font-medium mb-2 text-sm sm:text-base">
                          Wilayas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {uploadResult?.stats?.wilayas
                            ?.slice(0, 8)
                            ?.map((wilaya) => (
                              <Badge
                                key={wilaya}
                                variant="outline"
                                className="text-xs"
                              >
                                {wilaya}
                              </Badge>
                            ))}
                          {(uploadResult?.stats?.wilayas?.length || 0) > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{(uploadResult?.stats?.wilayas?.length || 0) - 8}{" "}
                              autres
                            </Badge>
                          )}
                          {(!uploadResult?.stats?.wilayas ||
                            uploadResult.stats.wilayas.length === 0) && (
                            <span className="text-xs text-gray-500">
                              Aucune wilaya
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
