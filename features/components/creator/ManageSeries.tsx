"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Upload,
  CalendarIcon,
  X,
  BookOpen,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ImageIcon,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import type { CurrentView } from "@/types";

interface ManageSeriesProps {
  onViewChange: (view: CurrentView, params?: any) => void;
}

interface Series {
  id: string;
  title: string;
  description: string;
  genre: string;
  genres?: string[]; // Added for multiple genres
  series_type?: string; // Added for manga/manhwa/manhua
  tags?: string[]; // Added for tags
  status: string;
  views: number;
  progress: number;
  image_url?: string;
  square_thumbnail_url?: string; // Added for square thumbnail
  creator_id: string;
  created_at: string;
  updated_at: string;
  chapters?: Chapter[];
  volumes?: Array<{
    id: string;
    volume_number: number;
    title: string;
    description?: string;
    chapters: Array<{
      id: string;
      title: string;
      status: string;
      release_date?: string;
    }>;
  }>;
}

interface Chapter {
  id: string;
  title: string;
  status: string;
  release_date?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

interface UploadedPage {
  id: string;
  file: File;
  preview: string;
  order: number;
}

interface ContentRating {
  violentContent: string;
  nudity: string;
  sexualContent: string;
  profanity: string;
  alcoholDrugs: string;
  sensitiveThemes: string;
}

export function ManageSeries({ onViewChange }: ManageSeriesProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [showChapterUpload, setShowChapterUpload] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  // Chapter upload form
  const [chapterTitle, setChapterTitle] = useState("");
  const [selectedVolume, setSelectedVolume] = useState<string>("");
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>([]);
  const [publishOption, setPublishOption] = useState("publish-now");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState({
    currentPage: 0,
    totalPages: 0,
    currentStep: "",
    isUploading: false,
  });

  // New series form
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDescription, setNewSeriesDescription] = useState("");
  const [newSeriesGenre, setNewSeriesGenre] = useState("");
  const [newSeriesGenres, setNewSeriesGenres] = useState<string[]>([]);
  const [newSeriesType, setNewSeriesType] = useState<string>("");
  const [newSeriesTags, setNewSeriesTags] = useState<string>("");
  const [squareThumbnail, setSquareThumbnail] = useState<File | null>(null);
  const [horizontalThumbnail, setHorizontalThumbnail] = useState<File | null>(
    null
  );
  const [squarePreview, setSquarePreview] = useState<string>("");
  const [horizontalPreview, setHorizontalPreview] = useState<string>("");

  // Content rating form
  const [contentRating, setContentRating] = useState<ContentRating>({
    violentContent: "",
    nudity: "",
    sexualContent: "",
    profanity: "",
    alcoholDrugs: "",
    sensitiveThemes: "",
  });
  const [ratingAcknowledged, setRatingAcknowledged] = useState(false);

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select(
          `
          *,
          volumes(
            *,
            chapters(*)
          )
        `
        )
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSeries(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching series:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const newPages: UploadedPage[] = files.map((file, index) => ({
        id: `page-${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        order: uploadedPages.length + index + 1,
      }));
      setUploadedPages([...uploadedPages, ...newPages]);
    };
    input.click();
  };

  const removePage = (pageId: string) => {
    setUploadedPages(uploadedPages.filter((page) => page.id !== pageId));
  };

  const handleChapterUpload = (series: Series) => {
    setSelectedSeries(series);
    setShowChapterUpload(true);
  };

  const handleThumbnailUpload = (type: "square" | "horizontal") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size
        const maxSize = type === "square" ? 500 * 1024 : 700 * 1024; // 500KB or 700KB
        if (file.size > maxSize) {
          toast.error(
            `File size too large. Maximum size for ${
              type === "square" ? "square" : "horizontal"
            } thumbnail is ${maxSize / 1024}KB`
          );
          return;
        }

        if (type === "square") {
          setSquareThumbnail(file);
          setSquarePreview(URL.createObjectURL(file));
        } else {
          setHorizontalThumbnail(file);
          setHorizontalPreview(URL.createObjectURL(file));
        }
      }
    };
    input.click();
  };

  const publishChapter = async () => {
    console.log("publishChapter called with:", {
      selectedSeries: selectedSeries?.id,
      chapterTitle,
      selectedVolume,
      uploadedPages: uploadedPages.length,
      publishOption,
      scheduleDate,
    });

    if (
      !selectedSeries ||
      !chapterTitle.trim() ||
      !selectedVolume ||
      uploadedPages.length === 0
    ) {
      toast.error(
        "Please fill in all required fields, select a volume, and upload at least one page"
      );
      return;
    }

    if (publishOption === "schedule" && !scheduleDate) {
      toast.error("Please select a schedule date");
      return;
    }

    try {
      setLoading(true);
      setUploadProgress({
        currentPage: 0,
        totalPages: uploadedPages.length,
        currentStep: "Starting chapter publication...",
        isUploading: true,
      });
      console.log("Starting chapter publication...");

      let volumeId = selectedVolume;

      // If creating a new volume, create it first
      if (selectedVolume === "new") {
        setUploadProgress((prev) => ({
          ...prev,
          currentStep: "Creating new volume...",
        }));
        console.log("Creating new volume...");
        const newVolumeNumber = selectedSeries.volumes
          ? selectedSeries.volumes.length + 1
          : 1;
        const { data: volumeData, error: volumeError } = await supabase
          .from("volumes")
          .insert({
            project_id: selectedSeries.id,
            title: `Volume ${newVolumeNumber}: ${selectedSeries.title} Volume ${newVolumeNumber}`,
            volume_number: newVolumeNumber,
            description: `Volume ${newVolumeNumber} of ${selectedSeries.title}`,
          })
          .select()
          .single();

        if (volumeError) {
          console.error("Volume creation error:", volumeError);
          throw volumeError;
        }
        volumeId = volumeData.id;
        console.log("New volume created:", volumeId);
      }

      // Determine chapter status based on publishing option
      let chapterStatus = "Finalized";
      let releaseDate = null;

      if (publishOption === "draft") {
        chapterStatus = "Draft";
      } else if (publishOption === "schedule") {
        chapterStatus = "Finalized";
        releaseDate = scheduleDate?.toISOString();
      }

      setUploadProgress((prev) => ({
        ...prev,
        currentStep: "Creating chapter...",
      }));
      console.log("Creating chapter with status:", chapterStatus);

      // Create the chapter first to get its ID
      const chapterData = {
        volume_id: volumeId,
        title: chapterTitle,
        chapter_number:
          ((selectedSeries.volumes?.find((v) => v.id === volumeId)?.chapters
            ?.length || 0) + 1) || 1,
        content: JSON.stringify([]), // Temporary empty content
        status: chapterStatus,
        release_date: releaseDate,
      };

      console.log("Chapter data to insert:", chapterData);

      const { data: chapterResult, error: chapterError } = await supabase
        .from("chapters")
        .insert(chapterData)
        .select()
        .single();

      if (chapterError) {
        console.error("Chapter creation error:", chapterError);
        throw chapterError;
      }

      console.log("Chapter created successfully:", chapterResult);

      // Now upload pages using the real chapter ID
      setUploadProgress((prev) => ({
        ...prev,
        currentStep: "Uploading pages to storage...",
      }));
      console.log("Uploading pages to storage...");
      const pageUrls: string[] = [];

      // Create project folder name: project-title-project-id
      const projectFolderName = `${selectedSeries.title
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase()}-${selectedSeries.id}`;

      // Get volume info for folder naming - fetch directly from database to ensure we have the latest data
      const { data: volumeData, error: volumeFetchError } = await supabase
        .from("volumes")
        .select("volume_number, title")
        .eq("id", volumeId)
        .single();

      let volumeFolderName = `volume-${volumeId}`;
      if (volumeData && volumeFetchError === null) {
        volumeFolderName = `volume-${volumeData.volume_number}-${volumeId}`;
      }

      // Create chapter folder name using the real chapter ID
      const chapterFolderName = `${chapterTitle
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase()}-${chapterResult.id}`;

      for (let i = 0; i < uploadedPages.length; i++) {
        const page = uploadedPages[i];
        const fileName = `${projectFolderName}/chapters/${volumeFolderName}/${chapterFolderName}/page-${
          i + 1
        }.${page.file.name.split(".").pop()}`;

        setUploadProgress((prev) => ({
          ...prev,
          currentPage: i + 1,
          currentStep: `Uploading page ${i + 1}/${uploadedPages.length}...`,
        }));

        console.log(
          `Uploading page ${i + 1}/${uploadedPages.length}:`,
          fileName
        );

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("series-assets")
          .upload(fileName, page.file);

        if (uploadError) {
          console.error("Error uploading page:", uploadError);
          // Fallback to placeholder for testing
          pageUrls.push("/placeholder.jpg");
        } else {
          const { data: urlData } = supabase.storage
            .from("series-assets")
            .getPublicUrl(fileName);
          pageUrls.push(urlData.publicUrl);
        }
      }

      setUploadProgress((prev) => ({
        ...prev,
        currentStep: "Pages uploaded successfully!",
      }));
      console.log("Pages uploaded, URLs:", pageUrls);

      // Update the chapter with the actual page URLs
      const { error: updateChapterError } = await supabase
        .from("chapters")
        .update({
          content: JSON.stringify(pageUrls),
        })
        .eq("id", chapterResult.id);

      if (updateChapterError) {
        console.error("Error updating chapter with URLs:", updateChapterError);
      }

      // Update project progress if not draft
      if (publishOption !== "draft") {
        setUploadProgress((prev) => ({
          ...prev,
          currentStep: "Updating project progress...",
        }));
        console.log("Updating project progress...");
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            progress: selectedSeries.progress + 1,
            status:
              selectedSeries.status === "Draft"
                ? "In Progress"
                : selectedSeries.status,
          })
          .eq("id", selectedSeries.id);

        if (updateError) {
          console.error("Error updating project progress:", updateError);
        } else {
          console.log("Project progress updated successfully");
        }
      }

      setUploadProgress((prev) => ({
        ...prev,
        currentStep: "Chapter published successfully!",
      }));
      toast.success(
        publishOption === "draft"
          ? "Draft saved successfully!"
          : publishOption === "schedule"
          ? "Chapter scheduled successfully!"
          : "Chapter published successfully!"
      );

      setShowChapterUpload(false);
      resetChapterForm();
      fetchSeries();
    } catch (error: any) {
      console.error("Error in publishChapter:", error);
      toast.error(`Failed to publish chapter: ${error.message || error}`);
    } finally {
      setLoading(false);
      setUploadProgress({
        currentPage: 0,
        totalPages: 0,
        currentStep: "",
        isUploading: false,
      });
    }
  };

  const saveDraft = async () => {
    if (!selectedSeries || !chapterTitle.trim()) {
      toast.error("Please enter a chapter title");
      return;
    }

    // Set publish option to draft and call publishChapter
    setPublishOption("draft");
    await publishChapter();
  };

  const resetChapterForm = () => {
    setChapterTitle("");
    setSelectedVolume("");
    setUploadedPages([]);
    setPublishOption("publish-now");
    setScheduleDate(undefined);
    setSelectedSeries(null);
    setUploadProgress({
      currentPage: 0,
      totalPages: 0,
      currentStep: "",
      isUploading: false,
    });
  };

  const resetSeriesForm = () => {
    setNewSeriesTitle("");
    setNewSeriesDescription("");
    setNewSeriesGenre("");
    setNewSeriesGenres([]);
    setNewSeriesType("");
    setNewSeriesTags("");
    setSquareThumbnail(null);
    setHorizontalThumbnail(null);
    setSquarePreview("");
    setHorizontalPreview("");
    setContentRating({
      violentContent: "",
      nudity: "",
      sexualContent: "",
      profanity: "",
      alcoholDrugs: "",
      sensitiveThemes: "",
    });
    setRatingAcknowledged(false);
  };

  const getContentRating = () => {
    const ratings = Object.values(contentRating).filter((r) => r !== "");
    if (ratings.length === 0) return "All Ages";

    const hasMatureContent = ratings.some((r) => r === "High");
    const hasModerateContent = ratings.some((r) => r === "Moderate");

    if (hasMatureContent) return "Mature (18+)";
    if (hasModerateContent) return "Teen (13+)";
    return "All Ages";
  };

  const createNewSeries = async () => {
    if (
      !user ||
      !newSeriesTitle.trim() ||
      !newSeriesDescription.trim() ||
      newSeriesGenres.length === 0 ||
      !newSeriesType ||
      !squareThumbnail ||
      !horizontalThumbnail ||
      !ratingAcknowledged
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // First, create the project to get its ID
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: newSeriesTitle,
          description: newSeriesDescription,
          genre: newSeriesGenres.join(", "), // Keep for backward compatibility
          genres: newSeriesGenres, // Store as array for new functionality
          series_type: newSeriesType,
          tags: getTagsArray(),
          status: "Draft",
          creator_id: user.id,
          views: 0,
          progress: 0,
          content_rating: getContentRating(),
          content_rating_details: contentRating,
          square_thumbnail_url: "/placeholder.jpg", // Temporary placeholder
          horizontal_thumbnail_url: "/placeholder.jpg", // Temporary placeholder
        })
        .select()
        .single();

      if (projectError) {
        console.error("Error creating project:", projectError);
        toast.error("Failed to create series");
        return;
      }

      // Now upload thumbnails using the new structure
      let squareThumbnailUrl = "/placeholder.jpg";
      let horizontalThumbnailUrl = "/placeholder.jpg";

      try {
        // Create project folder name: project-title-project-id
        const projectFolderName = `${newSeriesTitle
          .replace(/[^a-zA-Z0-9]/g, "-")
          .toLowerCase()}-${projectData.id}`;

        // Upload square thumbnail
        const squareFileName = `${projectFolderName}/thumbnails/square.${squareThumbnail.name
          .split(".")
          .pop()}`;
        const { data: squareData, error: squareError } = await supabase.storage
          .from("series-assets")
          .upload(squareFileName, squareThumbnail);

        if (squareError) {
          console.error("Error uploading square thumbnail:", squareError);
          toast.warning("Failed to upload square thumbnail, using placeholder");
        } else {
          // Get public URL for the uploaded file
          const { data: squareUrl } = supabase.storage
            .from("series-assets")
            .getPublicUrl(squareFileName);
          squareThumbnailUrl = squareUrl.publicUrl;
        }

        // Upload horizontal thumbnail
        const horizontalFileName = `${projectFolderName}/thumbnails/wide.${horizontalThumbnail.name
          .split(".")
          .pop()}`;
        const { data: horizontalData, error: horizontalError } =
          await supabase.storage
            .from("series-assets")
            .upload(horizontalFileName, horizontalThumbnail);

        if (horizontalError) {
          console.error(
            "Error uploading horizontal thumbnail:",
            horizontalError
          );
          toast.warning(
            "Failed to upload horizontal thumbnail, using placeholder"
          );
        } else {
          // Get public URL for the uploaded file
          const { data: horizontalUrl } = supabase.storage
            .from("series-assets")
            .getPublicUrl(horizontalFileName);
          horizontalThumbnailUrl = horizontalUrl.publicUrl;
        }

        // Update the project with the actual thumbnail URLs
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            square_thumbnail_url: squareThumbnailUrl,
            horizontal_thumbnail_url: horizontalThumbnailUrl,
          })
          .eq("id", projectData.id);

        if (updateError) {
          console.error("Error updating project with thumbnails:", updateError);
        }
      } catch (storageError) {
        console.error("Storage bucket error:", storageError);
        toast.warning("Storage upload failed, using placeholder images");
      }

      toast.success("Series created successfully!");
      setShowNewSeries(false);
      resetSeriesForm();
      fetchSeries();
    } catch (error: any) {
      console.error("Error creating series:", error);
      toast.error("Failed to create series");
    } finally {
      setLoading(false);
    }
  };

  const truncateSynopsis = (text: string, maxLength: number) => {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + "...";
  };

  // Available genres and series types
  const availableGenres = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Fantasy",
    "Horror",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Supernatural",
  ];

  const seriesTypes = [
    { value: "manga", label: "Manga (Japanese)" },
    { value: "manhwa", label: "Manhwa (Korean)" },
    { value: "manhua", label: "Manhua (Chinese)" },
  ];

  // Helper functions for genres and tags
  const handleGenreToggle = (genre: string) => {
    setNewSeriesGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleTagsChange = (value: string) => {
    setNewSeriesTags(value);
  };

  const getTagsArray = () => {
    return newSeriesTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Manage Series</h1>
        <p className="text-gray-400">
          Create and manage your manga, manhwa, and manhua series
        </p>
      </div>

      {/* My Series Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">My Series</h2>
          <Button
            onClick={() => setShowNewSeries(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Series
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading series...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Error loading series: {error}</p>
            <Button
              onClick={fetchSeries}
              variant="outline"
              size="sm"
              className="mt-2 border-red-500 text-red-400 hover:bg-red-500/10"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Series Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map((seriesItem) => (
              <Card
                key={seriesItem.id}
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {seriesItem.square_thumbnail_url ? (
                        <img
                          src={seriesItem.square_thumbnail_url}
                          alt={seriesItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg">
                            {seriesItem.title}
                          </CardTitle>
                          <p className="text-sm text-gray-400 mt-1">
                            {truncateSynopsis(seriesItem.description, 100)}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-700 text-gray-300"
                        >
                          {seriesItem.genre}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{seriesItem.views} views</span>
                    <span>{seriesItem.chapters?.length || 0} chapters</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-200 hover:bg-gray-700"
                      onClick={() => handleChapterUpload(seriesItem)}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload Chapter
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() =>
                        onViewChange("project-detail", { id: seriesItem.id })
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && series.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No series found
            </h3>
            <p className="text-gray-400 mb-4">
              Create your first series to start publishing content
            </p>
            <Button
              onClick={() => setShowNewSeries(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Series
            </Button>
          </div>
        )}
      </div>

      {/* Chapter Upload Modal */}
      <Dialog open={showChapterUpload} onOpenChange={setShowChapterUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Upload New Chapter
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedSeries
                ? `Adding chapter to "${selectedSeries.title}"`
                : "Upload your first chapter"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Chapter Title Input */}
              <div className="space-y-2">
                <Label htmlFor="chapter-title" className="text-white">
                  Chapter Title *
                </Label>
                <Input
                  id="chapter-title"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g., Chapter 1: The Awakening"
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                />
              </div>

              {/* Volume Selection */}
              <div className="space-y-2">
                <Label className="text-white">Volume *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Existing Volumes */}
                  {selectedSeries?.volumes &&
                    selectedSeries.volumes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-400">
                          Existing Volumes:
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedSeries.volumes.map((volume) => (
                            <div
                              key={volume.id}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                selectedVolume === volume.id
                                  ? "border-red-500 bg-red-500/10"
                                  : "border-gray-600 bg-gray-800 hover:border-gray-500"
                              }`}
                              onClick={() => setSelectedVolume(volume.id)}
                            >
                              <div className="text-sm font-medium text-white">
                                {volume.title}
                              </div>
                              <div className="text-xs text-gray-400">
                                {volume.chapters.length} chapters
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Create New Volume */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">
                      Or Create New Volume:
                    </div>
                    <div
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedVolume === "new"
                          ? "border-red-500 bg-red-500/10"
                          : "border-gray-600 bg-gray-800 hover:border-gray-500"
                      }`}
                      onClick={() => setSelectedVolume("new")}
                    >
                      <div className="text-sm font-medium text-white">
                        Volume{" "}
                        {selectedSeries?.volumes
                          ? selectedSeries.volumes.length + 1
                          : 1}
                      </div>
                      <div className="text-xs text-gray-400">New volume</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div className="space-y-2">
                <Label className="text-white">Chapter Pages *</Label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-gray-800 hover:border-gray-500 transition-colors">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-2 text-white">
                    Drag and drop your pages here
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Recommended: 1700x2400px, JPG/PNG/GIF, max 10MB per image
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleFileUpload}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Browse Files
                  </Button>
                </div>
              </div>

              {/* Page Preview Grid */}
              {uploadedPages.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-white">
                    Page Order Preview ({uploadedPages.length} pages)
                  </Label>
                  <div className="grid grid-cols-4 gap-4 max-h-64 overflow-y-auto p-2 border border-gray-600 rounded bg-gray-800">
                    {uploadedPages.map((page) => (
                      <div key={page.id} className="relative group">
                        <div className="aspect-[3/4] relative border border-gray-600 rounded overflow-hidden bg-gray-700">
                          <img
                            src={page.preview}
                            alt={`Page ${page.order}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                            {page.order}
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => removePage(page.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Publishing Options */}
              <div className="space-y-2">
                <Label className="text-white">Publishing Options</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      publishOption === "publish-now"
                        ? "border-red-500 bg-red-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setPublishOption("publish-now")}
                  >
                    <div className="text-sm font-medium text-white">
                      Publish Now
                    </div>
                    <div className="text-xs text-gray-400">
                      Make chapter immediately visible
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      publishOption === "schedule"
                        ? "border-red-500 bg-red-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setPublishOption("schedule")}
                  >
                    <div className="text-sm font-medium text-white">
                      Schedule for Later
                    </div>
                    <div className="text-xs text-gray-400">
                      Set a future release date
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      publishOption === "draft"
                        ? "border-red-500 bg-red-500/10"
                        : "border-gray-600 bg-gray-800 hover:border-gray-500"
                    }`}
                    onClick={() => setPublishOption("draft")}
                  >
                    <div className="text-sm font-medium text-white">
                      Save as Draft
                    </div>
                    <div className="text-xs text-gray-400">
                      Keep private for now
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Date Picker */}
              {publishOption === "schedule" && (
                <div className="space-y-2">
                  <Label className="text-white">Schedule Release *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduleDate
                          ? format(scheduleDate, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-600">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                        className="bg-gray-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Upload Progress Indicator */}
          {uploadProgress.isUploading && (
            <div className="border-t border-gray-700 pt-4 mb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {uploadProgress.currentStep}
                  </span>
                  {uploadProgress.totalPages > 0 && (
                    <span className="text-sm text-gray-400">
                      {uploadProgress.currentPage}/{uploadProgress.totalPages}
                    </span>
                  )}
                </div>

                {uploadProgress.totalPages > 0 && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (uploadProgress.currentPage /
                            uploadProgress.totalPages) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  {uploadProgress.currentPage > 0 &&
                  uploadProgress.totalPages > 0
                    ? `Uploading page ${uploadProgress.currentPage} of ${uploadProgress.totalPages}...`
                    : uploadProgress.currentStep}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-gray-700 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowChapterUpload(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={saveDraft}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Save Draft
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={publishChapter}
              disabled={
                !chapterTitle.trim() ||
                !selectedVolume ||
                uploadedPages.length === 0 ||
                (publishOption === "schedule" && !scheduleDate)
              }
            >
              {publishOption === "schedule"
                ? "Schedule Chapter"
                : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Series Modal */}
      <Dialog open={showNewSeries} onOpenChange={setShowNewSeries}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">
              Create New Series
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Start a new manga, manhwa, or manhua series
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Basic Information
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="series-title" className="text-white">
                    Series Title *
                  </Label>
                  <Input
                    id="series-title"
                    value={newSeriesTitle}
                    onChange={(e) => setNewSeriesTitle(e.target.value)}
                    placeholder="Enter series title"
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="series-description" className="text-white">
                    Description *
                  </Label>
                  <Textarea
                    id="series-description"
                    value={newSeriesDescription}
                    onChange={(e) => setNewSeriesDescription(e.target.value)}
                    placeholder="Describe your series..."
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                    rows={3}
                  />
                </div>

                {/* Series Type Selection */}
                <div className="space-y-2">
                  <Label className="text-white">Series Type *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {seriesTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          newSeriesType === type.value
                            ? "border-red-500 bg-red-500/10"
                            : "border-gray-600 bg-gray-800 hover:border-gray-500"
                        }`}
                        onClick={() => setNewSeriesType(type.value)}
                      >
                        <div className="text-sm font-medium text-white">
                          {type.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Genres Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Genres *
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableGenres.map((genre) => (
                    <div key={genre} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${genre}`}
                        checked={newSeriesGenres.includes(genre)}
                        onCheckedChange={() => handleGenreToggle(genre)}
                        className="border-gray-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      />
                      <Label
                        htmlFor={`genre-${genre}`}
                        className="text-sm text-gray-300 cursor-pointer"
                      >
                        {genre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Tags
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="series-tags" className="text-white">
                    Tags
                  </Label>
                  <Input
                    id="series-tags"
                    value={newSeriesTags}
                    onChange={(e) => handleTagsChange(e.target.value)}
                    placeholder="e.g., isekai, magic, adventure (comma-separated)"
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500">
                    Add tags to help readers discover your series. Separate
                    multiple tags with commas.
                  </p>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Series Thumbnails *
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Square Thumbnail */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium text-white">
                        Square Thumbnail
                      </Label>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center bg-gray-800 hover:border-gray-500 transition-colors">
                      {squarePreview ? (
                        <div className="space-y-2">
                          <img
                            src={squarePreview}
                            alt="Square thumbnail preview"
                            className="w-32 h-32 mx-auto object-cover rounded"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSquareThumbnail(null);
                              setSquarePreview("");
                            }}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-400 mb-2">
                            Select an image to upload
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            Or drag the image file here
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => handleThumbnailUpload("square")}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Browse Files
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Image size must be 620x620px</p>
                      <p>• Image must be less than 500KB</p>
                      <p>• Only JPG, JPEG, and PNG formats are allowed</p>
                    </div>
                  </div>

                  {/* Horizontal Thumbnail */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium text-white">
                        Horizontal Thumbnail
                      </Label>
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center bg-gray-800 hover:border-gray-500 transition-colors">
                      {horizontalPreview ? (
                        <div className="space-y-2">
                          <img
                            src={horizontalPreview}
                            alt="Horizontal thumbnail preview"
                            className="w-48 h-24 mx-auto object-cover rounded"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHorizontalThumbnail(null);
                              setHorizontalPreview("");
                            }}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-400 mb-2">
                            Select an image to upload
                          </p>
                          <p className="text-sm text-gray-500 mb-4">
                            Or drag the image file here
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => handleThumbnailUpload("horizontal")}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Browse Files
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Image size must be 1240x620px</p>
                      <p>• Image must be less than 700KB</p>
                      <p>• Only JPG, JPEG, and PNG formats are allowed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Rating */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  Content Advisory
                </h3>
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Violent Content</Label>
                        <select
                          value={contentRating.violentContent}
                          onChange={(e) =>
                            setContentRating({
                              ...contentRating,
                              violentContent: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Select level</option>
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="intense">Intense</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Nudity</Label>
                        <select
                          value={contentRating.nudity}
                          onChange={(e) =>
                            setContentRating({
                              ...contentRating,
                              nudity: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Select level</option>
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="explicit">Explicit</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Sexual Content</Label>
                        <select
                          value={contentRating.sexualContent}
                          onChange={(e) =>
                            setContentRating({
                              ...contentRating,
                              sexualContent: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Select level</option>
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="explicit">Explicit</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Profanity</Label>
                        <select
                          value={contentRating.profanity}
                          onChange={(e) =>
                            setContentRating({
                              ...contentRating,
                              profanity: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Select level</option>
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="frequent">Frequent</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Alcohol/Drugs</Label>
                        <select
                          value={contentRating.alcoholDrugs}
                          onChange={(e) =>
                            setContentRating({
                              ...contentRating,
                              alcoholDrugs: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Select level</option>
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="frequent">Frequent</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Sensitive Themes</Label>
                        <select
                          value={contentRating.sensitiveThemes}
                          onChange={(e) =>
                            setContentRating({
                              ...contentRating,
                              sensitiveThemes: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="">Select level</option>
                          <option value="none">None</option>
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="intense">Intense</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="rating-acknowledged"
                    checked={ratingAcknowledged}
                    onCheckedChange={(checked) =>
                      setRatingAcknowledged(checked as boolean)
                    }
                    className="border-gray-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 mt-1"
                  />
                  <Label
                    htmlFor="rating-acknowledged"
                    className="text-sm text-gray-300 leading-relaxed"
                  >
                    I acknowledge that I have accurately assessed the content
                    rating for my series and understand the responsibility of
                    providing appropriate content warnings.
                  </Label>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-gray-700 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowNewSeries(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={createNewSeries}
              disabled={
                !newSeriesTitle.trim() ||
                !newSeriesDescription.trim() ||
                newSeriesGenres.length === 0 ||
                !newSeriesType ||
                !squareThumbnail ||
                !horizontalThumbnail ||
                !ratingAcknowledged
              }
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Create Series
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
