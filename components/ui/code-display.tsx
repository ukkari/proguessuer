import React, { useState } from 'react';
import { ScrollArea } from './scroll-area';
import { Button } from './button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { cn } from '@/lib/utils';

interface CodeDisplayProps {
  code: string;
  height?: string;
  title?: string;
  className?: string;
  path?: string;
}

export function CodeDisplay({ code, height = '200px', title = 'Code', className, path }: CodeDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Create a dialog for the expanded view
  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-2 right-2 z-10">
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 rounded-full bg-muted/80 backdrop-blur-sm"
              aria-label="Expand code view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[80vh] rounded-md border p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {code}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollArea className={`${height} rounded-md border p-4`}>
        <pre className="text-sm font-mono whitespace-pre-wrap">
          {code}
        </pre>
      </ScrollArea>
    </div>
  );
} 