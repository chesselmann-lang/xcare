"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps extends Omit<ButtonProps, "type"> {
  loadingText?: string;
}

/**
 * A submit button that automatically shows a spinner and disables itself
 * while a React Server Action (useFormStatus) is pending.
 *
 * Usage inside a <form action={serverAction}>:
 *   <SubmitButton>Speichern</SubmitButton>
 *   <SubmitButton loadingText="Wird gespeichert…">Speichern</SubmitButton>
 *
 * For react-hook-form forms using handleSubmit(), use the `disabled` + `children`
 * pattern manually or pass `disabled={isSubmitting}` to the regular <Button />.
 */
export function SubmitButton({
  children,
  loadingText,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      className={className}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
