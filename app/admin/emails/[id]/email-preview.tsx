'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';

interface EmailPreviewProps {
  htmlContent: string;
}

// Simple HTML formatter that adds basic indentation
function formatHtml(html: string): string {
  let formatted = '';
  let indent = 0;
  const indentSize = 2;

  // Split by tags and handle each part
  const parts = html.split(/(<[^>]*>)/);

  for (const part of parts) {
    if (part.trim() === '') continue;

    if (part.startsWith('<')) {
      // This is a tag
      const isClosing = part.startsWith('</');
      const isSelfClosing =
        part.endsWith('/>') ||
        ['<br>', '<hr>', '<img', '<input', '<meta', '<link'].some((tag) =>
          part.toLowerCase().startsWith(tag),
        );

      if (isClosing) {
        indent = Math.max(0, indent - indentSize);
      }

      formatted += `${' '.repeat(indent) + part}\n`;

      if (!isClosing && !isSelfClosing) {
        indent += indentSize;
      }
    } else {
      // This is text content
      const trimmed = part.trim();
      if (trimmed) {
        formatted += `${' '.repeat(indent) + trimmed}\n`;
      }
    }
  }

  return formatted.trim();
}

export function EmailPreview({ htmlContent }: EmailPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');

  const formattedHtml = useMemo(() => {
    try {
      return formatHtml(htmlContent);
    } catch {
      return htmlContent; // Fall back to original if formatting fails
    }
  }, [htmlContent]);

  return (
    <Card className="border-2 border-white bg-black shadow-[4px_4px_0px_0px_#ffffff]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-black font-mono text-white uppercase tracking-wide">
          Email Preview
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className={
              viewMode === 'preview'
                ? 'border-2 border-primary bg-primary font-bold font-mono text-primary-foreground text-xs uppercase tracking-wide'
                : 'border-2 border-white bg-black font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black'
            }
          >
            Preview
          </Button>
          <Button
            variant={viewMode === 'source' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('source')}
            className={
              viewMode === 'source'
                ? 'border-2 border-primary bg-primary font-bold font-mono text-primary-foreground text-xs uppercase tracking-wide'
                : 'border-2 border-white bg-black font-bold font-mono text-white text-xs uppercase tracking-wide hover:bg-white hover:text-black'
            }
          >
            Source
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'preview' ? (
          <div className="overflow-hidden border-2 border-white">
            <iframe
              srcDoc={htmlContent}
              className="h-[600px] w-full border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="overflow-hidden border-2 border-white">
            <pre className="h-[600px] overflow-auto bg-black p-4 font-mono text-sm text-white">
              <code>{formattedHtml}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
