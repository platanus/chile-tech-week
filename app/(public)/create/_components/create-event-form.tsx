'use client';

import { Plus, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CommuneSelector } from '@/src/components/commune-selector';
import { EventCalendar } from '@/src/components/event-calendar';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { DateTimePicker } from '@/src/components/ui/datetime-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { useFormAction } from '@/src/hooks/use-form-action';
import type { EventAudience, EventTheme } from '@/src/lib/db/schema';
import { eventFormats } from '@/src/lib/db/schema';
import {
  type CreateEventFormData,
  createEventFormSchema,
  eventFormatLabels,
} from '@/src/lib/schemas/events.schema';
import { uploadImageFile } from '@/src/lib/utils/blob';
import { checkImageContrast } from '@/src/lib/utils/contrast';
import type { EventCountByHour } from '@/src/queries/events';
import { createEventAction } from '../_actions/create-event.action';

interface CreateEventFormProps {
  themes: EventTheme[];
  audiences: EventAudience[];
  eventCounts: EventCountByHour[];
}

export function CreateEventForm({
  themes,
  audiences,
  eventCounts,
}: CreateEventFormProps) {
  const searchParams = useSearchParams();

  // Helper to get a URL param with fallback
  const getParam = (key: string, fallback: string = '') =>
    searchParams.get(key) || fallback;

  // Helper to parse date from URL param
  const parseDate = (dateParam: string | null) => {
    if (!dateParam) return undefined;
    try {
      return new Date(dateParam);
    } catch {
      return undefined;
    }
  };

  // Helper function to get default values from query params
  const getDefaultValuesFromParams = (): Partial<CreateEventFormData> => ({
    authorEmail: getParam('authorEmail'),
    authorName: getParam('authorName'),
    companyName: getParam('companyName'),
    companyWebsite: getParam('companyWebsite'),
    authorPhoneNumber: getParam('authorPhoneNumber'),
    title: getParam('title'),
    description: getParam('description'),
    commune: getParam('commune'),
    format: parseEventFormat(searchParams.get('format')),
    capacity: searchParams.get('capacity')
      ? Number(searchParams.get('capacity'))
      : undefined,
    startDate: parseDate(searchParams.get('startDate')),
    endDate: parseDate(searchParams.get('endDate')),
    // Don't set companyLogoUrl and logoFile here - they need to be uploaded
  });

  // Helper function to parse event format from URL param
  const parseEventFormat = (formatParam: string | null) => {
    if (!formatParam) return undefined;

    // Try direct match first
    if (eventFormats.includes(formatParam as any)) {
      return formatParam as any;
    }

    // Try fuzzy matching by removing spaces and converting to lowercase
    const normalizedParam = formatParam.toLowerCase().replace(/[^a-z]/g, '');
    const match = eventFormats.find((format) => {
      const normalizedFormat = format.toLowerCase().replace(/[^a-z]/g, '');
      return normalizedFormat === normalizedParam;
    });

    return match || undefined;
  };

  // Generic helper to match items by ID, slug, name, or partial name
  const findMatchingIds = <
    T extends { id: string; slug: string; name: string },
  >(
    items: T[],
    searchTerms: string[],
  ): string[] => {
    return searchTerms
      .map((term) => {
        const lowerTerm = term.toLowerCase();

        // Try exact ID match first
        const exactMatch = items.find((item) => item.id === term);
        if (exactMatch) return exactMatch.id;

        // Try slug match
        const slugMatch = items.find((item) => item.slug === lowerTerm);
        if (slugMatch) return slugMatch.id;

        // Try name match (case insensitive)
        const nameMatch = items.find(
          (item) => item.name.toLowerCase() === lowerTerm,
        );
        if (nameMatch) return nameMatch.id;

        // Try partial name match
        const partialMatch = items.find(
          (item) =>
            item.name.toLowerCase().includes(lowerTerm) ||
            lowerTerm.includes(item.name.toLowerCase()),
        );

        return partialMatch?.id || term; // fallback to original if no match
      })
      .filter(Boolean);
  };

  // Helper to parse comma-separated IDs from URL params
  const parseCommaSeparatedIds = <
    T extends { id: string; slug: string; name: string },
  >(
    param: string | null,
    items: T[],
  ): string[] => {
    if (!param) return [];
    return findMatchingIds(items, param.split(',').filter(Boolean));
  };

  // Get initial values from URL params
  const urlDefaults = getDefaultValuesFromParams();
  const initialThemeIds = parseCommaSeparatedIds(
    searchParams.get('themeIds'),
    themes,
  );
  const initialAudienceIds = parseCommaSeparatedIds(
    searchParams.get('audienceIds'),
    audiences,
  );

  // Parse cohosts from URL params
  const parseCohostsFromParams = () => {
    const cohosts = [];
    let index = 0;

    while (searchParams.get(`cohost${index}_companyName`)) {
      const getParam = (field: string) =>
        searchParams.get(`cohost${index}_${field}`) || '';

      cohosts.push({
        companyName: getParam('companyName'),
        companyLogoUrl: '',
        logoFile: new File([], ''),
        primaryContactName: getParam('primaryContactName'),
        primaryContactEmail: getParam('primaryContactEmail'),
        primaryContactPhoneNumber: getParam('primaryContactPhoneNumber'),
        primaryContactWebsite: getParam('primaryContactWebsite'),
        primaryContactLinkedin: getParam('primaryContactLinkedin'),
      });
      index++;
    }

    return cohosts;
  };

  const initialCohosts = parseCohostsFromParams();
  const [cohosts, setCohosts] = useState<number[]>(
    initialCohosts.map((_, i) => i),
  );
  const [selectedThemes, setSelectedThemes] =
    useState<string[]>(initialThemeIds);
  const [selectedAudiences, setSelectedAudiences] =
    useState<string[]>(initialAudienceIds);
  const [durationWarning, setDurationWarning] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [modalPreviewUrl, setModalPreviewUrl] = useState<string | null>(null);
  const [modalSelectedFile, setModalSelectedFile] = useState<File | null>(null);
  const [contrastCheckResult, setContrastCheckResult] = useState<{
    contrastRatio: number;
    isGoodContrast: boolean;
  } | null>(null);
  const [isCheckingContrast, setIsCheckingContrast] = useState(false);
  const [modalTargetType, setModalTargetType] = useState<'main' | 'cohost'>(
    'main',
  );
  const [modalCohostIndex, setModalCohostIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Cohost logo states
  const [cohostLogoPreviews, setCohostLogoPreviews] = useState<
    (string | null)[]
  >([]);
  const [cohostLogoUploading, setCohostLogoUploading] = useState<boolean[]>([]);
  const [cohostLogoUploadProgress, setCohostLogoUploadProgress] = useState<
    number[]
  >([]);
  const [cohostLogoUploadErrors, setCohostLogoUploadErrors] = useState<
    (string | null)[]
  >([]);
  const cohostFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize cohost logo states based on initial cohosts from URL params
  useEffect(() => {
    if (initialCohosts.length > 0) {
      setCohostLogoPreviews(new Array(initialCohosts.length).fill(null));
      setCohostLogoUploading(new Array(initialCohosts.length).fill(false));
      setCohostLogoUploadProgress(new Array(initialCohosts.length).fill(0));
      setCohostLogoUploadErrors(new Array(initialCohosts.length).fill(null));
    }
  }, []);

  const addCohost = () => {
    if (cohosts.length < 3) {
      setCohosts([...cohosts, cohosts.length]);
      // Initialize logo states for new cohost
      setCohostLogoPreviews([...cohostLogoPreviews, null]);
      setCohostLogoUploading([...cohostLogoUploading, false]);
      setCohostLogoUploadProgress([...cohostLogoUploadProgress, 0]);
      setCohostLogoUploadErrors([...cohostLogoUploadErrors, null]);
    }
  };

  const removeCohost = (index: number) => {
    const newCohosts = cohosts.filter((_, i) => i !== index);
    setCohosts(newCohosts);

    // Remove the cohost data from form
    const currentCohosts = form.getValues('cohosts') || [];
    currentCohosts.splice(index, 1);
    form.setValue('cohosts', currentCohosts, { shouldValidate: true });

    // Clear validation errors for the removed cohost
    form.clearErrors('cohosts');

    // Remove logo states for this cohost
    const newPreviews = cohostLogoPreviews.filter((_, i) => i !== index);
    const newUploading = cohostLogoUploading.filter((_, i) => i !== index);
    const newProgress = cohostLogoUploadProgress.filter((_, i) => i !== index);
    const newErrors = cohostLogoUploadErrors.filter((_, i) => i !== index);

    setCohostLogoPreviews(newPreviews);
    setCohostLogoUploading(newUploading);
    setCohostLogoUploadProgress(newProgress);
    setCohostLogoUploadErrors(newErrors);
  };

  const removeTheme = (themeId: string) => {
    const newSelectedThemes = selectedThemes.filter((id) => id !== themeId);
    setSelectedThemes(newSelectedThemes);
    form.setValue('themeIds', newSelectedThemes, { shouldValidate: true });
  };

  const removeAudience = (audienceId: string) => {
    const newSelectedAudiences = selectedAudiences.filter(
      (id) => id !== audienceId,
    );
    setSelectedAudiences(newSelectedAudiences);
    form.setValue('audienceIds', newSelectedAudiences, {
      shouldValidate: true,
    });
  };

  const checkEventDuration = (
    startDate: Date | undefined,
    endDate: Date | undefined,
  ) => {
    if (!startDate || !endDate) {
      setDurationWarning(null);
      return;
    }

    const durationHours =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (durationHours < 0) {
      setDurationWarning('❌ End date must be after start date.');
    } else if (durationHours > 4) {
      const roundedHours = Math.round(durationHours);
      setDurationWarning(
        `⚠️ This event lasts ${roundedHours} hours. Is this correct? Most events are 4 hours or less.`,
      );
    } else {
      setDurationWarning(null);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    // Reset previous errors
    setLogoUploadError(null);

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Logo must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoUploadError('Logo must be JPEG, PNG, or WebP format');
      return;
    }

    // Start upload process
    setLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setLogoPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);

      // Upload to Vercel Blob with progress tracking
      const logoUrl = await uploadImageFile(file, (progress) => {
        setLogoUploadProgress(progress);
      });

      // Set both the file and the URL in the form
      form.setValue('logoFile', file);
      form.setValue('companyLogoUrl', logoUrl);
      form.trigger(['logoFile', 'companyLogoUrl']);
    } catch (error) {
      console.error('Logo upload error:', error);
      setLogoUploadError(
        error instanceof Error ? error.message : 'Failed to upload logo',
      );
      setLogoPreview(null);
      form.resetField('logoFile');
      form.setValue('companyLogoUrl', '');
    } finally {
      setLogoUploading(false);
      setLogoUploadProgress(0);
    }
  };

  const handleLogoClick = () => {
    setModalTargetType('main');
    setModalCohostIndex(null);
    setShowLogoModal(true);
  };

  const handleCohostLogoClick = (cohostIndex: number) => {
    setModalTargetType('cohost');
    setModalCohostIndex(cohostIndex);
    setShowLogoModal(true);
  };

  const handleLogoRemove = () => {
    setLogoPreview(null);
    setLogoUploadError(null);
    setLogoUploadProgress(0);
    form.resetField('logoFile');
    form.setValue('companyLogoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModalFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Logo must be less than 2MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoUploadError('Logo must be JPEG, PNG, or WebP format');
      return;
    }

    // Clear previous errors
    setLogoUploadError(null);
    setContrastCheckResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setModalPreviewUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Store the file
    setModalSelectedFile(file);

    // Check contrast
    setIsCheckingContrast(true);
    try {
      const result = await checkImageContrast(file, [0, 0, 0]); // Black background
      setContrastCheckResult({
        contrastRatio: result.contrastRatio,
        isGoodContrast: result.isGoodContrast,
      });
    } catch (error) {
      console.error('Contrast check error:', error);
      setLogoUploadError('Could not check image contrast. Please try again.');
    } finally {
      setIsCheckingContrast(false);
    }
  };

  const handleModalSubmit = async () => {
    if (!modalSelectedFile || !contrastCheckResult?.isGoodContrast) return;

    if (modalTargetType === 'main') {
      setLogoUploading(true);
      setLogoUploadProgress(0);
    } else if (modalTargetType === 'cohost' && modalCohostIndex !== null) {
      const newUploading = [...cohostLogoUploading];
      const newProgress = [...cohostLogoUploadProgress];
      newUploading[modalCohostIndex] = true;
      newProgress[modalCohostIndex] = 0;
      setCohostLogoUploading(newUploading);
      setCohostLogoUploadProgress(newProgress);
    }

    try {
      // Upload to Vercel Blob with progress tracking
      const logoUrl = await uploadImageFile(modalSelectedFile, (progress) => {
        if (modalTargetType === 'main') {
          setLogoUploadProgress(progress);
        } else if (modalTargetType === 'cohost' && modalCohostIndex !== null) {
          const newProgress = [...cohostLogoUploadProgress];
          newProgress[modalCohostIndex] = progress;
          setCohostLogoUploadProgress(newProgress);
        }
      });

      if (modalTargetType === 'main') {
        // Set form values for main logo
        form.setValue('logoFile', modalSelectedFile);
        form.setValue('companyLogoUrl', logoUrl);
        form.trigger(['logoFile', 'companyLogoUrl']);

        // Set preview for the main form
        setLogoPreview(modalPreviewUrl);
      } else if (modalTargetType === 'cohost' && modalCohostIndex !== null) {
        // Set form values for cohost logo
        const currentCohosts = form.getValues('cohosts') || [];
        if (!currentCohosts[modalCohostIndex]) {
          currentCohosts[modalCohostIndex] = {
            companyName: '',
            companyLogoUrl: '',
            logoFile: new File([], ''),
            primaryContactName: '',
            primaryContactEmail: '',
            primaryContactPhoneNumber: '',
            primaryContactWebsite: '',
            primaryContactLinkedin: '',
          };
        }
        currentCohosts[modalCohostIndex].logoFile = modalSelectedFile;
        currentCohosts[modalCohostIndex].companyLogoUrl = logoUrl;
        form.setValue('cohosts', currentCohosts);
        form.trigger([
          `cohosts.${modalCohostIndex}.logoFile`,
          `cohosts.${modalCohostIndex}.companyLogoUrl`,
        ]);

        // Set preview for the cohost
        const newPreviews = [...cohostLogoPreviews];
        newPreviews[modalCohostIndex] = modalPreviewUrl;
        setCohostLogoPreviews(newPreviews);
      }

      // Close modal and reset modal state
      setShowLogoModal(false);
      resetModalState();
    } catch (error) {
      console.error('Logo upload error:', error);
      setLogoUploadError(
        error instanceof Error ? error.message : 'Failed to upload logo',
      );
    } finally {
      if (modalTargetType === 'main') {
        setLogoUploading(false);
        setLogoUploadProgress(0);
      } else if (modalTargetType === 'cohost' && modalCohostIndex !== null) {
        const newUploading = [...cohostLogoUploading];
        const newProgress = [...cohostLogoUploadProgress];
        newUploading[modalCohostIndex] = false;
        newProgress[modalCohostIndex] = 0;
        setCohostLogoUploading(newUploading);
        setCohostLogoUploadProgress(newProgress);
      }
    }
  };

  const resetModalState = () => {
    setModalPreviewUrl(null);
    setModalSelectedFile(null);
    setContrastCheckResult(null);
    setIsCheckingContrast(false);
    setLogoUploadError(null);
    setModalTargetType('main');
    setModalCohostIndex(null);
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    setShowLogoModal(false);
    resetModalState();
  };

  const handleCohostLogoRemove = (cohostIndex: number) => {
    const newPreviews = [...cohostLogoPreviews];
    const newErrors = [...cohostLogoUploadErrors];
    const newProgress = [...cohostLogoUploadProgress];

    newPreviews[cohostIndex] = null;
    newErrors[cohostIndex] = null;
    newProgress[cohostIndex] = 0;

    setCohostLogoPreviews(newPreviews);
    setCohostLogoUploadErrors(newErrors);
    setCohostLogoUploadProgress(newProgress);

    const currentCohosts = form.getValues('cohosts') || [];
    if (currentCohosts[cohostIndex]) {
      currentCohosts[cohostIndex] = {
        ...currentCohosts[cohostIndex],
        logoFile: new File([], ''),
        companyLogoUrl: '',
      };
      form.setValue('cohosts', currentCohosts);
    }

    const fileInput = cohostFileInputRefs.current[cohostIndex];
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const { form, handleSubmit, serverState, isPending } =
    useFormAction<CreateEventFormData>({
      schema: createEventFormSchema,
      action: createEventAction,
      defaultValues: {
        ...urlDefaults,
        cohosts: initialCohosts,
        themeIds: initialThemeIds.length > 0 ? initialThemeIds : undefined,
        audienceIds:
          initialAudienceIds.length > 0 ? initialAudienceIds : undefined,
      },
    });

  // Trigger validation after form is initialized with URL params
  useEffect(() => {
    // Check if we have any search params (to avoid triggering on empty forms)
    const hasParams = searchParams.size > 0;

    if (hasParams) {
      // Ensure themes and audiences are set in form state
      if (initialThemeIds.length > 0) {
        form.setValue('themeIds', initialThemeIds, { shouldValidate: true });
      }
      if (initialAudienceIds.length > 0) {
        form.setValue('audienceIds', initialAudienceIds, {
          shouldValidate: true,
        });
      }

      // Trigger validation once
      form.trigger();
    }
  }, []); // Empty dependency array - only run once on mount

  return (
    <Card className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_theme(colors.black)]">
      <CardHeader>
        <CardTitle className="font-black font-mono text-3xl text-black uppercase tracking-wider">
          EVENT DETAILS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Author Information */}
            <div className="space-y-6">
              <h3 className="border-4 border-black bg-primary p-3 font-bold font-mono text-black text-xl uppercase tracking-wider">
                ORGANIZER INFORMATION
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        COMPANY NAME *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tech Innovations Inc."
                          disabled={isPending}
                          className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        COMPANY WEBSITE *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://company.com"
                          disabled={isPending}
                          className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                          {...field}
                          onBlur={() => {
                            form.trigger('companyWebsite');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        CONTACT PERSON NAME *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          disabled={isPending}
                          className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        CONTACT EMAIL ADDRESS *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@company.com"
                          disabled={isPending}
                          className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                          {...field}
                          onBlur={() => {
                            form.trigger('authorEmail');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        CONTACT PHONE NUMBER *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+56 9 8765 4321"
                          disabled={isPending}
                          className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                          {...field}
                          onBlur={() => {
                            form.trigger('authorPhoneNumber');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-6">
              <h3 className="border-4 border-black bg-primary p-3 font-bold font-mono text-black text-xl uppercase tracking-wider">
                EVENT DETAILS
              </h3>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      EVENT TITLE *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tech Innovation Summit"
                        disabled={isPending}
                        className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      EVENT DESCRIPTION *
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A short description of your event"
                        disabled={isPending}
                        className="min-h-[120px] resize-none border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                        maxLength={300}
                        {...field}
                      />
                    </FormControl>
                    <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                      {field.value?.length || 0}/300 CHARACTERS
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        START DATE & TIME *
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          date={field.value}
                          onDateChange={(date) => {
                            field.onChange(date);

                            // Auto-set end date on the same day, 2 hours later
                            if (date) {
                              const autoEndDate = new Date(date);
                              autoEndDate.setHours(autoEndDate.getHours() + 2);
                              form.setValue('endDate', autoEndDate, {
                                shouldValidate: true,
                              });
                              checkEventDuration(date, autoEndDate);
                            } else {
                              const endDate = form.getValues('endDate');
                              checkEventDuration(date, endDate);
                            }
                          }}
                          disabled={isPending}
                          placeholder="PICK DATE"
                          minDate={new Date('2025-11-17')}
                          maxDate={new Date('2025-11-24')}
                          defaultMonth={new Date('2025-11-17')}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                        END DATE & TIME *
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          date={field.value}
                          onDateChange={(date) => {
                            field.onChange(date);
                            const startDate = form.getValues('startDate');
                            checkEventDuration(startDate, date);
                          }}
                          disabled={isPending}
                          placeholder="PICK DATE"
                          minDate={new Date('2025-11-17')}
                          maxDate={new Date('2025-11-24')}
                          defaultMonth={new Date('2025-11-17')}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {durationWarning && (
                <div className="border-4 border-orange-500 bg-orange-50 p-3">
                  <p className="font-bold font-mono text-orange-600 text-sm uppercase tracking-wider">
                    {durationWarning}
                  </p>
                </div>
              )}

              {/* Event Calendar */}
              <div className="space-y-4">
                <h4 className="font-bold font-mono text-black text-lg uppercase tracking-wider">
                  CURRENT EVENT SCHEDULE
                </h4>
                <EventCalendar eventCounts={eventCounts} />
              </div>

              <FormField
                control={form.control}
                name="commune"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      COMMUNE *
                    </FormLabel>
                    <FormControl>
                      <CommuneSelector
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      EVENT FORMAT *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary">
                          <SelectValue placeholder="SELECT EVENT FORMAT" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-4 border-black bg-white">
                        {eventFormats.map((format) => (
                          <SelectItem
                            key={format}
                            value={format}
                            className="font-bold font-mono text-black uppercase tracking-wider hover:bg-primary hover:text-black focus:bg-primary focus:text-black"
                          >
                            {eventFormatLabels[format]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      EVENT CAPACITY *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        disabled={isPending}
                        className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onBlur={() => {
                          form.trigger('capacity');
                        }}
                      />
                    </FormControl>
                    <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                      APPROXIMATE NUMBER OF ATTENDEES
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      COMPANY LOGO *
                    </FormLabel>
                    <div className="space-y-4">
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleLogoUpload(file);
                          }
                        }}
                        disabled={isPending || logoUploading}
                      />

                      {/* Upload area or preview */}
                      {logoPreview ? (
                        <div className="relative border-4 border-black bg-white p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden border-2 border-gray-300 bg-gray-50">
                              <div
                                style={{
                                  backgroundImage: `url(${logoPreview})`,
                                }}
                                className="h-full w-full bg-center bg-contain bg-no-repeat"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                                LOGO UPLOADED
                              </p>
                              <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                                {field.value?.name || 'Logo file'}
                              </p>
                              <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                                {field.value?.size
                                  ? `${Math.round(field.value.size / 1024)}KB`
                                  : ''}
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={handleLogoRemove}
                              disabled={isPending || logoUploading}
                              className="h-8 w-8 border-2 border-red-500 bg-red-500 p-0 text-white hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            onClick={handleLogoClick}
                            disabled={isPending || logoUploading}
                            className="hover:-translate-y-1 transform border-4 border-black bg-primary px-6 py-3 font-bold font-mono text-black text-sm uppercase tracking-wider transition-all duration-200 hover:shadow-[4px_4px_0px_0px_theme(colors.black)] disabled:opacity-50"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {logoUploading
                              ? `UPLOADING... ${Math.round(logoUploadProgress)}%`
                              : 'UPLOAD LOGO'}
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                    {logoUploadError && (
                      <div className="mt-2 border-4 border-red-500 bg-red-50 p-3">
                        <p className="font-bold font-mono text-red-600 text-sm uppercase tracking-wider">
                          {logoUploadError}
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Event Themes */}
              <FormField
                control={form.control}
                name="themeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      EVENT THEMES *
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const newThemes = field.value || [];
                        if (!newThemes.includes(value)) {
                          const updatedThemes = [...newThemes, value];
                          field.onChange(updatedThemes);
                          setSelectedThemes(updatedThemes);
                        }
                      }}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary">
                          <SelectValue placeholder="SELECT A THEME" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-4 border-black bg-white">
                        {themes
                          .filter((theme) => !selectedThemes.includes(theme.id))
                          .map((theme) => (
                            <SelectItem
                              key={theme.id}
                              value={theme.id}
                              className="font-bold font-mono text-black uppercase tracking-wider hover:bg-primary hover:text-black focus:bg-primary focus:text-black"
                            >
                              {theme.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedThemes.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                          SELECTED THEMES:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedThemes.map((themeId) => {
                            const theme = themes.find((t) => t.id === themeId);
                            if (!theme) return null;
                            return (
                              <div
                                key={themeId}
                                className="flex items-center gap-2 border-2 border-black bg-primary px-3 py-1"
                              >
                                <span className="font-bold font-mono text-black text-xs uppercase tracking-wider">
                                  {theme.name}
                                </span>
                                <Button
                                  type="button"
                                  onClick={() => removeTheme(themeId)}
                                  disabled={isPending}
                                  className="h-4 w-4 border-none bg-transparent p-0 text-black hover:bg-transparent"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Event Audiences */}
              <FormField
                control={form.control}
                name="audienceIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      TARGET AUDIENCES *
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const newAudiences = field.value || [];
                        if (!newAudiences.includes(value)) {
                          const updatedAudiences = [...newAudiences, value];
                          field.onChange(updatedAudiences);
                          setSelectedAudiences(updatedAudiences);
                        }
                      }}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary">
                          <SelectValue placeholder="SELECT A TARGET AUDIENCE" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-4 border-black bg-white">
                        {audiences
                          .filter(
                            (audience) =>
                              !selectedAudiences.includes(audience.id),
                          )
                          .map((audience) => (
                            <SelectItem
                              key={audience.id}
                              value={audience.id}
                              className="font-bold font-mono text-black uppercase tracking-wider hover:bg-primary hover:text-black focus:bg-primary focus:text-black"
                            >
                              {audience.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedAudiences.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                          SELECTED AUDIENCES:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedAudiences.map((audienceId) => {
                            const audience = audiences.find(
                              (a) => a.id === audienceId,
                            );
                            if (!audience) return null;
                            return (
                              <div
                                key={audienceId}
                                className="flex items-center gap-2 border-2 border-black bg-primary px-3 py-1"
                              >
                                <span className="font-bold font-mono text-black text-xs uppercase tracking-wider">
                                  {audience.name}
                                </span>
                                <Button
                                  type="button"
                                  onClick={() => removeAudience(audienceId)}
                                  disabled={isPending}
                                  className="h-4 w-4 border-none bg-transparent p-0 text-black hover:bg-transparent"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Co-hosts Section */}
            <div className="space-y-6">
              <h3 className="border-4 border-black bg-primary p-3 font-bold font-mono text-black text-xl uppercase tracking-wider">
                CO-HOSTS (OPTIONAL)
              </h3>
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={addCohost}
                  disabled={cohosts.length >= 3 || isPending}
                  className="hover:-translate-y-1 transform border-4 border-black bg-white px-4 py-2 font-bold font-mono text-black text-sm uppercase tracking-wider transition-all duration-200 hover:shadow-[4px_4px_0px_0px_theme(colors.primary)] disabled:opacity-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  ADD CO-HOST ({cohosts.length}/3)
                </Button>
              </div>

              {cohosts.map((cohostId, index) => (
                <div
                  key={cohostId}
                  className="relative border-4 border-gray-400 bg-gray-50 p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="font-bold font-mono text-black text-lg uppercase tracking-wider">
                      CO-HOST #{index + 1}
                    </h4>
                    <Button
                      type="button"
                      onClick={() => removeCohost(index)}
                      disabled={isPending}
                      className="hover:-translate-y-1 transform border-2 border-red-500 bg-red-500 px-2 py-1 font-bold font-mono text-white text-xs uppercase tracking-wider transition-all duration-200 hover:shadow-[2px_2px_0px_0px_theme(colors.red.600)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Company Name and Logo Section */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.companyName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              COMPANY NAME *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Company Name"
                                disabled={isPending}
                                className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Cohost Logo Upload */}
                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.logoFile`}
                        render={() => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              COMPANY LOGO *
                            </FormLabel>
                            <div className="space-y-4">
                              {/* Upload area or preview */}
                              {cohostLogoPreviews[index] ? (
                                <div className="relative border-4 border-black bg-white p-4">
                                  <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden border-2 border-gray-300 bg-gray-50">
                                      <div
                                        style={{
                                          backgroundImage: `url(${cohostLogoPreviews[index]})`,
                                        }}
                                        className="h-full w-full bg-center bg-contain bg-no-repeat"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-bold font-mono text-black text-sm uppercase tracking-wider">
                                        LOGO UPLOADED
                                      </p>
                                      <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                                        Logo file
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      onClick={() =>
                                        handleCohostLogoRemove(index)
                                      }
                                      disabled={
                                        isPending ||
                                        cohostLogoUploading[index] ||
                                        false
                                      }
                                      className="h-8 w-8 border-2 border-red-500 bg-red-500 p-0 text-white hover:bg-red-600"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <Button
                                    type="button"
                                    onClick={() => handleCohostLogoClick(index)}
                                    disabled={
                                      isPending ||
                                      cohostLogoUploading[index] ||
                                      false
                                    }
                                    className="hover:-translate-y-1 transform border-4 border-black bg-white px-4 py-2 font-bold font-mono text-black text-sm uppercase tracking-wider transition-all duration-200 hover:shadow-[4px_4px_0px_0px_theme(colors.black)] disabled:opacity-50"
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {cohostLogoUploading[index]
                                      ? `UPLOADING... ${Math.round(cohostLogoUploadProgress[index] || 0)}%`
                                      : 'UPLOAD LOGO'}
                                  </Button>
                                </div>
                              )}
                            </div>
                            <FormMessage />
                            {cohostLogoUploadErrors[index] && (
                              <div className="mt-2 border-4 border-red-500 bg-red-50 p-3">
                                <p className="font-bold font-mono text-red-600 text-sm uppercase tracking-wider">
                                  {cohostLogoUploadErrors[index]}
                                </p>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Contact Information Section */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.primaryContactName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              CONTACT NAME *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                disabled={isPending}
                                className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                                {...field}
                              />
                            </FormControl>
                            <p className="invisible font-mono text-gray-600 text-xs uppercase tracking-wider">
                              PLACEHOLDER
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.primaryContactEmail`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              CONTACT EMAIL *
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="contact@company.com"
                                disabled={isPending}
                                className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                                {...field}
                                onBlur={() => {
                                  form.trigger(
                                    `cohosts.${index}.primaryContactEmail`,
                                  );
                                }}
                              />
                            </FormControl>
                            <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                              LUMA EDITOR INVITE WILL BE SENT TO THIS EMAIL
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.primaryContactPhoneNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              CONTACT PHONE (OPTIONAL)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+56 9 8765 4321"
                                disabled={isPending}
                                className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                                {...field}
                                onBlur={() => {
                                  form.trigger(
                                    `cohosts.${index}.primaryContactPhoneNumber`,
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.primaryContactWebsite`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              WEBSITE (OPTIONAL)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="url"
                                placeholder="https://company.com"
                                disabled={isPending}
                                className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                                {...field}
                                onBlur={() => {
                                  form.trigger(
                                    `cohosts.${index}.primaryContactWebsite`,
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`cohosts.${index}.primaryContactLinkedin`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                              LINKEDIN (OPTIONAL)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="url"
                                placeholder="https://linkedin.com/in/username"
                                disabled={isPending}
                                className="border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider focus:border-primary"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Global Error */}
            {serverState.globalError && (
              <div className="border-4 border-red-500 bg-red-50 p-4">
                <p className="font-bold font-mono text-red-600 text-sm uppercase tracking-wider">
                  {serverState.globalError}
                </p>
              </div>
            )}

            {/* Success Message */}
            {serverState.success && serverState.message && (
              <div className="border-4 border-green-500 bg-green-50 p-4">
                <p className="font-bold font-mono text-green-600 text-sm uppercase tracking-wider">
                  {serverState.message}
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-6">
              <Button
                type="submit"
                disabled={isPending || !form.formState.isValid}
                className="hover:-translate-y-1 transform border-4 border-black bg-primary px-8 py-6 font-bold font-mono text-black text-lg uppercase tracking-wider transition-all duration-200 hover:shadow-[8px_8px_0px_0px_theme(colors.black)] disabled:opacity-50"
              >
                {isPending ? 'SUBMITTING...' : 'SUBMIT EVENT'}
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href="/events"
                  className="hover:-translate-y-1 transform border-4 border-black bg-white px-8 py-6 font-bold font-mono text-black text-lg uppercase tracking-wider transition-all duration-200 hover:shadow-[8px_8px_0px_0px_theme(colors.black)]"
                >
                  CANCEL
                </Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Logo Upload Modal */}
      <Dialog open={showLogoModal} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-2xl border-4 border-white bg-black">
          <DialogHeader>
            <DialogTitle className="font-bold font-mono text-white text-xl uppercase tracking-wider">
              UPLOAD COMPANY LOGO
            </DialogTitle>
            <DialogDescription className="font-mono text-gray-300 text-sm uppercase tracking-wider">
              Upload your logo and check contrast against black background
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Hidden file input */}
            <input
              ref={modalFileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleModalFileSelect(file);
                }
              }}
            />

            {/* Upload area */}
            <div className="flex flex-col items-center gap-4">
              {modalPreviewUrl ? (
                <div className="relative w-full max-w-md">
                  <div
                    className="flex h-48 w-full items-center justify-center border-2 border-white bg-black"
                    style={{
                      backgroundImage: `url(${modalPreviewUrl})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="mt-2 w-full border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200"
                  >
                    CHANGE PHOTO
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="h-48 w-full max-w-md border-2 border-white border-dashed bg-transparent text-white hover:bg-gray-900"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-white" />
                    <p className="font-bold font-mono text-lg text-white uppercase tracking-wider">
                      CLICK TO UPLOAD
                    </p>
                    <p className="font-mono text-gray-300 text-xs uppercase tracking-wider">
                      JPEG, PNG, WEBP • MAX 2MB
                    </p>
                  </div>
                </Button>
              )}
            </div>

            {/* Contrast Check Result */}
            {isCheckingContrast && (
              <div className="rounded border-2 border-yellow-400 bg-yellow-900/20 p-4">
                <p className="font-bold font-mono text-sm text-yellow-400 uppercase tracking-wider">
                  CHECKING CONTRAST...
                </p>
              </div>
            )}

            {contrastCheckResult && (
              <div
                className={`rounded border-2 p-4 ${
                  contrastCheckResult.isGoodContrast
                    ? 'border-green-400 bg-green-900/20'
                    : 'border-red-400 bg-red-900/20'
                }`}
              >
                <p
                  className={`font-bold font-mono text-sm uppercase tracking-wider ${
                    contrastCheckResult.isGoodContrast
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {contrastCheckResult.isGoodContrast
                    ? `✓ GOOD CONTRAST (${contrastCheckResult.contrastRatio.toFixed(1)}:1)`
                    : `✗ LOW CONTRAST (${contrastCheckResult.contrastRatio.toFixed(1)}:1)`}
                </p>
                {!contrastCheckResult.isGoodContrast && (
                  <p className="mt-2 font-mono text-red-300 text-xs uppercase tracking-wider">
                    CONTRAST TOO LOW. PLEASE USE A CLEARER PICTURE WITH LIGHTER
                    COLORS.
                  </p>
                )}
              </div>
            )}

            {/* Upload Error */}
            {logoUploadError && (
              <div className="rounded border-2 border-red-400 bg-red-900/20 p-4">
                <p className="font-bold font-mono text-red-400 text-sm uppercase tracking-wider">
                  {logoUploadError}
                </p>
              </div>
            )}

            {/* Upload Progress */}
            {(logoUploading ||
              (modalTargetType === 'cohost' &&
                modalCohostIndex !== null &&
                cohostLogoUploading[modalCohostIndex])) && (
              <div className="rounded border-2 border-blue-400 bg-blue-900/20 p-4">
                <p className="font-bold font-mono text-blue-400 text-sm uppercase tracking-wider">
                  UPLOADING...{' '}
                  {Math.round(
                    modalTargetType === 'main'
                      ? logoUploadProgress
                      : modalCohostIndex !== null
                        ? cohostLogoUploadProgress[modalCohostIndex] || 0
                        : 0,
                  )}
                  %
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-400 transition-all duration-300"
                    style={{
                      width: `${
                        modalTargetType === 'main'
                          ? logoUploadProgress
                          : modalCohostIndex !== null
                            ? cohostLogoUploadProgress[modalCohostIndex] || 0
                            : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={handleModalClose}
              disabled={
                logoUploading ||
                (modalTargetType === 'cohost' &&
                  modalCohostIndex !== null &&
                  cohostLogoUploading[modalCohostIndex])
              }
              className="border-2 border-white bg-transparent font-bold font-mono text-white uppercase tracking-wider hover:bg-gray-800"
            >
              CANCEL
            </Button>
            <Button
              type="button"
              onClick={handleModalSubmit}
              disabled={
                !modalSelectedFile ||
                !contrastCheckResult?.isGoodContrast ||
                logoUploading ||
                (modalTargetType === 'cohost' &&
                  modalCohostIndex !== null &&
                  cohostLogoUploading[modalCohostIndex]) ||
                isCheckingContrast
              }
              className="border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200 disabled:opacity-50"
            >
              {logoUploading ||
              (modalTargetType === 'cohost' &&
                modalCohostIndex !== null &&
                cohostLogoUploading[modalCohostIndex])
                ? 'UPLOADING...'
                : 'SUBMIT'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
