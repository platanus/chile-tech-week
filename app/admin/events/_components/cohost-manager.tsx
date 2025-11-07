'use client';

import { Plus, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
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
import { useFormAction } from '@/src/hooks/use-form-action';
import type { Event, EventCohost } from '@/src/lib/db/schema';
import {
  type AddCohostFormData,
  addCohostFormSchema,
} from '@/src/lib/schemas/events.schema';
import { uploadImageFile } from '@/src/lib/utils/blob';
import { checkImageContrast } from '@/src/lib/utils/contrast';
import {
  addCohostAction,
  removeCohostAction,
} from '../_actions/manage-cohosts.action';
import { LogoEditButton } from './logo-edit-button';
import { LogoVisibilityToggle } from './logo-visibility-toggle';

interface CohostManagerProps {
  eventId: string;
  eventState: Event['state'];
  cohosts: EventCohost[];
}

export function CohostManager({
  eventId,
  eventState,
  cohosts,
}: CohostManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [modalPreviewUrl, setModalPreviewUrl] = useState<string | null>(null);
  const [modalSelectedFile, setModalSelectedFile] = useState<File | null>(null);
  const [contrastCheckResult, setContrastCheckResult] = useState<{
    contrastRatio: number;
    isGoodContrast: boolean;
  } | null>(null);
  const [isCheckingContrast, setIsCheckingContrast] = useState(false);
  const [removingCohostId, setRemovingCohostId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const {
    form,
    handleSubmit,
    serverState,
    isPending: isSubmitting,
  } = useFormAction<AddCohostFormData>({
    schema: addCohostFormSchema,
    action: addCohostAction,
    defaultValues: {
      eventId,
      companyName: '',
      companyLogoUrl: '',
      logoFile: new File([], ''),
      primaryContactName: '',
      primaryContactEmail: '',
      primaryContactPhoneNumber: '',
      primaryContactWebsite: '',
      primaryContactLinkedin: '',
    },
    onSuccess: () => {
      setShowAddDialog(false);
      resetModalState();
      form.reset();
    },
  });

  const handleModalFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('Logo must be less than 2MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setLogoUploadError('Logo must be JPEG, PNG, or WebP format');
      return;
    }

    setLogoUploadError(null);
    setContrastCheckResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setModalPreviewUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setModalSelectedFile(file);

    setIsCheckingContrast(true);
    try {
      const result = await checkImageContrast(file, [0, 0, 0]);
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

  const handleLogoUpload = async () => {
    if (!modalSelectedFile || !contrastCheckResult?.isGoodContrast) return;

    setLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      const logoUrl = await uploadImageFile(modalSelectedFile, (progress) => {
        setLogoUploadProgress(progress);
      });

      form.setValue('logoFile', modalSelectedFile);
      form.setValue('companyLogoUrl', logoUrl);
      form.trigger(['logoFile', 'companyLogoUrl']);

      setLogoPreview(modalPreviewUrl);
      setModalPreviewUrl(null);
      setModalSelectedFile(null);
      setContrastCheckResult(null);
      setIsCheckingContrast(false);
      setLogoUploadError(null);
      if (modalFileInputRef.current) {
        modalFileInputRef.current.value = '';
      }
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
    setLogoPreview(null);
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = '';
    }
  };

  const handleRemoveCohost = async (cohostId: string) => {
    if (!confirm('Are you sure you want to remove this co-host?')) return;

    setRemovingCohostId(cohostId);
    startTransition(async () => {
      const result = await removeCohostAction(cohostId, eventId);
      if (!result.success) {
        alert(result.error || 'Failed to remove co-host');
      }
      setRemovingCohostId(null);
    });
  };

  return (
    <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold font-mono text-white uppercase tracking-wide">
            Co-hosts ({cohosts.length})
          </CardTitle>
          <Button
            onClick={() => setShowAddDialog(true)}
            disabled={isPending}
            className="hover:-translate-y-1 transform border-2 border-primary bg-primary px-4 py-2 font-bold font-mono text-black text-sm uppercase tracking-wide transition-all duration-200 hover:shadow-[4px_4px_0px_0px_theme(colors.primary)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Co-host
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cohosts.length === 0 ? (
          <p className="text-center font-mono text-sm text-white/60 uppercase tracking-wide">
            No co-hosts yet
          </p>
        ) : (
          <div className="space-y-4">
            {cohosts.map((cohost) => (
              <div
                key={cohost.id}
                className="relative border-2 border-white/20 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {cohost.companyLogoUrl && (
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden border-2 border-white bg-black">
                        <div
                          style={{
                            backgroundImage: `url(${cohost.companyLogoUrl})`,
                          }}
                          className="h-full w-full bg-center bg-contain bg-no-repeat"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-bold font-mono text-white uppercase tracking-wide">
                        {cohost.companyName}
                      </p>
                      <p className="font-mono text-sm text-white/60">
                        {cohost.primaryContactName}
                      </p>
                      <p className="font-mono text-white/60 text-xs">
                        {cohost.primaryContactEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cohost.companyLogoUrl && (
                      <>
                        <LogoEditButton id={cohost.id} type="cohost" />
                        {eventState === 'published' && (
                          <LogoVisibilityToggle
                            id={cohost.id}
                            isShown={!!cohost.logoShownAt}
                            type="cohost"
                          />
                        )}
                      </>
                    )}
                    <Button
                      onClick={() => handleRemoveCohost(cohost.id)}
                      disabled={isPending || removingCohostId === cohost.id}
                      className="hover:-translate-y-1 transform border-2 border-red-500 bg-red-500 px-2 py-1 font-bold font-mono text-white text-xs uppercase tracking-wide transition-all duration-200 hover:shadow-[2px_2px_0px_0px_theme(colors.red.600)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl border-4 border-white bg-black">
          <DialogHeader>
            <DialogTitle className="font-bold font-mono text-white text-xl uppercase tracking-wider">
              Add Co-host
            </DialogTitle>
            <DialogDescription className="font-mono text-gray-300 text-sm uppercase tracking-wider">
              Add a new co-host to this event
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        Company Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Company Name"
                          disabled={isSubmitting}
                          className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wider focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoFile"
                  render={() => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        Company Logo *
                      </FormLabel>
                      <div className="space-y-4">
                        {logoPreview ? (
                          <div className="relative border-2 border-white bg-black p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-16 w-16 items-center justify-center overflow-hidden border-2 border-gray-300 bg-black">
                                <div
                                  style={{
                                    backgroundImage: `url(${logoPreview})`,
                                  }}
                                  className="h-full w-full bg-center bg-contain bg-no-repeat"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold font-mono text-sm text-white uppercase tracking-wider">
                                  Logo Uploaded
                                </p>
                              </div>
                              <Button
                                type="button"
                                onClick={() => {
                                  setLogoPreview(null);
                                  form.resetField('logoFile');
                                  form.setValue('companyLogoUrl', '');
                                }}
                                disabled={isSubmitting}
                                className="h-8 w-8 border-2 border-red-500 bg-red-500 p-0 text-white hover:bg-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
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
                            <Button
                              type="button"
                              onClick={() => modalFileInputRef.current?.click()}
                              disabled={isSubmitting || logoUploading}
                              className="w-full border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200"
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {logoUploading
                                ? `Uploading... ${Math.round(logoUploadProgress)}%`
                                : 'Upload Logo'}
                            </Button>
                          </>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="primaryContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        Contact Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          disabled={isSubmitting}
                          className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wider focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        Contact Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contact@company.com"
                          disabled={isSubmitting}
                          className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wider focus:border-primary"
                          {...field}
                          onBlur={() => {
                            form.trigger('primaryContactEmail');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        Contact Phone (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+56 9 8765 4321"
                          disabled={isSubmitting}
                          className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wider focus:border-primary"
                          {...field}
                          onBlur={() => {
                            form.trigger('primaryContactPhoneNumber');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        Website (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://company.com"
                          disabled={isSubmitting}
                          className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wider focus:border-primary"
                          {...field}
                          onBlur={() => {
                            form.trigger('primaryContactWebsite');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryContactLinkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono text-white uppercase tracking-wider">
                        LinkedIn (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://linkedin.com/in/username"
                          disabled={isSubmitting}
                          className="border-2 border-white bg-black font-bold font-mono text-white uppercase tracking-wider focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {modalPreviewUrl && (
                <div className="space-y-4">
                  <div className="relative w-full">
                    <div
                      className="flex h-48 w-full items-center justify-center border-2 border-white bg-black"
                      style={{
                        backgroundImage: `url(${modalPreviewUrl})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  </div>

                  {isCheckingContrast && (
                    <div className="rounded border-2 border-yellow-400 bg-yellow-900/20 p-4">
                      <p className="font-bold font-mono text-sm text-yellow-400 uppercase tracking-wider">
                        Checking Contrast...
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
                          ? `✓ Good Contrast (${contrastCheckResult.contrastRatio.toFixed(1)}:1)`
                          : `✗ Low Contrast (${contrastCheckResult.contrastRatio.toFixed(1)}:1)`}
                      </p>
                      {!contrastCheckResult.isGoodContrast && (
                        <p className="mt-2 font-mono text-red-300 text-xs uppercase tracking-wider">
                          Contrast too low. Please use a clearer picture with
                          lighter colors.
                        </p>
                      )}
                    </div>
                  )}

                  {contrastCheckResult?.isGoodContrast && !logoPreview && (
                    <Button
                      type="button"
                      onClick={handleLogoUpload}
                      disabled={logoUploading}
                      className="w-full border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200"
                    >
                      {logoUploading
                        ? `Uploading... ${Math.round(logoUploadProgress)}%`
                        : 'Confirm & Upload Logo'}
                    </Button>
                  )}
                </div>
              )}

              {logoUploadError && (
                <div className="rounded border-2 border-red-400 bg-red-900/20 p-4">
                  <p className="font-bold font-mono text-red-400 text-sm uppercase tracking-wider">
                    {logoUploadError}
                  </p>
                </div>
              )}

              {serverState.globalError && (
                <div className="rounded border-2 border-red-400 bg-red-900/20 p-4">
                  <p className="font-bold font-mono text-red-400 text-sm uppercase tracking-wider">
                    {serverState.globalError}
                  </p>
                </div>
              )}

              {serverState.success && serverState.message && (
                <div className="rounded border-2 border-green-400 bg-green-900/20 p-4">
                  <p className="font-bold font-mono text-green-400 text-sm uppercase tracking-wider">
                    {serverState.message}
                  </p>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    resetModalState();
                  }}
                  disabled={isSubmitting}
                  className="border-2 border-white bg-transparent font-bold font-mono text-white uppercase tracking-wider hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isValid}
                  className="border-2 border-white bg-white font-bold font-mono text-black uppercase tracking-wider hover:bg-gray-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Co-host'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
