'use client';

import { Check, ChevronsUpDown, Plus, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/src/components/ui/command';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { useFormAction } from '@/src/hooks/use-form-action';
import { SANTIAGO_COMMUNES } from '@/src/lib/constants/communes';
import type { EventTheme } from '@/src/lib/db/schema';
import { eventFormats } from '@/src/lib/db/schema';
import {
  type CreateEventFormData,
  createEventFormSchema,
  eventFormatLabels,
} from '@/src/lib/schemas/events.schema';
import { cn } from '@/src/lib/utils';
import { uploadImageFile } from '@/src/lib/utils/blob';
import { checkImageContrast } from '@/src/lib/utils/contrast';
import { createEventAction } from '../_actions/create-event.action';

interface CreateEventFormProps {
  themes: EventTheme[];
}

export function CreateEventForm({ themes }: CreateEventFormProps) {
  const [cohosts, setCohosts] = useState<number[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [communeOpen, setCommuneOpen] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const addCohost = () => {
    if (cohosts.length < 3) {
      setCohosts([...cohosts, cohosts.length]);
    }
  };

  const removeCohost = (index: number) => {
    const newCohosts = cohosts.filter((_, i) => i !== index);
    setCohosts(newCohosts);

    // Remove the cohost data from form
    const currentCohosts = form.getValues('cohosts') || [];
    currentCohosts.splice(index, 1);
    form.setValue('cohosts', currentCohosts);
  };

  const removeTheme = (themeId: string) => {
    const newSelectedThemes = selectedThemes.filter((id) => id !== themeId);
    setSelectedThemes(newSelectedThemes);
    form.setValue('themeIds', newSelectedThemes);
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

    if (durationHours > 4) {
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

    setLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      // Upload to Vercel Blob with progress tracking
      const logoUrl = await uploadImageFile(modalSelectedFile, (progress) => {
        setLogoUploadProgress(progress);
      });

      // Set form values
      form.setValue('logoFile', modalSelectedFile);
      form.setValue('companyLogoUrl', logoUrl);
      form.trigger(['logoFile', 'companyLogoUrl']);

      // Set preview for the main form
      setLogoPreview(modalPreviewUrl);

      // Close modal and reset modal state
      setShowLogoModal(false);
      resetModalState();
    } catch (error) {
      console.error('Logo upload error:', error);
      setLogoUploadError(
        error instanceof Error ? error.message : 'Failed to upload logo',
      );
    } finally {
      setLogoUploading(false);
      setLogoUploadProgress(0);
    }
  };

  const resetModalState = () => {
    setModalPreviewUrl(null);
    setModalSelectedFile(null);
    setContrastCheckResult(null);
    setIsCheckingContrast(false);
    setLogoUploadError(null);
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
  };

  const handleModalClose = () => {
    setShowLogoModal(false);
    resetModalState();
  };

  const { form, handleSubmit, serverState, isPending } =
    useFormAction<CreateEventFormData>({
      schema: createEventFormSchema,
      action: createEventAction,
      defaultValues: {
        authorEmail: '',
        authorName: '',
        companyName: '',
        companyWebsite: '',
        authorPhoneNumber: '',
        title: '',
        description: '',
        startDate: undefined,
        endDate: undefined,
        commune: '',
        format: undefined,
        capacity: undefined,
        lumaLink: '',
        companyLogoUrl: '',
        cohosts: [],
        themeIds: undefined,
      },
    });

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
                        maxLength={100}
                        {...field}
                      />
                    </FormControl>
                    <p className="font-mono text-gray-600 text-xs uppercase tracking-wider">
                      {field.value?.length || 0}/100 CHARACTERS
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
                              form.setValue('endDate', autoEndDate);
                              checkEventDuration(date, autoEndDate);
                            } else {
                              const endDate = form.getValues('endDate');
                              checkEventDuration(date, endDate);
                            }
                          }}
                          disabled={isPending}
                          placeholder="SELECT START DATE & TIME"
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
                          placeholder="SELECT END DATE & TIME"
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

              <FormField
                control={form.control}
                name="commune"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="font-bold font-mono text-black uppercase tracking-wider">
                      COMMUNE *
                    </FormLabel>
                    <Popover open={communeOpen} onOpenChange={setCommuneOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={communeOpen}
                            disabled={isPending}
                            className={cn(
                              'h-10 w-full justify-between border-4 border-black bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-50 focus:border-primary',
                              !field.value && 'text-gray-500',
                            )}
                          >
                            {field.value
                              ? SANTIAGO_COMMUNES.find(
                                  (commune) => commune === field.value,
                                )
                              : 'SELECT COMMUNE'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] border-4 border-black bg-white p-0 shadow-[8px_8px_0px_0px_theme(colors.black)]"
                        align="start"
                        side="bottom"
                        sideOffset={12}
                        alignOffset={0}
                        avoidCollisions={true}
                        collisionPadding={16}
                      >
                        <Command className="border-none">
                          <CommandInput
                            placeholder="SEARCH COMMUNE..."
                            className="h-9 font-bold font-mono text-black uppercase tracking-wider"
                          />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty className="py-6 text-center font-bold font-mono text-black text-sm uppercase tracking-wider">
                              NO COMMUNE FOUND.
                            </CommandEmpty>
                            <CommandGroup>
                              {SANTIAGO_COMMUNES.map((commune) => (
                                <CommandItem
                                  key={commune}
                                  value={commune}
                                  onSelect={(currentValue) => {
                                    field.onChange(
                                      currentValue === field.value
                                        ? ''
                                        : currentValue,
                                    );
                                    setCommuneOpen(false);
                                  }}
                                  className="py-2 font-bold font-mono text-black uppercase tracking-wider hover:bg-primary hover:text-black focus:bg-primary focus:text-black data-[selected=true]:bg-primary data-[selected=true]:text-black"
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === commune
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )}
                                  />
                                  {commune}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
            {logoUploading && (
              <div className="rounded border-2 border-blue-400 bg-blue-900/20 p-4">
                <p className="font-bold font-mono text-blue-400 text-sm uppercase tracking-wider">
                  UPLOADING... {Math.round(logoUploadProgress)}%
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${logoUploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={handleModalClose}
              disabled={logoUploading}
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
                isCheckingContrast
              }
              className="border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200 disabled:opacity-50"
            >
              {logoUploading ? 'UPLOADING...' : 'SUBMIT'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
