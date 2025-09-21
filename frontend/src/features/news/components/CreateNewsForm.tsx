import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, FileText, Link, Image, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateNewsMutation } from "../hooks/mutations/useCreateNews.mutation";
import { NewsCategory, CATEGORY_COLORS } from "../data/news.schema";
import type { CreateNewsRequest } from "../data/news.schema";

interface CreateNewsFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateNewsForm = ({ onSuccess, onCancel }: CreateNewsFormProps) => {
  const { createNews, isLoading, error } = useCreateNewsMutation();

  // Form state
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<NewsCategory | "">("");
  const [isPublic, setIsPublic] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    source?: string;
    title?: string;
    summary?: string;
    link?: string;
    imageUrl?: string;
    category?: string;
  }>({});

  const [serverError, setServerError] = useState<string>("");
  const [touched, setTouched] = useState<{
    source?: boolean;
    title?: boolean;
    summary?: boolean;
    link?: boolean;
    imageUrl?: boolean;
    category?: boolean;
  }>({});

  // Validation functions
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'source':
        if (!value.trim()) {
          newErrors.source = "Source is required";
        } else if (value.length < 2) {
          newErrors.source = "Source must be at least 2 characters";
        } else if (value.length > 100) {
          newErrors.source = "Source must be less than 100 characters";
        } else {
          delete newErrors.source;
        }
        break;
      case 'title':
        if (!value.trim()) {
          newErrors.title = "Title is required";
        } else if (value.length < 5) {
          newErrors.title = "Title must be at least 5 characters";
        } else if (value.length > 200) {
          newErrors.title = "Title must be less than 200 characters";
        } else {
          delete newErrors.title;
        }
        break;
      case 'summary':
        if (!value.trim()) {
          newErrors.summary = "Summary is required";
        } else if (value.length < 10) {
          newErrors.summary = "Summary must be at least 10 characters";
        } else if (value.length > 500) {
          newErrors.summary = "Summary must be less than 500 characters";
        } else {
          delete newErrors.summary;
        }
        break;
      case 'link':
        if (!value.trim()) {
          newErrors.link = "Link is required";
        } else if (!/^https?:\/\/.+\..+/.test(value)) {
          newErrors.link = "Please enter a valid URL (starting with http:// or https://)";
        } else {
          delete newErrors.link;
        }
        break;
      case 'imageUrl':
        if (value && !/^https?:\/\/.+\..+/.test(value)) {
          newErrors.imageUrl = "Please enter a valid URL (starting with http:// or https://)";
        } else {
          delete newErrors.imageUrl;
        }
        break;
      case 'category':
        if (!value) {
          newErrors.category = "Category is required";
        } else {
          delete newErrors.category;
        }
        break;
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const value = field === 'source' ? source
      : field === 'title' ? title
      : field === 'summary' ? summary
      : field === 'link' ? link
      : field === 'imageUrl' ? imageUrl
      : field === 'category' ? category
      : '';
    validateField(field, value);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!source.trim()) {
      newErrors.source = "Source is required";
    } else if (source.length < 2 || source.length > 100) {
      newErrors.source = "Source must be between 2 and 100 characters";
    }

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 5 || title.length > 200) {
      newErrors.title = "Title must be between 5 and 200 characters";
    }

    if (!summary.trim()) {
      newErrors.summary = "Summary is required";
    } else if (summary.length < 10 || summary.length > 500) {
      newErrors.summary = "Summary must be between 10 and 500 characters";
    }

    if (!link.trim()) {
      newErrors.link = "Link is required";
    } else if (!/^https?:\/\/.+\..+/.test(link)) {
      newErrors.link = "Please enter a valid URL";
    }

    if (imageUrl && !/^https?:\/\/.+\..+/.test(imageUrl)) {
      newErrors.imageUrl = "Please enter a valid URL";
    }

    if (!category) {
      newErrors.category = "Category is required";
    }

    setErrors(newErrors);
    setTouched({
      source: true,
      title: true,
      summary: true,
      link: true,
      imageUrl: true,
      category: true,
    });
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) {
      return;
    }

    const data: CreateNewsRequest = {
      source: source.trim(),
      title: title.trim(),
      summary: summary.trim(),
      link: link.trim(),
      image_url: imageUrl.trim() || undefined,
      category: category as NewsCategory,
      is_public: isPublic,
    };

    createNews(data, {
      onSuccess: () => {
        // Reset form
        setSource("");
        setTitle("");
        setSummary("");
        setLink("");
        setImageUrl("");
        setCategory("");
        setIsPublic(false);
        setErrors({});
        setTouched({});

        onSuccess?.();
      },
      onError: (err: any) => {
        const errorMessage = err?.response?.data?.detail || err?.message || "Failed to create news item. Please try again.";
        setServerError(errorMessage);
      }
    });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {/* Global server error alert */}
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Source and Category Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Source Field */}
        <div className="space-y-2">
          <Label
            htmlFor="source"
            className={cn(
              "text-sm font-medium",
              touched.source && errors.source ? "text-destructive" : "text-gray-700"
            )}
          >
            Source
          </Label>
          <div className="relative">
            <Building2 className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
              touched.source && errors.source ? "text-destructive" : "text-gray-400"
            )} />
            <Input
              id="source"
              type="text"
              placeholder="TechCrunch"
              className={cn(
                "pl-10 h-11 transition-all duration-200",
                touched.source && errors.source
                  ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                  : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
              )}
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                if (touched.source) {
                  validateField('source', e.target.value);
                }
              }}
              onBlur={() => handleBlur('source')}
              aria-invalid={touched.source && !!errors.source}
              aria-describedby={errors.source ? "source-error" : undefined}
            />
          </div>
          {touched.source && errors.source && (
            <div id="source-error" className="flex items-center space-x-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.source}</span>
            </div>
          )}
        </div>

        {/* Category Field */}
        <div className="space-y-2">
          <Label
            htmlFor="category"
            className={cn(
              "text-sm font-medium",
              touched.category && errors.category ? "text-destructive" : "text-gray-700"
            )}
          >
            Category
          </Label>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value as NewsCategory);
              if (touched.category) {
                validateField('category', value);
              }
            }}
          >
            <SelectTrigger
              className={cn(
                "h-11 transition-all duration-200",
                touched.category && errors.category
                  ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                  : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
              )}
              onBlur={() => handleBlur('category')}
              aria-invalid={touched.category && !!errors.category}
              aria-describedby={errors.category ? "category-error" : undefined}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(NewsCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-3 h-3 rounded-full", CATEGORY_COLORS[cat])} />
                    <span className="capitalize">{cat}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {touched.category && errors.category && (
            <div id="category-error" className="flex items-center space-x-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.category}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title Field */}
      <div className="space-y-2">
        <Label
          htmlFor="title"
          className={cn(
            "text-sm font-medium",
            touched.title && errors.title ? "text-destructive" : "text-gray-700"
          )}
        >
          Title
        </Label>
        <div className="relative">
          <FileText className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            touched.title && errors.title ? "text-destructive" : "text-gray-400"
          )} />
          <Input
            id="title"
            type="text"
            placeholder="Enter the news title"
            className={cn(
              "pl-10 h-11 transition-all duration-200",
              touched.title && errors.title
                ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (touched.title) {
                validateField('title', e.target.value);
              }
            }}
            onBlur={() => handleBlur('title')}
            aria-invalid={touched.title && !!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
        </div>
        {touched.title && errors.title && (
          <div id="title-error" className="flex items-center space-x-1 text-sm text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{errors.title}</span>
          </div>
        )}
      </div>

      {/* Summary Field */}
      <div className="space-y-2">
        <Label
          htmlFor="summary"
          className={cn(
            "text-sm font-medium",
            touched.summary && errors.summary ? "text-destructive" : "text-gray-700"
          )}
        >
          Summary
        </Label>
        <Textarea
          id="summary"
          placeholder="Write a brief summary of the news article..."
          className={cn(
            "min-h-20 resize-y transition-all duration-200",
            touched.summary && errors.summary
              ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
              : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
          )}
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            if (touched.summary) {
              validateField('summary', e.target.value);
            }
          }}
          onBlur={() => handleBlur('summary')}
          aria-invalid={touched.summary && !!errors.summary}
          aria-describedby={errors.summary ? "summary-error" : "summary-counter"}
        />
        <div className="flex justify-between items-center">
          {touched.summary && errors.summary ? (
            <div id="summary-error" className="flex items-center space-x-1 text-sm text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{errors.summary}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Summary should be between 10-500 characters
            </p>
          )}
          <span id="summary-counter" className="text-xs text-gray-500">
            {summary.length}/500
          </span>
        </div>
      </div>

      {/* Link Field */}
      <div className="space-y-2">
        <Label
          htmlFor="link"
          className={cn(
            "text-sm font-medium",
            touched.link && errors.link ? "text-destructive" : "text-gray-700"
          )}
        >
          Link
        </Label>
        <div className="relative">
          <Link className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            touched.link && errors.link ? "text-destructive" : "text-gray-400"
          )} />
          <Input
            id="link"
            type="url"
            placeholder="https://example.com/article"
            className={cn(
              "pl-10 h-11 transition-all duration-200",
              touched.link && errors.link
                ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              if (touched.link) {
                validateField('link', e.target.value);
              }
            }}
            onBlur={() => handleBlur('link')}
            aria-invalid={touched.link && !!errors.link}
            aria-describedby={errors.link ? "link-error" : undefined}
          />
        </div>
        {touched.link && errors.link && (
          <div id="link-error" className="flex items-center space-x-1 text-sm text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{errors.link}</span>
          </div>
        )}
      </div>

      {/* Image URL Field */}
      <div className="space-y-2">
        <Label
          htmlFor="imageUrl"
          className={cn(
            "text-sm font-medium",
            touched.imageUrl && errors.imageUrl ? "text-destructive" : "text-gray-700"
          )}
        >
          Image URL (Optional)
        </Label>
        <div className="relative">
          <Image className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            touched.imageUrl && errors.imageUrl ? "text-destructive" : "text-gray-400"
          )} />
          <Input
            id="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            className={cn(
              "pl-10 h-11 transition-all duration-200",
              touched.imageUrl && errors.imageUrl
                ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
                : "focus:ring-2 focus:ring-primary/20 focus:border-primary"
            )}
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (touched.imageUrl) {
                validateField('imageUrl', e.target.value);
              }
            }}
            onBlur={() => handleBlur('imageUrl')}
            aria-invalid={touched.imageUrl && !!errors.imageUrl}
            aria-describedby={errors.imageUrl ? "imageUrl-error" : undefined}
          />
        </div>
        {touched.imageUrl && errors.imageUrl && (
          <div id="imageUrl-error" className="flex items-center space-x-1 text-sm text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{errors.imageUrl}</span>
          </div>
        )}
      </div>

      {/* Public Switch */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
        <Switch
          id="isPublic"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
        <div className="space-y-0.5">
          <Label
            htmlFor="isPublic"
            className="text-sm font-medium cursor-pointer"
          >
            Make this news public
          </Label>
          <p className="text-xs text-gray-500">
            Public news can be seen by all users
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200",
            "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Creating...</span>
            </div>
          ) : (
            "Create News"
          )}
        </Button>
      </div>
    </form>
  );
};